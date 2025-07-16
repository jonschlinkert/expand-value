
import assert from 'node:assert/strict';
import { expand } from '~/expand';

describe('helpers', () => {
  describe('.first helper', () => {
    it('should handle empty collections', () => {
      assert.equal(expand({ arr: [] }, 'arr.first'), undefined);
      assert.equal(expand({ str: '' }, 'str.first'), undefined);
      assert.equal(expand({ set: new Set() }, 'set.first'), undefined);
      assert.equal(expand({ map: new Map() }, 'map.first'), undefined);
    });

    it('should work with arrays', () => {
      assert.equal(expand({ arr: [1, 2, 3] }, 'arr.first'), 1);
      assert.equal(expand({ arr: [undefined] }, 'arr.first'), undefined);
      assert.equal(expand({ arr: [null] }, 'arr.first'), null);
    });

    it('should work with strings', () => {
      assert.equal(expand({ str: 'hello' }, 'str.first'), 'h');
      assert.equal(expand({ str: '🎉' }, 'str.first'), '🎉');
    });

    it('should work with Set', () => {
      const set = new Set(['a', 'b', 'c']);
      assert.equal(expand({ set }, 'set.first'), 'a');
    });

    it('should work with Map', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      assert.deepStrictEqual(expand({ map }, 'map.first'), ['a', 1]);
    });

    it('should work with custom collections', () => {
      const custom = {
        first: 'custom first',
        items: [1, 2, 3]
      };
      assert.equal(expand({ custom }, 'custom.first'), 'custom first');
    });

    it('should work with custom collection methods', () => {
      const custom = {
        first() {
          return 'method result';
        }
      };
      assert.equal(expand({ custom }, 'custom.first'), 'method result');
    });
  });

  describe('.last helper', () => {
    it('should handle empty collections', () => {
      assert.equal(expand({ arr: [] }, 'arr.last'), undefined);
      assert.equal(expand({ str: '' }, 'str.last'), undefined);
      assert.equal(expand({ set: new Set() }, 'set.last'), undefined);
      assert.equal(expand({ map: new Map() }, 'map.last'), undefined);
    });

    it('should work with arrays', () => {
      assert.equal(expand({ arr: [1, 2, 3] }, 'arr.last'), 3);
      assert.equal(expand({ arr: [undefined] }, 'arr.last'), undefined);
      assert.equal(expand({ arr: [null] }, 'arr.last'), null);
    });

    it('should work with strings', () => {
      assert.equal(expand({ str: 'hello' }, 'str.last'), 'o');
      assert.equal(expand({ str: '🎉' }, 'str.last'), '🎉');
    });

    it('should work with Set', () => {
      const set = new Set(['a', 'b', 'c']);
      assert.equal(expand({ set }, 'set.last'), 'c');
    });

    it('should work with Map', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      assert.deepStrictEqual(expand({ map }, 'map.last'), ['b', 2]);
    });

    it('should work with custom collections', () => {
      const custom = {
        last: 'custom last',
        items: [1, 2, 3]
      };
      assert.equal(expand({ custom }, 'custom.last'), 'custom last');
    });

    it('should work with custom collection methods', () => {
      const custom = {
        last() {
          return 'method result';
        }
      };
      assert.equal(expand({ custom }, 'custom.last'), 'method result');
    });
  });

  describe('.length helper', () => {
    it('should handle various types', () => {
      // assert.equal(expand({ arr: [1, 2, 3] }, 'arr.length'), 3);
      // assert.equal(expand({ str: 'hello' }, 'str.length'), 5);
      assert.equal(expand({ set: new Set([1, 2]) }, 'set.length'), 2);
      // assert.equal(expand({ map: new Map([['a', 1]]) }, 'map.length'), 1);
    });

    it('should handle objects with length property', () => {
      const obj = { length: 42 };
      assert.equal(expand({ obj }, 'obj.length'), 42);
    });

    it('should handle array-like objects', () => {
      const arrayLike = { 0: 'a', 1: 'b', length: 2 };
      assert.equal(expand({ obj: arrayLike }, 'obj.length'), 2);
    });
  });

  describe('.size helper', () => {
    it('should handle various types', () => {
      assert.equal(expand({ arr: [1, 2, 3] }, 'arr.size'), 3);
      assert.equal(expand({ str: 'hello' }, 'str.size'), 5);
      assert.equal(expand({ set: new Set([1, 2]) }, 'set.size'), 2);
      assert.equal(expand({ map: new Map([['a', 1]]) }, 'map.size'), 1);
    });

    it('should handle objects with size property', () => {
      const obj = { size: 100 };
      assert.equal(expand({ obj }, 'obj.size'), 100);
    });

    it('should handle objects with size method', () => {
      const obj = {
        size() {
          return 42;
        }
      };
      assert.equal(expand({ obj }, 'obj.size'), 42);
    });

    it('should handle null and undefined', () => {
      assert.equal(expand({ val: null }, 'val.size'), 1);
      assert.equal(expand({ val: undefined }, 'val.size'), 1);
    });

    it('should handle numbers', () => {
      assert.equal(expand({ num: 12345 }, 'num.size'), 5);
      assert.equal(expand({ num: -12345 }, 'num.size'), 6);
      assert.equal(expand({ num: 0 }, 'num.size'), 1);
    });

    it('should handle plain objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      assert.equal(expand({ obj }, 'obj.size'), 3);
    });

    it('should handle empty collections', () => {
      assert.equal(expand({ arr: [] }, 'arr.size'), 0);
      assert.equal(expand({ str: '' }, 'str.size'), 0);
      assert.equal(expand({ obj: {} }, 'obj.size'), 0);
      assert.equal(expand({ set: new Set() }, 'set.size'), 0);
      assert.equal(expand({ map: new Map() }, 'map.size'), 0);
    });

    it('should handle array-like objects', () => {
      const arrayLike = { 0: 'a', 1: 'b', length: 2 };
      assert.equal(expand({ obj: arrayLike }, 'obj.size'), 2);
    });

    it('should handle typed arrays', () => {
      const int32Array = new Int32Array([1, 2, 3]);
      const uint8Array = new Uint8Array([4, 5, 6]);

      assert.equal(expand({ arr: int32Array }, 'arr.size'), 3);
      assert.equal(expand({ arr: uint8Array }, 'arr.size'), 3);
    });
  });

  describe('combined helpers', () => {
    it('should work with chained helpers', () => {
      const obj = {
        users: [
          { friends: ['alice', 'bob', 'charlie'] },
          { friends: ['david', 'eve'] }
        ]
      };

      assert.equal(expand(obj, 'users.first.friends.size'), 3);
      assert.equal(expand(obj, 'users.last.friends.size'), 2);
      assert.equal(expand(obj, 'users.first.friends.first'), 'alice');
      assert.equal(expand(obj, 'users.last.friends.last'), 'eve');
    });

    it('should handle helpers with empty results', () => {
      const obj = {
        users: [
          { friends: [] },
          { friends: ['david', 'eve'] }
        ]
      };

      assert.equal(expand(obj, 'users.first.friends.first'), undefined);
      assert.equal(expand(obj, 'users.first.friends.size'), 0);
      assert.equal(expand(obj, 'users.first.friends.last'), undefined);
      assert.equal(expand(obj, 'users.last.friends.last'), 'eve');
    });

    it('should handle nested collections', () => {
      const obj = {
        data: new Map([
          ['users', new Set(['alice', 'bob'])],
          ['admins', new Set(['charlie'])]
        ])
      };

      assert.equal(expand(obj, 'data.first[1].size'), 2);
      assert.equal(expand(obj, 'data.last[1].size'), 1);
      assert.equal(expand(obj, 'data.size'), 2);
    });
  });
});
