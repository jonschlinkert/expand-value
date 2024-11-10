'use strict';

const assert = require('node:assert/strict');
const expand = require('..');

describe('security', () => {
  describe('prototype pollution', () => {
    it('should prevent accessing prototype via __proto__', () => {
      const obj = {};
      assert.equal(expand(obj, '__proto__.polluted'), undefined);
      assert.equal(obj.polluted, undefined);
      assert.equal(({}).polluted, undefined);
    });

    it('should prevent accessing prototype via constructor', () => {
      const obj = {};
      assert.equal(expand(obj, 'constructor.prototype.polluted'), undefined);
      assert.equal(obj.polluted, undefined);
      assert.equal(({}).polluted, undefined);
    });

    it('should prevent prototype pollution in nested objects', () => {
      const obj = { nested: {} };
      assert.equal(expand(obj, 'nested.__proto__.polluted'), undefined);
      assert.equal(expand(obj, 'nested.constructor.prototype.polluted'), undefined);
      assert.equal(obj.nested.polluted, undefined);
      assert.equal(({}).polluted, undefined);
    });
  });

  describe('stack overflow prevention', () => {
    it('should handle deeply nested structures safely', () => {
      const createNestedObject = depth => {
        let obj = { value: 'deep' };
        for (let i = 0; i < depth; i++) {
          obj = { nested: obj };
        }
        return obj;
      };

      const obj = createNestedObject(10000);
      const path = Array(10000).fill('nested').concat('value').join('.');

      assert.equal(expand(obj, path), 'deep');
    });
  });

  describe('malicious paths', () => {
    it('should handle paths with regex special characters', () => {
      const obj = {
        'a.*': 'asterisk',
        'b.+': 'plus',
        'c.?': 'question',
        'd.[': 'bracket',
        'e.(': 'paren',
        'f.|': 'pipe'
      };

      assert.equal(expand(obj, 'a\\.\\*'), 'asterisk');
      assert.equal(expand(obj, 'b\\.\\+'), 'plus');
      assert.equal(expand(obj, 'c\\.\\?'), 'question');
      assert.equal(expand(obj, 'd\\.\\['), 'bracket');
      assert.equal(expand(obj, 'e\\.\\('), 'paren');
      assert.equal(expand(obj, 'f\\.\\|'), 'pipe');
    });
  });

  describe('circular references', () => {
    it('should handle circular references safely', () => {
      const obj = { a: { b: { c: {} } } };
      obj.a.b.c.circular = obj;

      assert.equal(expand(obj, 'a.b.c.circular.a.b.c.circular'), obj);
    });
  });

  describe('inherited properties', () => {
    it('should handle inherited properties safely with isValid', () => {
      class Base {
        constructor() {
          this.prop = { value: 'base' };  // value is an own property of this.prop
        }
      }

      class Child extends Base {}
      const child = new Child();

      const options = {
        isValid: (key, obj) => Object.hasOwn(obj, key)
      };

      // prop.value is an own property of child.prop, so it should work in both cases
      assert.equal(expand(child, 'prop.value', options), 'base');
      assert.equal(expand(child, 'prop.value'), 'base');

      // To demonstrate property inheritance, let's add a test with an actual inherited property
      class Parent {
        inherited = 'parent value'
      }

      const obj = Object.create(new Parent());
      obj.own = 'own value';

      assert.equal(expand(obj, 'own', options), 'own value');      // own property works
      assert.equal(expand(obj, 'inherited', options), undefined);  // inherited property is blocked
      assert.equal(expand(obj, 'inherited'), 'parent value');      // inherited works without options
    });
  });

  describe('memory limits', () => {
    it('should handle large sparse arrays safely', () => {
      const arr = [];
      arr[1000000] = 'end';
      const obj = { array: arr };

      assert.equal(expand(obj, 'array[1000000]'), 'end');
      assert.equal(expand(obj, 'array.1000000'), 'end');
    });
  });
});
