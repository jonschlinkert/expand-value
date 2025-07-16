
import assert from 'node:assert/strict';
import { expand } from '~/expand';

describe('edge-cases', () => {
  describe('long paths', () => {
    it('should handle extremely long path strings', () => {
      const segments = Array(1000).fill('a');
      const longPath = segments.join('.');

      // Create deeply nested object
      const obj = { };
      let current = obj;
      for (let i = 0; i < segments.length - 1; i++) {
        current[segments[i]] = {};
        current = current[segments[i]];
      }
      current[segments[segments.length - 1]] = 'found';

      assert.equal(expand(obj, longPath), 'found');
    });
  });

  describe('special characters', () => {
    it('should handle unicode characters in paths', () => {
      const obj = { '🎉': { '⭐': 'party' } };
      assert.equal(expand(obj, '🎉.⭐'), 'party');
    });

    it('should handle unicode control characters', () => {
      const obj = { '\u0001': { '\u0002': 'control' } };
      assert.equal(expand(obj, '\u0001.\u0002'), 'control');
    });
  });

  describe('special objects', () => {
    it('should handle WeakMap and WeakSet values', () => {
      const weakMap = new WeakMap();
      const weakSet = new WeakSet();
      const obj = { a: { map: weakMap, set: weakSet } };
      assert.equal(expand(obj, 'a.map'), weakMap);
      assert.equal(expand(obj, 'a.set'), weakSet);
    });

    it('should handle Promise objects', () => {
      const promise = Promise.resolve('value');
      const obj = { async: { promise } };
      assert.equal(expand(obj, 'async.promise'), promise);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01');
      const obj = { [date.toISOString()]: 'new-year' };
      assert.equal(expand(obj, date.toISOString()), 'new-year');
    });

    it('should handle Error objects', () => {
      const error = new TypeError('test error');
      const obj = { error };
      assert.equal(expand(obj, 'error'), error);
    });
  });

  describe('number edge cases', () => {
    it('should handle special number values', () => {
      const obj = {
        [NaN]: 'not-a-number',
        [Infinity]: 'infinity',
        [Number.POSITIVE_INFINITY]: 'positive-infinity',
        [Number.NEGATIVE_INFINITY]: 'negative-infinity',
        [-0]: 'negative-zero'
      };

      assert.equal(expand(obj, '[NaN]'), 'not-a-number');
      assert.equal(expand(obj, '[Infinity]'), 'positive-infinity'); // overwrites "infinity" key
      assert.equal(expand(obj, '[-Infinity]'), 'negative-infinity');
      assert.equal(expand(obj, '[-0]'), 'negative-zero');
    });
  });

  describe('throwing getters', () => {
    it('should handle getters that throw', () => {
      const obj = {
        nested: {
          get throws() {
            throw new Error('getter error');
          }
        }
      };

      assert.throws(() => expand(obj, 'nested.throws'), /getter error/);
    });
  });

  describe('proxies', () => {
    it('should handle revoked proxies', () => {
      const target = { foo: 'bar' };
      const { proxy, revoke } = Proxy.revocable(target, {});
      const obj = { proxy };

      assert.equal(expand(obj, 'proxy.foo'), 'bar');
      revoke();
      assert.throws(() => expand(obj, 'proxy.foo'), TypeError);
    });

    it('should handle nested proxies', () => {
      const handler = {
        get(target, prop) {
          if (prop === 'nested') {
            return new Proxy({ value: 'deep' }, handler);
          }
          return target[prop];
        }
      };

      const proxy = new Proxy({ foo: 'bar' }, handler);
      const obj = { proxy };

      assert.equal(expand(obj, 'proxy.foo'), 'bar');
      assert.equal(expand(obj, 'proxy.nested.value'), 'deep');
    });
  });

  describe('performance edge cases', () => {
    it('should handle objects with many sibling properties', () => {
      const obj = { root: {} };
      for (let i = 0; i < 10000; i++) {
        obj.root[`prop${i}`] = i;
      }
      assert.equal(expand(obj, 'root.prop9999'), 9999);
    });

    it('should handle deeply nested proxy chains', () => {
      const createProxy = depth => {
        if (depth === 0) {
          return { value: 'found' };
        }

        const target = { next: null };
        target.next = createProxy(depth - 1);

        return new Proxy(target, {
          get(target, prop) {
            return target[prop];
          }
        });
      };

      const obj = { deep: createProxy(100) };
      const path = Array(100).fill('next').concat('value').join('.');
      assert.equal(expand(obj, `deep.${path}`), 'found');
    });
  });
});
