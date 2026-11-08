import assert from 'node:assert/strict';
import { expand } from '~/async/expand';

describe('async edge-cases', () => {
  describe('long paths', () => {
    it('should handle extremely long path strings', async () => {
      const segments = Array(1000).fill('a');
      const longPath = segments.join('.');

      // Create deeply nested object
      const obj = {};
      let current = obj;

      for (let i = 0; i < segments.length - 1; i++) {
        current[segments[i]] = {};
        current = current[segments[i]];
      }

      current[segments[segments.length - 1]] = 'found';
      assert.equal(await expand(obj, longPath), 'found');
    });
  });

  describe('special characters', () => {
    it('should handle unicode characters in paths', async () => {
      const obj = { '🎉': { '⭐': 'party' } };
      assert.equal(await expand(obj, '🎉.⭐'), 'party');
    });

    it('should handle unicode control characters', async () => {
      const obj = { '\u0001': { '\u0002': 'control' } };
      assert.equal(await expand(obj, '\u0001.\u0002'), 'control');
    });
  });

  describe('special objects', () => {
    it('should handle WeakMap and WeakSet values', async () => {
      const weakMap = new WeakMap();
      const weakSet = new WeakSet();
      const obj = { a: { map: weakMap, set: weakSet } };
      assert.equal(await expand(obj, 'a.map'), weakMap);
      assert.equal(await expand(obj, 'a.set'), weakSet);
    });

    it('should handle Promise objects', async () => {
      const promise = Promise.resolve('value');
      const obj = { async: { promise } };
      assert.equal(await expand(obj, 'async.promise'), 'value');
    });

    it('should handle Date objects', async () => {
      const date = new Date('2024-01-01');
      const obj = { [date.toISOString()]: 'new-year' };
      assert.equal(await expand(obj, date.toISOString()), 'new-year');
    });

    it('should handle Error objects', async () => {
      const error = new TypeError('test error');
      const obj = { error };
      assert.equal(await expand(obj, 'error'), error);
    });
  });

  describe('number edge cases', () => {
    it('should handle special number values', async () => {
      const obj = {
        [NaN]: 'not-a-number',
        [Infinity]: 'infinity',
        [Number.POSITIVE_INFINITY]: 'positive-infinity',
        [Number.NEGATIVE_INFINITY]: 'negative-infinity',
        [-0]: 'negative-zero'
      };

      assert.equal(await expand(obj, '[NaN]'), 'not-a-number');
      assert.equal(await expand(obj, '[Infinity]'), 'positive-infinity'); // overwrites "infinity" key
      assert.equal(await expand(obj, '[-Infinity]'), 'negative-infinity');
      assert.equal(await expand(obj, '[-0]'), 'negative-zero');
    });
  });

  describe('throwing getters', () => {
    it('should handle getters that throw', async () => {
      const obj = {
        nested: {
          get throws() {
            throw new Error('getter error');
          }
        }
      };

      await assert.rejects(() => expand(obj, 'nested.throws'), /getter error/);
    });
  });

  describe('proxies', () => {
    it('should handle revoked proxies', async () => {
      const target = { foo: 'bar' };
      const { proxy, revoke } = Proxy.revocable(target, {});
      const obj = { proxy };

      assert.equal(await expand(obj, 'proxy.foo'), 'bar');
      revoke();
      await assert.rejects(() => expand(obj, 'proxy.foo'), TypeError);
    });

    it('should handle nested proxies', async () => {
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

      assert.equal(await expand(obj, 'proxy.foo'), 'bar');
      assert.equal(await expand(obj, 'proxy.nested.value'), 'deep');
    });
  });

  describe('performance edge cases', () => {
    it('should handle objects with many sibling properties', async () => {
      const obj = { root: {} };
      for (let i = 0; i < 10000; i++) {
        obj.root[`prop${i}`] = i;
      }
      assert.equal(await expand(obj, 'root.prop9999'), 9999);
    });

    it('should handle deeply nested proxy chains', async () => {
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
      assert.equal(await expand(obj, `deep.${path}`), 'found');
    });
  });
});
