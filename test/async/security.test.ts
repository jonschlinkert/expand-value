import assert from 'node:assert/strict';
import { expand } from '~/async/expand';

describe('async security', () => {
  describe('prototype pollution', () => {
    it('should prevent accessing prototype via __proto__', async () => {
      const obj = {};
      assert.equal(await expand(obj, '__proto__.polluted'), undefined);
      assert.equal(obj.polluted, undefined);
      assert.equal({}.polluted, undefined);
    });

    it('should prevent accessing prototype via constructor', async () => {
      const obj = {};
      assert.equal(await expand(obj, 'constructor.prototype.polluted'), undefined);
      assert.equal(obj.polluted, undefined);
      assert.equal({}.polluted, undefined);
    });

    it('should prevent prototype pollution in nested objects', async () => {
      const obj = { nested: {} };
      assert.equal(await expand(obj, 'nested.__proto__.polluted'), undefined);
      assert.equal(await expand(obj, 'nested.constructor.prototype.polluted'), undefined);
      assert.equal(obj.nested.polluted, undefined);
      assert.equal({}.polluted, undefined);
    });
  });

  describe('stack overflow prevention', () => {
    it('should handle deeply nested structures safely', async () => {
      const createNestedObject = depth => {
        let obj = { value: 'deep' };
        for (let i = 0; i < depth; i++) {
          obj = { nested: obj };
        }
        return obj;
      };

      const obj = createNestedObject(10000);
      const path = Array(10000).fill('nested').concat('value').join('.');

      assert.equal(await expand(obj, path), 'deep');
    });
  });

  describe('malicious paths', () => {
    it('should handle paths with regex special characters', async () => {
      const obj = {
        'a.*': 'asterisk',
        'b.+': 'plus',
        'c.?': 'question',
        'd.[': 'bracket',
        'e.(': 'paren',
        'f.|': 'pipe'
      };

      assert.equal(await expand(obj, 'a\\.\\*'), 'asterisk');
      assert.equal(await expand(obj, 'b\\.\\+'), 'plus');
      assert.equal(await expand(obj, 'c\\.\\?'), 'question');
      assert.equal(await expand(obj, 'd\\.\\['), 'bracket');
      assert.equal(await expand(obj, 'e\\.\\('), 'paren');
      assert.equal(await expand(obj, 'f\\.\\|'), 'pipe');
    });
  });

  describe('circular references', () => {
    it('should handle circular references safely', async () => {
      const obj = { a: { b: { c: {} } } };
      obj.a.b.c.circular = obj;

      assert.equal(await expand(obj, 'a.b.c.circular.a.b.c.circular'), obj);
    });
  });

  describe('inherited properties', () => {
    it('should handle inherited properties safely with isValid', async () => {
      class Base {
        constructor() {
          this.prop = { value: 'base' }; // value is an own property of this.prop
        }
      }

      class Child extends Base {}
      const child = new Child();

      const options = {
        isValid: (key, obj) => Object.hasOwn(obj, key)
      };

      // prop.value is an own property of child.prop, so it should work in both cases
      assert.equal(await expand(child, 'prop.value', options), 'base');
      assert.equal(await expand(child, 'prop.value'), 'base');

      // To demonstrate property inheritance, let's add a test with an actual inherited property
      class Parent {
        inherited = 'parent value';
      }

      const obj = Object.create(new Parent());
      obj.own = 'own value';

      assert.equal(await expand(obj, 'own', options), 'own value'); // own property works
      assert.equal(await expand(obj, 'inherited', options), undefined); // inherited property is blocked
      assert.equal(await expand(obj, 'inherited'), 'parent value'); // inherited works without options
    });
  });

  describe('memory limits', () => {
    it('should handle large sparse arrays safely', async () => {
      const arr = [];
      arr[1000000] = 'end';
      const obj = { array: arr };

      assert.equal(await expand(obj, 'array[1000000]'), 'end');
      assert.equal(await expand(obj, 'array.1000000'), 'end');
    });
  });
});
