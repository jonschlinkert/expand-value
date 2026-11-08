import assert from 'node:assert/strict';
import inspector from 'node:inspector';
import perfHooks from 'node:perf_hooks';
import { expand } from '~/expand';

describe('sync performance', () => {
  describe('execution time scaling', () => {
    for (const syntax of ['dot', 'bracket', 'escaped']) {
      it(`should scale proportionally with ${syntax} path length`, async function () {
        this.timeout(15000);

        const sizes = [64, 256, 1024];
        const fixtures = sizes.map(size => {
          if (syntax === 'escaped') {
            const key = 'a.b'.repeat(size);
            return { obj: { [key]: 'found' }, path: key.replaceAll('.', '\\.') };
          }

          let obj = { value: 'found' };
          for (let i = 0; i < size; i++) {
            obj = { nested: obj };
          }
          const segment = syntax === 'dot' ? 'nested.' : '["nested"]';
          const suffix = syntax === 'dot' ? 'value' : '["value"]';
          return { obj, path: segment.repeat(size) + suffix };
        });
        const samples = sizes.map(() => []);
        const run = (fixture, count) => {
          let result;
          for (let i = 0; i < count; i++) {
            result = expand(fixture.obj, fixture.path);
          }
          assert.equal(result, 'found');
        };

        for (const fixture of fixtures) {
          run(fixture, 100);
        }

        // Alternate direction to reduce bias from warmup and machine load.
        for (let round = 0; round < 5; round++) {
          const order = round % 2 === 0 ? [0, 1, 2] : [2, 1, 0];
          for (const index of order) {
            let count = 1;
            let elapsed;
            do {
              const start = perfHooks.performance.now();
              run(fixtures[index], count);
              elapsed = perfHooks.performance.now() - start;
              if (elapsed < 10) {
                count *= 2;
              }
            } while (elapsed < 10);
            samples[index].push(elapsed / count);
          }
        }

        const medians = samples.map(values => values.sort((a, b) => a - b)[2]);
        for (let i = 1; i < sizes.length; i++) {
          const growth = medians[i] / medians[i - 1];
          assert.ok(
            growth < 10,
            `${syntax} path size grew 4x, but time per call grew ${growth.toFixed(2)}x: ${JSON.stringify(medians)} ms/call`
          );
        }
        const totalGrowth = medians[2] / medians[0];
        assert.ok(
          totalGrowth < 64,
          `${syntax} path size grew 16x, but time per call grew ${totalGrowth.toFixed(2)}x: ${JSON.stringify(medians)} ms/call`
        );
      });
    }
  });

  describe('retained memory', () => {
    for (const scenario of ['input objects', 'distinct paths']) {
      it(`should release memory after expanding ${scenario}`, async function () {
        this.timeout(15000);

        const session = new inspector.Session();
        session.connect();
        const collect = async () => {
          await new Promise((resolve, reject) => {
            session.post('HeapProfiler.collectGarbage', error => {
              if (error) {
                reject(error);
              } else {
                resolve(undefined);
              }
            });
          });
          return process.memoryUsage().heapUsed;
        };
        const runBatch = (offset, count) => {
          for (let i = offset; i < offset + count; i++) {
            if (scenario === 'input objects') {
              const obj = { nested: { value: i, payload: Array(4096).fill(i) } };
              assert.equal(expand(obj, 'nested.value'), i);
            } else {
              const key = `sync_key${i}_${'x'.repeat(4096)}`;
              assert.equal(expand({ data: { [key]: i } }, `data.${key}`), i);
            }
          }
        };

        try {
          // Warm the expansion and collection paths before taking the baseline.
          runBatch(0, 200);
          await collect();
          const baseline = await collect();
          const retained = [];
          for (let batch = 0; batch < 3; batch++) {
            runBatch(200 + batch * 500, 500);
            retained.push(await collect());
          }

          const growth = retained[2] - baseline;
          const allowance = 2 * 1024 * 1024;
          assert.ok(
            growth < allowance,
            `${scenario} retained ${growth} bytes after 1500 calls and garbage collection; allowance: ${allowance} bytes; baseline: ${baseline}; samples: ${JSON.stringify(retained)}`
          );
        } finally {
          session.disconnect();
        }
      });
    }
  });

  describe('large data structures', () => {
    it('should handle large arrays', () => {
      const arr = Array(100000)
        .fill(0)
        .map((_, i) => i);
      const obj = { arr };

      assert.equal(expand(obj, 'arr.99999'), 99999);
      assert.equal(expand(obj, 'arr.first'), 0);
      assert.equal(expand(obj, 'arr.last'), 99999);
      assert.equal(expand(obj, 'arr.length'), 100000);
    });

    it('should handle large objects', () => {
      const largeObj = {};
      for (let i = 0; i < 100000; i++) {
        largeObj[`key${i}`] = i;
      }

      const obj = { data: largeObj };

      assert.equal(expand(obj, 'data.key0'), 0);
      assert.equal(expand(obj, 'data.key99999'), 99999);
      assert.equal(expand(obj, 'data.size'), 100000);
    });

    it('should handle large strings', () => {
      console.time('repeat string');
      const str = 'a'.repeat(1_000_000);
      console.timeEnd('repeat string');

      const obj = { str };

      console.time('expand');
      assert.equal(expand(obj, 'str.length'), 1_000_000);
      assert.equal(expand(obj, 'str.first'), 'a');
      assert.equal(expand(obj, 'str.last'), 'a');
      console.timeEnd('expand');
    });
  });

  describe('deep structures', () => {
    it('should handle deeply nested objects', () => {
      let deepObj = { value: 'bottom' };

      for (let i = 0; i < 1000; i++) {
        deepObj = { nested: deepObj };
      }

      const obj = { nested: deepObj };
      const path = Array(1000).fill('nested').join('.') + '.value';
      assert.equal(expand(obj.nested, path), 'bottom');
    });

    it('should handle deep array nesting', () => {
      let deepArray = ['found'];

      for (let i = 0; i < 1000; i++) {
        deepArray = [deepArray];
      }

      const obj = { nested: deepArray };
      const path = Array(1000).fill('0').join('.') + '.0';
      assert.equal(expand(obj, `nested.${path}`), 'found');
    });
  });

  describe('complex object graphs', () => {
    it('should handle objects with many cross-references', () => {
      const graph = {};
      // Create 100 nodes
      for (let i = 0; i < 100; i++) {
        graph[`node${i}`] = { id: i, refs: {} };
      }
      // Each node references 10 random other nodes
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          const ref = Math.floor(Math.random() * 100);
          graph[`node${i}`].refs[`ref${j}`] = graph[`node${ref}`];
        }
      }

      const obj = { graph };
      assert.equal(expand(obj, 'graph.node0.refs.ref0.id') >= 0, true);
      assert.equal(expand(obj, 'graph.node99.refs.ref9.id') >= 0, true);
    });

    it('should handle branching object structures', () => {
      const createBranch = (depth, breadth) => {
        if (depth === 0) {
          return { value: 'leaf' };
        }
        const node = {};
        for (let i = 0; i < breadth; i++) {
          node[`branch${i}`] = createBranch(depth - 1, breadth);
        }
        return node;
      };

      const tree = createBranch(5, 5); // 5 levels deep, 5 branches each
      const obj = { tree };

      assert.equal(expand(obj, 'tree.branch0.branch0.branch0.branch0.branch0.value'), 'leaf');
      assert.equal(expand(obj, 'tree.branch4.branch4.branch4.branch4.branch4.value'), 'leaf');
    });
  });

  describe('expensive operations', () => {
    it('should handle getters with expensive computations', () => {
      const obj = {
        get expensive() {
          let result = 0;
          for (let i = 0; i < 1000000; i++) {
            result += i;
          }
          return result;
        },
        nested: {
          get costly() {
            return Array(100000)
              .fill(0)
              .reduce((a, b) => a + b, 0);
          }
        }
      };

      assert.equal(typeof expand(obj, 'expensive'), 'number');
      assert.equal(expand(obj, 'nested.costly'), 0);
    });

    it('should handle proxies with expensive handlers', () => {
      const handler = {
        get(target, prop) {
          // Simulate expensive computation in proxy
          for (let i = 0; i < 10000; i++) {
            Math.random();
          }
          return target[prop];
        }
      };

      const proxy = new Proxy({ value: 'found' }, handler);
      const obj = { proxy };

      assert.equal(expand(obj, 'proxy.value'), 'found');
    });
  });

  describe('memory intensive operations', () => {
    it('should handle sparse arrays', () => {
      const sparse = [];
      sparse[0] = 'start';
      sparse[999999] = 'end';
      const obj = { sparse };

      assert.equal(expand(obj, 'sparse.0'), 'start');
      assert.equal(expand(obj, 'sparse.999999'), 'end');
      assert.equal(expand(obj, 'sparse.500000'), undefined);
    });

    it('should handle large array-like objects', () => {
      const arrayLike = { length: 1000000 };
      for (let i = 0; i < 1000000; i += 100000) {
        arrayLike[i] = `value${i}`;
      }

      const obj = { data: arrayLike };
      assert.equal(expand(obj, 'data.0'), 'value0');
      assert.equal(expand(obj, 'data.900000'), 'value900000');
      assert.equal(expand(obj, 'data.length'), 1000000);
    });

    it('should handle objects with many enumerable properties', () => {
      const lotsOfProps = Object.create(null);
      for (let i = 0; i < 100000; i++) {
        Object.defineProperty(lotsOfProps, `prop${i}`, {
          enumerable: true,
          value: `value${i}`
        });
      }
      const obj = { props: lotsOfProps };

      assert.equal(expand(obj, 'props.prop0'), 'value0');
      assert.equal(expand(obj, 'props.prop99999'), 'value99999');
    });
  });

  describe('complex path resolution', () => {
    it('should handle paths with many brackets', () => {
      const obj = {
        a: {
          b: {
            c: {
              d: {
                e: 'found'
              }
            }
          }
        }
      };

      assert.equal(expand(obj, 'a["b"]["c"]["d"]["e"]'), 'found');
      assert.equal(expand(obj, "['a']['b']['c']['d']['e']"), 'found');
    });

    it('should handle complex path segments', () => {
      const obj = {
        'complex.key.with.dots': {
          'another.complex.key': {
            'yet.another.one': 'found'
          }
        }
      };

      assert.equal(expand(obj, 'complex\\.key\\.with\\.dots.another\\.complex\\.key.yet\\.another\\.one'), 'found');
    });
  });
});
