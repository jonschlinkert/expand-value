// 'use strict';

// const assert = require('node:assert/strict');
// const expand = require('..');

// describe('performance', () => {
//   describe('large data structures', () => {
//     it('should handle large arrays', () => {
//       const arr = Array(100000).fill(0).map((_, i) => i);
//       const obj = { arr };

//       assert.equal(expand(obj, 'arr.99999'), 99999);
//       assert.equal(expand(obj, 'arr.first'), 0);
//       assert.equal(expand(obj, 'arr.last'), 99999);
//       assert.equal(expand(obj, 'arr.length'), 100000);
//     });

//     it('should handle large objects', () => {
//       const largeObj = {};
//       for (let i = 0; i < 100000; i++) {
//         largeObj[`key${i}`] = i;
//       }
//       const obj = { data: largeObj };

//       assert.equal(expand(obj, 'data.key0'), 0);
//       assert.equal(expand(obj, 'data.key99999'), 99999);
//       assert.equal(expand(obj, 'data.size'), 100000);
//     });

//     it('should handle large strings', () => {
//       const str = 'a'.repeat(1000000);
//       const obj = { str };

//       assert.equal(expand(obj, 'str.length'), 1000000);
//       assert.equal(expand(obj, 'str.first'), 'a');
//       assert.equal(expand(obj, 'str.last'), 'a');
//     });
//   });

//   describe('deep structures', () => {
//     it('should handle deeply nested objects', () => {
//       let deepObj = { value: 'bottom' };
//       for (let i = 0; i < 1000; i++) {
//         deepObj = { nested: deepObj };
//       }
//       const obj = { deep: deepObj };

//       const path = Array(1000).fill('nested').join('.') + '.value';
//       assert.equal(expand(obj, path), 'bottom');
//     });

//     it('should handle deep array nesting', () => {
//       let deepArray = ['found'];
//       for (let i = 0; i < 1000; i++) {
//         deepArray = [deepArray];
//       }
//       const obj = { deep: deepArray };

//       const path = Array(1000).fill('0').join('.') + '.0';
//       assert.equal(expand(obj, path), 'found');
//     });
//   });

//   describe('complex object graphs', () => {
//     it('should handle objects with many cross-references', () => {
//       const graph = {};
//       // Create 100 nodes
//       for (let i = 0; i < 100; i++) {
//         graph[`node${i}`] = { id: i, refs: {} };
//       }
//       // Each node references 10 random other nodes
//       for (let i = 0; i < 100; i++) {
//         for (let j = 0; j < 10; j++) {
//           const ref = Math.floor(Math.random() * 100);
//           graph[`node${i}`].refs[`ref${j}`] = graph[`node${ref}`];
//         }
//       }

//       const obj = { graph };
//       assert.equal(expand(obj, 'graph.node0.refs.ref0.id') >= 0, true);
//       assert.equal(expand(obj, 'graph.node99.refs.ref9.id') >= 0, true);
//     });

//     it('should handle branching object structures', () => {
//       const createBranch = (depth, breadth) => {
//         if (depth === 0) {
//           return { value: 'leaf' };
//         }
//         const node = {};
//         for (let i = 0; i < breadth; i++) {
//           node[`branch${i}`] = createBranch(depth - 1, breadth);
//         }
//         return node;
//       };

//       const tree = createBranch(5, 5); // 5 levels deep, 5 branches each
//       const obj = { tree };

//       assert.equal(expand(obj, 'tree.branch0.branch0.branch0.branch0.branch0.value'), 'leaf');
//       assert.equal(expand(obj, 'tree.branch4.branch4.branch4.branch4.branch4.value'), 'leaf');
//     });
//   });

//   describe('expensive operations', () => {
//     it('should handle getters with expensive computations', () => {
//       const obj = {
//         get expensive() {
//           let result = 0;
//           for (let i = 0; i < 1000000; i++) {
//             result += i;
//           }
//           return result;
//         },
//         nested: {
//           get costly() {
//             return Array(100000).fill(0).reduce((a, b) => a + b, 0);
//           }
//         }
//       };

//       assert.equal(typeof expand(obj, 'expensive'), 'number');
//       assert.equal(expand(obj, 'nested.costly'), 0);
//     });

//     it('should handle proxies with expensive handlers', () => {
//       const handler = {
//         get(target, prop) {
//           // Simulate expensive computation in proxy
//           for (let i = 0; i < 10000; i++) {
//             Math.random();
//           }
//           return target[prop];
//         }
//       };

//       const proxy = new Proxy({ value: 'found' }, handler);
//       const obj = { proxy };

//       assert.equal(expand(obj, 'proxy.value'), 'found');
//     });
//   });

//   describe('memory intensive operations', () => {
//     it('should handle sparse arrays', () => {
//       const sparse = [];
//       sparse[0] = 'start';
//       sparse[999999] = 'end';
//       const obj = { sparse };

//       assert.equal(expand(obj, 'sparse.0'), 'start');
//       assert.equal(expand(obj, 'sparse.999999'), 'end');
//       assert.equal(expand(obj, 'sparse.500000'), undefined);
//     });

//     it('should handle large array-like objects', () => {
//       const arrayLike = { length: 1000000 };
//       for (let i = 0; i < 1000000; i += 100000) {
//         arrayLike[i] = `value${i}`;
//       }
//       const obj = { data: arrayLike };

//       assert.equal(expand(obj, 'data.0'), 'value0');
//       assert.equal(expand(obj, 'data.900000'), 'value900000');
//       assert.equal(expand(obj, 'data.length'), 1000000);
//     });

//     it('should handle objects with many enumerable properties', () => {
//       const lotsOfProps = Object.create(null);
//       for (let i = 0; i < 100000; i++) {
//         Object.defineProperty(lotsOfProps, `prop${i}`, {
//           enumerable: true,
//           value: `value${i}`
//         });
//       }
//       const obj = { props: lotsOfProps };

//       assert.equal(expand(obj, 'props.prop0'), 'value0');
//       assert.equal(expand(obj, 'props.prop99999'), 'value99999');
//     });
//   });

//   describe('complex path resolution', () => {
//     it('should handle paths with many brackets', () => {
//       const obj = {
//         a: {
//           b: {
//             c: {
//               d: {
//                 e: 'found'
//               }
//             }
//           }
//         }
//       };

//       assert.equal(expand(obj, 'a["b"]["c"]["d"]["e"]'), 'found');
//       assert.equal(expand(obj, "['a']['b']['c']['d']['e']"), 'found');
//     });

//     it('should handle complex path segments', () => {
//       const obj = {
//         'complex.key.with.dots': {
//           'another.complex.key': {
//             'yet.another.one': 'found'
//           }
//         }
//       };

//       assert.equal(expand(obj, 'complex\\.key\\.with\\.dots.another\\.complex\\.key.yet\\.another\\.one'), 'found');
//     });
//   });
// });
