import assert from 'node:assert/strict';
import { expand } from '~/expand';

const data = {
  product: { variants: [{ title: 'draft151cm' }, { title: 'element151cm' }] }
};

describe('expand', () => {
  describe('symbols', () => {
    it('should get a symbol', () => {
      const foo = Symbol('foo');
      assert.equal(expand({ [foo]: 'correct' }, foo), 'correct');
    });

    it('nested symbol properties', () => {
      const nested = Symbol('nested');
      const deep = Symbol('deep');

      const obj = {
        foo: {
          [nested]: {
            [deep]: 'correct'
          }
        }
      };

      assert.equal(expand(obj, `foo[${nested.toString()}][${deep.toString()}]`), 'correct');
    });
  });

  describe('properties', () => {
    it('should get a property', () => {
      assert.equal(expand({ foo: 'correct' }, 'foo'), 'correct');
    });

    it('should get a direct key from a Map', () => {
      assert.equal(expand(new Map([['foo', 'correct']]), 'foo'), 'correct');
    });

    it('should get nested keys from Maps', () => {
      const data = new Map([['foo', new Map([['bar', 'correct']])]]);
      assert.equal(expand(data, 'foo.bar'), 'correct');
    });

    it('should get values from an object exposing a get function', () => {
      const data = {
        get(key) {
          return key === 'foo' ? { bar: 'correct' } : undefined;
        }
      };

      assert.equal(expand(data, 'foo.bar'), 'correct');
    });
  });

  describe('resolve option', () => {
    it('should resolve direct property reads', () => {
      const data = { name: 'ada' };
      const calls = [];
      const options = {
        resolve(target, prop, value, state) {
          calls.push({ target, prop, value, state });
          return typeof value === 'string' ? value.toUpperCase() : undefined;
        }
      };

      assert.equal(expand(data, 'name', options), 'ADA');
      assert.deepEqual(calls, [{ target: data, prop: 'name', value: 'ada', state: { segments: ['name'], index: 0 } }]);
    });

    it('should resolve nested dot path reads', () => {
      const calls = [];
      const data = { user: { name: 'ada' } };
      const options = {
        resolve(_target, prop, value) {
          calls.push(prop);
          return typeof value === 'string' ? value.toUpperCase() : undefined;
        }
      };

      assert.equal(expand(data, 'user.name', options), 'ADA');
      assert.deepEqual(calls, ['user', 'name']);
    });

    it('should resolve parsed bracket path reads', () => {
      const data = { items: ['a', 'b', 'c'], index: 1 };
      const options = {
        resolve(_target, prop, value) {
          return prop === 1 ? value.toUpperCase() : value;
        }
      };

      assert.equal(expand(data, 'items[index]', options), 'B');
    });

    it('should resolve range reads', () => {
      const data = { items: ['a', 'b', 'c'] };
      const options = {
        resolve(_target, prop, value) {
          return typeof prop === 'number' ? `${prop}:${value}` : value;
        }
      };

      assert.deepEqual(expand(data, 'items[0..2]', options), ['0:a', '1:b', '2:c']);
    });

    it('should keep the raw value when resolve returns null or undefined', () => {
      assert.equal(expand({ name: 'correct' }, 'name', { resolve: () => null }), 'correct');
      assert.equal(expand({ name: 'correct' }, 'name', { resolve: () => undefined }), 'correct');
    });
  });

  describe('nested properties', () => {
    it('should get a nested property', () => {
      assert.equal(expand({ foo: { bar: 'correct' } }, 'foo.bar'), 'correct');
      assert.equal(expand({ foo: { bar: 'wrong' } }, 'foo.other.bar'), undefined);
      assert.equal(expand({ foo: { bar: 'wrong' } }, 'foo.first.bar'), undefined);
    });

    it('should throw when missing and options.strict is true', () => {
      assert.throws(() => expand({ foo: { bar: 'wrong' } }, 'foo.other.bar', { strict: true }), /Variable/);
      assert.throws(() => expand({ foo: { bar: 'wrong' } }, 'foo.first.bar', { strict: true }), /Variable/);
    });
  });

  describe('numerical keys', () => {
    it('should get value when key is an integer', () => {
      assert.equal(expand({ context: 'wrong' }, 'context["10"]'), undefined);
      assert.equal(expand({ context: { 10: 'correct' } }, 'context["10"]'), 'correct');
    });

    it('should get value when key is a float', () => {
      assert.equal(expand({ context: 'wrong' }, 'context["10.2232"]'), undefined);
      assert.equal(expand({ context: { 10.2232: 'correct' } }, 'context["10.2232"]'), 'correct');
    });
  });

  describe('escaped dots', () => {
    it('should expand foo\\.bar', () => {
      assert.equal(expand({ 'foo.bar': 'correct' }, 'foo\\.bar'), 'correct');
    });

    it('should expand foo\\.bar\\.baz', () => {
      assert.equal(expand({ 'foo.bar.baz': 'correct' }, 'foo\\.bar\\.baz'), 'correct');
    });

    it('should expand foo\\.bar.baz', () => {
      assert.equal(expand({ 'foo.bar': { baz: 'correct' } }, 'foo\\.bar.baz'), 'correct');
    });
  });

  describe('square brackets', () => {
    it('should expand foo["bar"]', () => {
      assert.equal(expand({ foo: { bar: 'correct' } }, 'foo["bar"]'), 'correct');
    });

    it('should expand foo["bar"].baz', () => {
      assert.equal(expand({ foo: { bar: { baz: 'correct' } } }, 'foo["bar"].baz'), 'correct');
    });

    it('should expand ranges in square brackets', () => {
      const data = { items: ['a', 'b', 'c', 'd', 'e'] };
      assert.deepEqual(expand(data, 'items[1..3]'), ['b', 'c', 'd']);
      assert.deepEqual(expand(data, 'items[0..4]'), ['a', 'b', 'c', 'd', 'e']);
      assert.deepEqual(expand(data, 'items[2..2]'), ['c']);
    });

    it('should get a property from each element in a range', () => {
      const data = { items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }] };
      assert.deepEqual(expand(data, 'items[1..3].name'), ['b', 'c', 'd']);
    });

    it('should keep a single-element range as an array after property access', () => {
      const data = { items: [{ name: 'a' }, { name: 'b' }] };
      assert.deepEqual(expand(data, 'items[1..1].name'), ['b']);
    });

    it('should select all array elements with a wildcard', () => {
      const data = { items: ['a', 'b', 'c'] };
      assert.deepEqual(expand(data, 'items[*]'), ['a', 'b', 'c']);
    });

    it('should get a property from each wildcard-selected element', () => {
      const data = { items: [{ foo: 0 }, { foo: false }, { foo: '' }, { foo: null }] };
      assert.deepEqual(expand(data, 'items[*].foo'), [0, false, '', null]);
    });

    it('should resolve multiple properties after a range', () => {
      const data = { items: [{ foo: { bar: 'a' } }, { foo: { bar: 'b' } }] };
      assert.deepEqual(expand(data, 'items[0..1].foo.bar'), ['a', 'b']);
    });

    it('should resolve multiple properties after a wildcard', () => {
      const data = { items: [{ foo: { bar: 'a' } }, { foo: { bar: 'b' } }] };
      assert.deepEqual(expand(data, 'items[*].foo.bar'), ['a', 'b']);
    });

    it('should resolve quoted properties after a selection', () => {
      const data = { items: [{ 'display.name': 'Ada' }, { 'display.name': 'Grace' }] };
      assert.deepEqual(expand(data, 'items[*]["display.name"]'), ['Ada', 'Grace']);
    });

    it('should resolve computed properties after a selection', () => {
      const data = { key: 'name', items: [{ name: 'Ada' }, { name: 'Grace' }] };
      assert.deepEqual(expand(data, 'items[*][key]'), ['Ada', 'Grace']);
    });

    it('should index each array returned by a selected property', () => {
      const data = { items: [{ names: ['a', 'b'] }, { names: ['c', 'd'] }] };
      assert.deepEqual(expand(data, 'items[*].names[0]'), ['a', 'c']);
    });

    it('should resolve negative indices within each selected array', () => {
      const data = {
        items: [
          ['a', 'b'],
          ['c', 'd', 'e']
        ]
      };
      assert.deepEqual(expand(data, 'items[*][-1]'), ['b', 'e']);
    });

    it('should access array properties without creating another selection', () => {
      const data = { items: [{ names: ['a', 'b'] }, { names: ['c'] }] };
      assert.deepEqual(expand(data, 'items[*].names.length'), [2, 1]);
    });

    it('should preserve nesting for repeated wildcards', () => {
      const data = { groups: [{ items: [{ name: 'a' }, { name: 'b' }] }, { items: [] }, { items: [{ name: 'c' }] }] };
      assert.deepEqual(expand(data, 'groups[*].items[*].name'), [['a', 'b'], [], ['c']]);
    });

    it('should apply a range separately within each wildcard selection', () => {
      const data = {
        groups: [
          [{ name: 'a' }, { name: 'b' }],
          [{ name: 'c' }, { name: 'd' }]
        ]
      };
      assert.deepEqual(expand(data, 'groups[*][0..1].name'), [
        ['a', 'b'],
        ['c', 'd']
      ]);
    });

    it('should apply a wildcard within each range-selected element', () => {
      const data = { groups: [[], [{ name: 'a' }], [{ name: 'b' }, { name: 'c' }]] };
      assert.deepEqual(expand(data, 'groups[1..2][*].name'), [['a'], ['b', 'c']]);
    });

    it('should return an empty array when projecting an empty selection', () => {
      assert.deepEqual(expand({ items: [] }, 'items[*].foo.bar'), []);
    });

    it('should retain undefined entries for missing selected properties', () => {
      const data = { items: [{ name: 'a' }, {}, { name: 'c' }] };
      assert.deepEqual(expand(data, 'items[*].name'), ['a', undefined, 'c']);
    });

    it('should retain undefined entries for missing intermediate properties', () => {
      const data = { items: [{ foo: { bar: 'a' } }, {}, { foo: { bar: 'c' } }] };
      assert.deepEqual(expand(data, 'items[*].foo.bar'), ['a', undefined, 'c']);
    });

    it('should preserve holes in a range selection', () => {
      const items = Array(5);
      items[1] = 'a';
      items[3] = 'b';
      const expected = Array(3);
      expected[0] = 'a';
      expected[2] = 'b';
      assert.deepEqual(expand({ items }, 'items[1..3]'), expected);
    });

    it('should preserve holes when projecting a range', () => {
      const items = Array(5);
      items[1] = { name: 'a' };
      items[3] = { name: 'b' };
      const expected = Array(3);
      expected[0] = 'a';
      expected[2] = 'b';
      assert.deepEqual(expand({ items }, 'items[1..3].name'), expected);
    });

    it('should distinguish wildcard-selected holes from explicit undefined entries', () => {
      const items = Array(5);
      items[1] = { name: 'a' };
      items[2] = undefined;
      items[3] = {};
      const expected = Array(5);
      expected[1] = 'a';
      expected[2] = undefined;
      expected[3] = undefined;
      assert.deepEqual(expand({ items }, 'items[*].name'), expected);
    });

    it('should preserve holes at each nested selection depth', () => {
      const groups = Array(3);
      groups[1] = Array(2);
      groups[1][1] = { name: 'a' };
      const expected = Array(3);
      expected[1] = Array(2);
      expected[1][1] = 'a';
      assert.deepEqual(expand({ groups }, 'groups[*][*].name'), expected);
    });

    it('should resolve helpers separately for selected values', () => {
      const data = { items: [{ name: 'ada' }, { name: 'grace' }] };
      const helpers = { uppercase: value => value.toUpperCase() };
      assert.deepEqual(expand(data, 'items[*].name.uppercase', { helpers }), ['ADA', 'GRACE']);
    });

    it('should call resolve with each selected property owner', () => {
      const data = { items: [{ name: 'ada' }, { name: 'grace' }] };
      const targets = [];
      const options = {
        resolve(target, prop, value) {
          if (prop === 'name') {
            targets.push(target);
            return value.toUpperCase();
          }

          return value;
        }
      };

      assert.deepEqual(expand(data, 'items[*].name', options), ['ADA', 'GRACE']);
      assert.equal(targets[0], data.items[0]);
      assert.equal(targets[1], data.items[1]);
      assert.equal(targets.length, 2);
    });

    it('should treat a quoted asterisk as a property key', () => {
      const data = { items: { '*': { name: 'literal' } } };
      assert.equal(expand(data, 'items["*"].name'), 'literal');
    });

    it('should expand foo["bar"].name', () => {
      assert.equal(expand({ foo: { bar: { name: 'correct' } } }, 'foo["bar"].name'), 'correct');
    });

    it('should expand foo["bar"]["name"]', () => {
      assert.equal(expand({ foo: { bar: { name: 'correct' } } }, 'foo["bar"]["name"]'), 'correct');
    });

    it('should expand foo["bar"][0]', () => {
      assert.equal(expand({ foo: { bar: ['correct'] } }, 'foo["bar"][0]'), 'correct');
    });

    it('should expand foo["bar"][0][1]', () => {
      assert.equal(expand({ foo: { bar: [['wrong', 'correct']] } }, 'foo["bar"][0][1]'), 'correct');
    });

    it('should expand ranges in square brackets and get properties', () => {
      const data = {
        items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }]
      };

      assert.deepEqual(expand(data, 'items[1..3].name'), ['b', 'c', 'd']);
      assert.deepEqual(expand(data, 'items[0..4].name'), ['a', 'b', 'c', 'd', 'e']);
      assert.deepEqual(expand(data, 'items[2..2].name'), ['c']);
    });
  });

  describe('variable accessors', () => {
    it('should resolve nested computed property names', () => {
      const context = {
        config: { theme: 'dark' },
        themes: {
          dark: { background: 'black', text: 'white' },
          light: { background: 'white', text: 'black' }
        },
        setting: 'theme'
      };

      assert.equal(expand(context, 'setting'), 'theme');
      assert.equal(expand(context, 'config[setting]'), 'dark');
      assert.deepEqual(expand(context, 'themes[config[setting]]'), { background: 'black', text: 'white' });
      assert.equal(expand(context, 'themes[config[setting]].background'), 'black');
      assert.equal(expand(context, 'themes[config[setting]].text'), 'white');
    });

    it('should expand foo[bar]', () => {
      assert.equal(expand({ foo: { bar: 'wrong', whatever: 'correct' }, bar: 'whatever' }, 'foo[bar]'), 'correct');
    });

    it('should expand foo["bar"].baz[qux]', () => {
      const data = { foo: { bar: { baz: { other: 'correct' } } }, qux: 'other' };
      assert.equal(expand(data, 'foo["bar"].baz[qux]'), 'correct');
    });

    it('should expand products[var].first', () => {
      const data = {
        var: 'tags',
        nested: { var: 'tags' },
        products: { count: 5, tags: ['correct-deepsnow', 'freestyle'] }
      };
      assert.equal(expand(data, 'products[var].first'), 'correct-deepsnow');
    });

    it('should expand products[nested.var].last', () => {
      const data = {
        var: 'tags',
        nested: { var: 'tags' },
        products: { count: 5, tags: ['deepsnow', 'correct-freestyle'] }
      };
      assert.equal(expand(data, 'products[nested.var].last'), 'correct-freestyle');
    });
  });

  describe('array index', () => {
    it('should expand product.variants[0].title', () => {
      assert.equal(expand(data, 'product.variants[0].title'), 'draft151cm');
    });

    it('should expand product.variants[1].title', () => {
      assert.equal(expand(data, 'product.variants[1].title'), 'element151cm');
    });
  });

  describe('.first helper', () => {
    it('should expand .first when value is a string', () => {
      assert.equal(expand({ letters: 'abcde' }, 'letters.first'), 'a');
    });

    it('should expand .first when value is an object', () => {
      assert.equal(expand({ a: { b: { first: 'foo' } } }, 'a.b.first'), 'foo');
      assert.equal(expand({ a: { b: { first: () => 'foo' } } }, 'a.b.first'), 'foo');
    });

    it('should expand .first when value is an array', () => {
      assert.equal(expand({ letters: ['a', 'b', 'c', 'd', 'e'] }, 'letters.first'), 'a');
    });

    it('should expand .first when value is a Set', () => {
      assert.equal(expand({ letters: new Set(['a', 'b', 'c', 'd', 'e']) }, 'letters.first'), 'a');
    });

    it('should get value when .first is an intermediate property', () => {
      assert.equal(expand(data, 'product.variants.first.title'), 'draft151cm');
    });

    it('should expand array.first', () => {
      assert.equal(expand({ array: ['correct', 'wrong'] }, 'array.first'), 'correct');
    });

    it('should expand hash["first"]', () => {
      assert.equal(expand({ hash: { first: 'correct' } }, 'hash["first"]'), 'correct');
    });

    it('should expand array["first"]', () => {
      assert.equal(expand({ array: ['wrong', 'wrong'] }, 'array["first"]'), undefined);
    });
  });

  describe('.last helper', () => {
    it('should expand .last when value is a string', () => {
      assert.equal(expand({ letters: 'abcde' }, 'letters.last'), 'e');
    });

    it('should expand .last when value is an object', () => {
      assert.equal(expand({ a: { b: { last: 'foo' } } }, 'a.b.last'), 'foo');
      assert.equal(expand({ a: { b: { last: () => 'foo' } } }, 'a.b.last'), 'foo');
    });

    it('should expand .last when value is an array', () => {
      assert.equal(expand({ letters: ['a', 'b', 'c', 'd', 'e'] }, 'letters.last'), 'e');
    });

    it('should expand .last when value is a Set', () => {
      assert.equal(expand({ letters: new Set(['a', 'b', 'c', 'd', 'e']) }, 'letters.last'), 'e');
    });

    it('should get value when .last is an intermediate property', () => {
      assert.equal(expand(data, 'product.variants.last.title'), 'element151cm');
    });
  });

  describe('custom helpers', () => {
    it('should expand .last when value is a string', () => {
      const helpers = { second: value => value[1] };
      assert.equal(expand({ letters: 'abcde' }, 'letters.second', { helpers }), 'b');
      assert.equal(expand({ letters: ['abc', 'def'] }, 'letters.second', { helpers }), 'def');
      assert.equal(expand({ letters: ['abc', 'def'] }, 'letters.second[0]', { helpers }), 'd');
    });
  });

  describe('array access', () => {
    it('should get array element by index', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[0]'), 'a');
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[1]'), 'b');
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[2]'), 'c');
    });

    it('should get array element by variable index', () => {
      const context = { items: ['a', 'b', 'c'], index: 1 };
      assert.equal(expand(context, 'items[index]'), 'b');
    });

    it('should get array element by computed index', () => {
      const context = { items: ['a', 'b', 'c'], index: 1 };
      assert.equal(expand(context, 'items[index + 1]'), 'c');
    });

    it('should get array element by nested variable index', () => {
      const context = { items: ['a', 'b', 'c'], nested: { index: 0 } };
      assert.equal(expand(context, 'items[nested.index]'), 'a');
    });

    it('should get array element by nested computed index', () => {
      const context = { items: ['a', 'b', 'c'], nested: { index: 1 } };
      assert.equal(expand(context, 'items[nested.index + 1]'), 'c');
    });

    it('should get end element by index', () => {
      const context = { items: ['a', 'b', 'c'] };
      assert.equal(expand(context, 'items[2]'), 'c');
    });

    it('should get end element by negative index', () => {
      const context = { items: ['a', 'b', 'c'] };
      assert.equal(expand(context, 'items[items.length - 1]'), 'c');
      assert.equal(expand(context, 'items[items.length - 2]'), 'b');
      assert.equal(expand(context, 'items[items.length - 3]'), 'a');
    });

    it('should get end element by computed index', () => {
      const context = { items: ['a', 'b', 'c'], end: 1 };
      assert.equal(expand(context, 'items[items.length - end]'), 'c');
    });

    it('should get first element by computed index', () => {
      const context = { items: ['a', 'b', 'c'], start: 2 };
      assert.equal(expand(context, 'items[items.length - start]'), 'b');
    });

    it('should support negative indices', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[-1]'), 'c');
    });
  });

  describe('array access failures', () => {
    it('should return undefined for out-of-bounds access', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[5]'), undefined);
    });

    it('should return undefined for non-integer indices', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[1.5]'), undefined);
    });

    it('should return undefined for negative indices beyond array bounds', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[-4]'), undefined);
    });

    it('should return undefined for non-numeric indices', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[foo]'), undefined);
    });

    it('should return undefined for empty brackets', () => {
      assert.equal(expand({ items: ['a', 'b', 'c'] }, 'items[]'), undefined);
    });

    it('should return undefined for out-of-bounds access with variable index', () => {
      const context = { items: ['a', 'b', 'c'], index: 5 };
      assert.equal(expand(context, 'items[index]'), undefined);
    });
  });

  describe('ruby tests', () => {
    it('test_variables (ruby liquid tests)', () => {
      const context = {};
      context['string'] = 'string';
      assert.equal('string', expand(context, 'string'));

      context['num'] = 5;
      assert.equal(5, expand(context, 'num'));

      context['time'] = Date.parse('2006-06-06 12:00:00');
      assert.equal(Date.parse('2006-06-06 12:00:00'), expand(context, 'time'));

      const time = new Date().getTime();
      context['date'] = time;
      assert.equal(time, expand(context, 'date'));

      const now = Date.now();
      context['datetime'] = now;
      assert.equal(now, expand(context, 'datetime'));

      context['bool'] = true;
      assert.equal(true, expand(context, 'bool'));

      context['bool'] = false;
      assert.equal(false, expand(context, 'bool'));

      context['null'] = null;
      assert.equal(expand(context, 'null'), null);
      assert.equal(expand(context, 'null'), null);
    });

    it('test_length_query (ruby liquid tests)', () => {
      const context = {};
      context['number'] = 500;
      context['numbers'] = [1, 2, 3, 4];
      context['letters'] = { a: 1, b: 2, c: 3, d: 4 };
      context['other'] = { 1: 1, 2: 2, 3: 3, 4: 4, length: 1000, size: 1000 };
      context['nil'] = {};

      assert.equal(3, expand(context, 'number.size'));
      assert.equal(3, expand(context, 'number.length'));

      assert.equal(0, expand(context, 'nil.size'));
      assert.equal(0, expand(context, 'nil.length'));

      assert.equal(4, expand(context, 'numbers.size'));
      assert.equal(4, expand(context, 'numbers.length'));

      assert.equal(1000, expand(context, 'other.size'));
      assert.equal(1000, expand(context, 'other.length'));

      context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4 };
      assert.equal(4, expand(context, 'numbers.size'));

      context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4, size: 1000 };
      assert.equal(1000, expand(context, 'numbers.size'));
    });
  });

  describe('edge cases', () => {
    it('proxy objects', () => {
      const target = { foo: { bar: 'correct' } };
      const handler = {
        get(target, prop) {
          return prop === 'foo' ? new Proxy(target.foo, handler) : target[prop];
        }
      };
      const proxy = new Proxy(target, handler);
      assert.equal(expand(proxy, 'foo.bar'), 'correct');
    });

    it('prototype pollution attempts', () => {
      const obj = {};
      // This should either return undefined or throw
      assert.equal(expand(obj, '__proto__.toString'), undefined);
      assert.equal(obj.toString, Object.prototype.toString);
    });

    it('BigInt keys', () => {
      const obj = {
        big: {
          [BigInt(9007199254740991n)]: 'correct'
        }
      };
      // This might fail if BigInt keys aren't handled properly
      assert.equal(expand(obj, 'big[9007199254740991]'), 'correct');
    });

    it('revoked proxies gracefully', () => {
      const target = { foo: 'correct' };
      const { proxy, revoke } = Proxy.revocable(target, {});
      const result = expand(proxy, 'foo');
      assert.equal(result, 'correct');
      revoke();
      assert.throws(() => expand(proxy, 'foo'), TypeError);
    });

    it('objects with no prototype', () => {
      const obj = Object.create(null);
      obj.foo = { bar: 'correct' };
      assert.equal(expand(obj, 'foo.bar'), 'correct');
    });

    it('getters that throw', () => {
      const obj = {
        get throws() {
          throw new Error('boom');
        },
        nested: {
          get throws() {
            throw new Error('nested boom');
          }
        }
      };

      assert.throws(() => expand(obj, 'throws'), /boom/);
      assert.throws(() => expand(obj, 'nested.throws'), /nested boom/);
    });

    it('very long path segments', () => {
      const longKey = 'a'.repeat(10000);
      const obj = { [longKey]: 'correct' };
      assert.equal(expand(obj, longKey), 'correct');
    });

    it('array-like objects with negative indices', () => {
      const obj = {
        '-1': 'correct',
        'length': 5
      };
      // This might fail if array-like object handling isn't robust
      assert.equal(expand(obj, '[-1]'), 'correct');
    });

    it('frozen objects', () => {
      const frozen = Object.freeze({
        foo: Object.freeze({ bar: 'correct' })
      });
      assert.equal(expand(frozen, 'foo.bar'), 'correct');
    });

    it('non-configurable properties', () => {
      const obj = {};
      Object.defineProperty(obj, 'locked', {
        configurable: false,
        enumerable: true,
        value: 'correct'
      });
      assert.equal(expand(obj, 'locked'), 'correct');
    });

    it('sparse arrays', () => {
      const sparse = [];
      sparse[0] = 'start';
      sparse[999999] = 'end';
      assert.equal(expand(sparse, '999999'), 'end');
      assert.equal(expand(sparse, '1'), undefined);
    });

    it('exotic number keys', () => {
      const obj = {
        [-0]: 'negative zero',
        [NaN]: 'not a number',
        [Infinity]: 'infinity',
        [-Infinity]: 'negative infinity'
      };

      assert.equal(expand(obj, '[-0]'), 'negative zero');
      assert.equal(expand(obj, '[NaN]'), 'not a number');
      assert.equal(expand(obj, '[Infinity]'), 'infinity');
      assert.equal(expand(obj, '[-Infinity]'), 'negative infinity');
    });
  });
});
