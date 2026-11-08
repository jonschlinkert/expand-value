import assert from 'node:assert/strict';
import expand from '~/async/expand';

const data = {
  product: { variants: [{ title: 'draft151cm' }, { title: 'element151cm' }] }
};

describe('async expand', () => {
  describe('nested promises', () => {
    const data = {
      config: Promise.resolve({ theme: 'dark' }),
      themes: Promise.resolve({
        dark: Promise.resolve({ background: 'black', text: 'white' }),
        light: Promise.resolve({ background: 'white', text: 'black' })
      }),
      setting: Promise.resolve('theme')
    };

    it('should resolve a promised property', async () => {
      assert.equal(await expand(data, 'setting'), 'theme');
    });

    it('should resolve nested computed property names with promises', async () => {
      assert.equal(await expand(data, 'config[setting]'), 'dark');
      assert.deepEqual(await expand(data, 'themes[config[setting]]'), { background: 'black', text: 'white' });
      assert.equal(await expand(data, 'themes[config[setting]].background'), 'black');
      assert.equal(await expand(data, 'themes[config[setting]].text'), 'white');
    });
  });

  describe('nested async functions', () => {
    const data = {
      config: async () => ({ theme: 'dark' }),
      themes: async () => ({
        dark: async () => ({ background: 'black', text: 'white' }),
        light: async () => ({ background: 'white', text: 'black' })
      }),
      setting: async () => 'theme'
    };

    const options = {
      resolve: async (_target, _prop, value) => (typeof value === 'function' ? value() : value)
    };

    it('should resolve a promised property', async () => {
      assert.equal(await expand(data, 'setting', options), 'theme');
    });

    it('should resolve nested computed property names with promises', async () => {
      assert.equal(await expand(data, 'config[setting]', options), 'dark');
      assert.deepEqual(await expand(data, 'themes[config[setting]]', options), { background: 'black', text: 'white' });
      assert.equal(await expand(data, 'themes[config[setting]].background', options), 'black');
      assert.equal(await expand(data, 'themes[config[setting]].text', options), 'white');
    });

    it('should resolve dot-notation when every nested property is an async function', async () => {
      const data = {
        a: async () => ({
          b: async () => ({
            c: async () => ({
              d: async () => 'correct'
            })
          })
        })
      };

      assert.equal(await expand(data, 'a.b.c.d', options), 'correct');
    });

    it('should resolve dot-notation with nested promises and async functions', async () => {
      const data = {
        a: Promise.resolve({
          b: async () =>
            Promise.resolve({
              c: Promise.resolve({
                d: async () => Promise.resolve('correct')
              })
            })
        })
      };

      assert.equal(await expand(data, 'a.b.c.d', options), 'correct');
    });
  });

  describe('symbols', () => {
    it('should get a symbol', async () => {
      const foo = Symbol('foo');
      assert.equal(await expand({ [foo]: 'correct' }, foo), 'correct');
    });

    it('nested symbol properties', async () => {
      const nested = Symbol('nested');
      const deep = Symbol('deep');

      const obj = {
        foo: {
          [nested]: {
            [deep]: 'correct'
          }
        }
      };

      assert.equal(await expand(obj, `foo[${nested.toString()}][${deep.toString()}]`), 'correct');
    });
  });

  describe('properties', () => {
    it('should get a property', async () => {
      assert.equal(await expand({ foo: 'correct' }, 'foo'), 'correct');
    });

    it('should get a direct key from a Map', async () => {
      assert.equal(await expand(new Map([['foo', 'correct']]), 'foo'), 'correct');
    });

    it('should get nested keys from Maps', async () => {
      const data = new Map([['foo', new Map([['bar', Promise.resolve('correct')]])]]);
      assert.equal(await expand(data, 'foo.bar'), 'correct');
    });

    it('should get values from an object exposing a get function', async () => {
      const data = {
        async get(key) {
          return key === 'foo' ? { bar: Promise.resolve('correct') } : undefined;
        }
      };

      assert.equal(await expand(data, 'foo.bar'), 'correct');
    });
  });

  describe('resolve option', () => {
    it('should resolve direct property reads', async () => {
      const data = { name: 'ada' };
      const calls = [];
      const options = {
        resolve(target, prop, value, state) {
          calls.push({ target, prop, value, state });
          return typeof value === 'string' ? value.toUpperCase() : undefined;
        }
      };

      assert.equal(await expand(data, 'name', options), 'ADA');
      assert.deepEqual(calls, [{ target: data, prop: 'name', value: 'ada', state: { segments: ['name'], index: 0 } }]);
    });

    it('should resolve nested dot path reads', async () => {
      const calls = [];
      const data = { user: { name: 'ada' } };
      const options = {
        resolve(_target, prop, value) {
          calls.push(prop);
          return typeof value === 'string' ? value.toUpperCase() : undefined;
        }
      };

      assert.equal(await expand(data, 'user.name', options), 'ADA');
      assert.deepEqual(calls, ['user', 'name']);
    });

    it('should resolve parsed bracket path reads', async () => {
      const data = { items: ['a', 'b', 'c'], index: 1 };
      const options = {
        resolve(_target, prop, value) {
          return prop === 1 ? value.toUpperCase() : value;
        }
      };

      assert.equal(await expand(data, 'items[index]', options), 'B');
    });

    it('should resolve range reads', async () => {
      const data = { items: ['a', 'b', 'c'] };
      const options = {
        resolve(_target, prop, value) {
          return typeof prop === 'number' ? `${prop}:${value}` : value;
        }
      };

      assert.deepEqual(await expand(data, 'items[0..2]', options), ['0:a', '1:b', '2:c']);
    });

    it('should keep the raw value when resolve returns null or undefined', async () => {
      assert.equal(await expand({ name: 'correct' }, 'name', { resolve: () => null }), 'correct');
      assert.equal(await expand({ name: 'correct' }, 'name', { resolve: () => undefined }), 'correct');
    });
  });

  describe('nested properties', () => {
    it('should get a nested property', async () => {
      assert.equal(await expand({ foo: { bar: 'correct' } }, 'foo.bar'), 'correct');
      assert.equal(await expand({ foo: { bar: 'wrong' } }, 'foo.other.bar'), undefined);
      assert.equal(await expand({ foo: { bar: 'wrong' } }, 'foo.first.bar'), undefined);
    });

    it('should throw when missing and options.strict is true', async () => {
      await assert.rejects(() => expand({ foo: { bar: 'wrong' } }, 'foo.other.bar', { strict: true }), /Variable/);
      await assert.rejects(() => expand({ foo: { bar: 'wrong' } }, 'foo.first.bar', { strict: true }), /Variable/);
    });
  });

  describe('numerical keys', () => {
    it('should get value when key is an integer', async () => {
      assert.equal(await expand({ context: 'wrong' }, 'context["10"]'), undefined);
      assert.equal(await expand({ context: { 10: 'correct' } }, 'context["10"]'), 'correct');
    });

    it('should get value when key is a float', async () => {
      assert.equal(await expand({ context: 'wrong' }, 'context["10.2232"]'), undefined);
      assert.equal(await expand({ context: { 10.2232: 'correct' } }, 'context["10.2232"]'), 'correct');
    });
  });

  describe('escaped dots', () => {
    it('should expand foo\\.bar', async () => {
      assert.equal(await expand({ 'foo.bar': 'correct' }, 'foo\\.bar'), 'correct');
    });

    it('should expand foo\\.bar\\.baz', async () => {
      assert.equal(await expand({ 'foo.bar.baz': 'correct' }, 'foo\\.bar\\.baz'), 'correct');
    });

    it('should expand foo\\.bar.baz', async () => {
      assert.equal(await expand({ 'foo.bar': { baz: 'correct' } }, 'foo\\.bar.baz'), 'correct');
    });
  });

  describe('square brackets', () => {
    it('should expand foo["bar"]', async () => {
      assert.equal(await expand({ foo: { bar: 'correct' } }, 'foo["bar"]'), 'correct');
    });

    it('should expand foo["bar"].baz', async () => {
      assert.equal(await expand({ foo: { bar: { baz: 'correct' } } }, 'foo["bar"].baz'), 'correct');
    });

    it('should expand ranges in square brackets', async () => {
      const data = { items: ['a', 'b', 'c', 'd', 'e'] };
      assert.deepEqual(await expand(data, 'items[1..3]'), ['b', 'c', 'd']);
      assert.deepEqual(await expand(data, 'items[0..4]'), ['a', 'b', 'c', 'd', 'e']);
      assert.deepEqual(await expand(data, 'items[2..2]'), ['c']);
    });

    it('should get a property from each element in a range', async () => {
      const data = { items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }] };
      assert.deepEqual(await expand(data, 'items[1..3].name'), ['b', 'c', 'd']);
    });

    it('should keep a single-element range as an array after property access', async () => {
      const data = { items: [{ name: 'a' }, { name: 'b' }] };
      assert.deepEqual(await expand(data, 'items[1..1].name'), ['b']);
    });

    it('should select all array elements with a wildcard', async () => {
      const data = { items: ['a', 'b', 'c'] };
      assert.deepEqual(await expand(data, 'items[*]'), ['a', 'b', 'c']);
    });

    it('should get a property from each wildcard-selected element', async () => {
      const data = { items: [{ foo: 0 }, { foo: false }, { foo: '' }, { foo: null }] };
      assert.deepEqual(await expand(data, 'items[*].foo'), [0, false, '', null]);
    });

    it('should resolve multiple properties after a range', async () => {
      const data = { items: [{ foo: { bar: 'a' } }, { foo: { bar: 'b' } }] };
      assert.deepEqual(await expand(data, 'items[0..1].foo.bar'), ['a', 'b']);
    });

    it('should resolve multiple properties after a wildcard', async () => {
      const data = { items: [{ foo: { bar: 'a' } }, { foo: { bar: 'b' } }] };
      assert.deepEqual(await expand(data, 'items[*].foo.bar'), ['a', 'b']);
    });

    it('should resolve quoted properties after a selection', async () => {
      const data = { items: [{ 'display.name': 'Ada' }, { 'display.name': 'Grace' }] };
      assert.deepEqual(await expand(data, 'items[*]["display.name"]'), ['Ada', 'Grace']);
    });

    it('should resolve computed properties after a selection', async () => {
      const data = { key: 'name', items: [{ name: 'Ada' }, { name: 'Grace' }] };
      assert.deepEqual(await expand(data, 'items[*][key]'), ['Ada', 'Grace']);
    });

    it('should index each array returned by a selected property', async () => {
      const data = { items: [{ names: ['a', 'b'] }, { names: ['c', 'd'] }] };
      assert.deepEqual(await expand(data, 'items[*].names[0]'), ['a', 'c']);
    });

    it('should resolve negative indices within each selected array', async () => {
      const data = {
        items: [
          ['a', 'b'],
          ['c', 'd', 'e']
        ]
      };
      assert.deepEqual(await expand(data, 'items[*][-1]'), ['b', 'e']);
    });

    it('should access array properties without creating another selection', async () => {
      const data = { items: [{ names: ['a', 'b'] }, { names: ['c'] }] };
      assert.deepEqual(await expand(data, 'items[*].names.length'), [2, 1]);
    });

    it('should preserve nesting for repeated wildcards', async () => {
      const data = { groups: [{ items: [{ name: 'a' }, { name: 'b' }] }, { items: [] }, { items: [{ name: 'c' }] }] };
      assert.deepEqual(await expand(data, 'groups[*].items[*].name'), [['a', 'b'], [], ['c']]);
    });

    it('should apply a range separately within each wildcard selection', async () => {
      const data = {
        groups: [
          [{ name: 'a' }, { name: 'b' }],
          [{ name: 'c' }, { name: 'd' }]
        ]
      };
      assert.deepEqual(await expand(data, 'groups[*][0..1].name'), [
        ['a', 'b'],
        ['c', 'd']
      ]);
    });

    it('should apply a wildcard within each range-selected element', async () => {
      const data = { groups: [[], [{ name: 'a' }], [{ name: 'b' }, { name: 'c' }]] };
      assert.deepEqual(await expand(data, 'groups[1..2][*].name'), [['a'], ['b', 'c']]);
    });

    it('should return an empty array when projecting an empty selection', async () => {
      assert.deepEqual(await expand({ items: [] }, 'items[*].foo.bar'), []);
    });

    it('should retain undefined entries for missing selected properties', async () => {
      const data = { items: [{ name: 'a' }, {}, { name: 'c' }] };
      assert.deepEqual(await expand(data, 'items[*].name'), ['a', undefined, 'c']);
    });

    it('should retain undefined entries for missing intermediate properties', async () => {
      const data = { items: [{ foo: { bar: 'a' } }, {}, { foo: { bar: 'c' } }] };
      assert.deepEqual(await expand(data, 'items[*].foo.bar'), ['a', undefined, 'c']);
    });

    it('should preserve holes in a range selection', async () => {
      const items = Array(5);
      items[1] = 'a';
      items[3] = 'b';
      const expected = Array(3);
      expected[0] = 'a';
      expected[2] = 'b';
      assert.deepEqual(await expand({ items }, 'items[1..3]'), expected);
    });

    it('should preserve holes when projecting a range', async () => {
      const items = Array(5);
      items[1] = { name: 'a' };
      items[3] = { name: 'b' };
      const expected = Array(3);
      expected[0] = 'a';
      expected[2] = 'b';
      assert.deepEqual(await expand({ items }, 'items[1..3].name'), expected);
    });

    it('should distinguish wildcard-selected holes from explicit undefined entries', async () => {
      const items = Array(5);
      items[1] = { name: 'a' };
      items[2] = undefined;
      items[3] = {};
      const expected = Array(5);
      expected[1] = 'a';
      expected[2] = undefined;
      expected[3] = undefined;
      assert.deepEqual(await expand({ items }, 'items[*].name'), expected);
    });

    it('should preserve holes at each nested selection depth', async () => {
      const groups = Array(3);
      groups[1] = Array(2);
      groups[1][1] = { name: 'a' };
      const expected = Array(3);
      expected[1] = Array(2);
      expected[1][1] = 'a';
      assert.deepEqual(await expand({ groups }, 'groups[*][*].name'), expected);
    });

    it('should resolve helpers separately for selected values', async () => {
      const data = { items: [{ name: 'ada' }, { name: 'grace' }] };
      const helpers = { uppercase: value => value.toUpperCase() };
      assert.deepEqual(await expand(data, 'items[*].name.uppercase', { helpers }), ['ADA', 'GRACE']);
    });

    it('should call resolve with each selected property owner', async () => {
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

      assert.deepEqual(await expand(data, 'items[*].name', options), ['ADA', 'GRACE']);
      assert.equal(targets[0], data.items[0]);
      assert.equal(targets[1], data.items[1]);
      assert.equal(targets.length, 2);
    });

    it('should treat a quoted asterisk as a property key', async () => {
      const data = { items: { '*': { name: 'literal' } } };
      assert.equal(await expand(data, 'items["*"].name'), 'literal');
    });

    it('should expand foo["bar"].name', async () => {
      assert.equal(await expand({ foo: { bar: { name: 'correct' } } }, 'foo["bar"].name'), 'correct');
    });

    it('should expand foo["bar"]["name"]', async () => {
      assert.equal(await expand({ foo: { bar: { name: 'correct' } } }, 'foo["bar"]["name"]'), 'correct');
    });

    it('should expand foo["bar"][0]', async () => {
      assert.equal(await expand({ foo: { bar: ['correct'] } }, 'foo["bar"][0]'), 'correct');
    });

    it('should expand foo["bar"][0][1]', async () => {
      assert.equal(await expand({ foo: { bar: [['wrong', 'correct']] } }, 'foo["bar"][0][1]'), 'correct');
    });

    it('should expand ranges in square brackets and get properties', async () => {
      const data = {
        items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }]
      };

      assert.deepEqual(await expand(data, 'items[1..3].name'), ['b', 'c', 'd']);
      assert.deepEqual(await expand(data, 'items[0..4].name'), ['a', 'b', 'c', 'd', 'e']);
      assert.deepEqual(await expand(data, 'items[2..2].name'), ['c']);
    });
  });

  describe('variable accessors', () => {
    it('should resolve nested computed property names', async () => {
      const context = {
        config: { theme: 'dark' },
        themes: {
          dark: { background: 'black', text: 'white' },
          light: { background: 'white', text: 'black' }
        },
        setting: 'theme'
      };

      assert.equal(await expand(context, 'setting'), 'theme');
      assert.equal(await expand(context, 'config[setting]'), 'dark');
      assert.deepEqual(await expand(context, 'themes[config[setting]]'), { background: 'black', text: 'white' });
      assert.equal(await expand(context, 'themes[config[setting]].background'), 'black');
      assert.equal(await expand(context, 'themes[config[setting]].text'), 'white');
    });

    it('should expand foo[bar]', async () => {
      assert.equal(
        await expand({ foo: { bar: 'wrong', whatever: 'correct' }, bar: 'whatever' }, 'foo[bar]'),
        'correct'
      );
    });

    it('should expand foo["bar"].baz[qux]', async () => {
      const data = { foo: { bar: { baz: { other: 'correct' } } }, qux: 'other' };
      assert.equal(await expand(data, 'foo["bar"].baz[qux]'), 'correct');
    });

    it('should expand products[var].first', async () => {
      const data = {
        var: 'tags',
        nested: { var: 'tags' },
        products: { count: 5, tags: ['correct-deepsnow', 'freestyle'] }
      };
      assert.equal(await expand(data, 'products[var].first'), 'correct-deepsnow');
    });

    it('should expand products[nested.var].last', async () => {
      const data = {
        var: 'tags',
        nested: { var: 'tags' },
        products: { count: 5, tags: ['deepsnow', 'correct-freestyle'] }
      };
      assert.equal(await expand(data, 'products[nested.var].last'), 'correct-freestyle');
    });
  });

  describe('array index', () => {
    it('should expand product.variants[0].title', async () => {
      assert.equal(await expand(data, 'product.variants[0].title'), 'draft151cm');
    });

    it('should expand product.variants[1].title', async () => {
      assert.equal(await expand(data, 'product.variants[1].title'), 'element151cm');
    });
  });

  describe('.first helper', () => {
    it('should expand .first when value is a string', async () => {
      assert.equal(await expand({ letters: 'abcde' }, 'letters.first'), 'a');
    });

    it('should expand .first when value is an object', async () => {
      assert.equal(await expand({ a: { b: { first: 'foo' } } }, 'a.b.first'), 'foo');
      assert.equal(await expand({ a: { b: { first: () => 'foo' } } }, 'a.b.first'), 'foo');
    });

    it('should expand .first when value is an array', async () => {
      assert.equal(await expand({ letters: ['a', 'b', 'c', 'd', 'e'] }, 'letters.first'), 'a');
    });

    it('should expand .first when value is a Set', async () => {
      assert.equal(await expand({ letters: new Set(['a', 'b', 'c', 'd', 'e']) }, 'letters.first'), 'a');
    });

    it('should get value when .first is an intermediate property', async () => {
      assert.equal(await expand(data, 'product.variants.first.title'), 'draft151cm');
    });

    it('should expand array.first', async () => {
      assert.equal(await expand({ array: ['correct', 'wrong'] }, 'array.first'), 'correct');
    });

    it('should expand hash["first"]', async () => {
      assert.equal(await expand({ hash: { first: 'correct' } }, 'hash["first"]'), 'correct');
    });

    it('should expand array["first"]', async () => {
      assert.equal(await expand({ array: ['wrong', 'wrong'] }, 'array["first"]'), undefined);
    });
  });

  describe('.last helper', () => {
    it('should expand .last when value is a string', async () => {
      assert.equal(await expand({ letters: 'abcde' }, 'letters.last'), 'e');
    });

    it('should expand .last when value is an object', async () => {
      assert.equal(await expand({ a: { b: { last: 'foo' } } }, 'a.b.last'), 'foo');
      assert.equal(await expand({ a: { b: { last: () => 'foo' } } }, 'a.b.last'), 'foo');
    });

    it('should expand .last when value is an array', async () => {
      assert.equal(await expand({ letters: ['a', 'b', 'c', 'd', 'e'] }, 'letters.last'), 'e');
    });

    it('should expand .last when value is a Set', async () => {
      assert.equal(await expand({ letters: new Set(['a', 'b', 'c', 'd', 'e']) }, 'letters.last'), 'e');
    });

    it('should get value when .last is an intermediate property', async () => {
      assert.equal(await expand(data, 'product.variants.last.title'), 'element151cm');
    });
  });

  describe('custom helpers', () => {
    it('should expand .last when value is a string', async () => {
      const helpers = { second: value => value[1] };
      assert.equal(await expand({ letters: 'abcde' }, 'letters.second', { helpers }), 'b');
      assert.equal(await expand({ letters: ['abc', 'def'] }, 'letters.second', { helpers }), 'def');
      assert.equal(await expand({ letters: ['abc', 'def'] }, 'letters.second[0]', { helpers }), 'd');
    });
  });

  describe('array access', () => {
    it('should get array element by index', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[0]'), 'a');
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[1]'), 'b');
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[2]'), 'c');
    });

    it('should get array element by variable index', async () => {
      const context = { items: ['a', 'b', 'c'], index: 1 };
      assert.equal(await expand(context, 'items[index]'), 'b');
    });

    it('should get array element by computed index', async () => {
      const context = { items: ['a', 'b', 'c'], index: 1 };
      assert.equal(await expand(context, 'items[index + 1]'), 'c');
    });

    it('should get array element by nested variable index', async () => {
      const context = { items: ['a', 'b', 'c'], nested: { index: 0 } };
      assert.equal(await expand(context, 'items[nested.index]'), 'a');
    });

    it('should get array element by nested computed index', async () => {
      const context = { items: ['a', 'b', 'c'], nested: { index: 1 } };
      assert.equal(await expand(context, 'items[nested.index + 1]'), 'c');
    });

    it('should get end element by index', async () => {
      const context = { items: ['a', 'b', 'c'] };
      assert.equal(await expand(context, 'items[2]'), 'c');
    });

    it('should get end element by negative index', async () => {
      const context = { items: ['a', 'b', 'c'] };
      assert.equal(await expand(context, 'items[items.length - 1]'), 'c');
      assert.equal(await expand(context, 'items[items.length - 2]'), 'b');
      assert.equal(await expand(context, 'items[items.length - 3]'), 'a');
    });

    it('should get end element by computed index', async () => {
      const context = { items: ['a', 'b', 'c'], end: 1 };
      assert.equal(await expand(context, 'items[items.length - end]'), 'c');
    });

    it('should get first element by computed index', async () => {
      const context = { items: ['a', 'b', 'c'], start: 2 };
      assert.equal(await expand(context, 'items[items.length - start]'), 'b');
    });

    it('should support negative indices', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[-1]'), 'c');
    });
  });

  describe('array access failures', () => {
    it('should return undefined for out-of-bounds access', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[5]'), undefined);
    });

    it('should return undefined for negative indices beyond array bounds', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[-4]'), undefined);
    });

    it('should return undefined for non-integer indices', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[1.5]'), undefined);
    });

    it('should return undefined for non-numeric indices', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[foo]'), undefined);
    });

    it('should return undefined for empty brackets', async () => {
      assert.equal(await expand({ items: ['a', 'b', 'c'] }, 'items[]'), undefined);
    });

    it('should return undefined for out-of-bounds access with variable index', async () => {
      const context = { items: ['a', 'b', 'c'], index: 5 };
      assert.equal(await expand(context, 'items[index]'), undefined);
    });
  });

  describe('ruby tests', () => {
    it('test_variables (ruby liquid tests)', async () => {
      const context = {};
      context['string'] = 'string';
      assert.equal('string', await expand(context, 'string'));

      context['num'] = 5;
      assert.equal(5, await expand(context, 'num'));

      context['time'] = Date.parse('2006-06-06 12:00:00');
      assert.equal(Date.parse('2006-06-06 12:00:00'), await expand(context, 'time'));

      const time = new Date().getTime();
      context['date'] = time;
      assert.equal(time, await expand(context, 'date'));

      const now = Date.now();
      context['datetime'] = now;
      assert.equal(now, await expand(context, 'datetime'));

      context['bool'] = true;
      assert.equal(true, await expand(context, 'bool'));

      context['bool'] = false;
      assert.equal(false, await expand(context, 'bool'));

      context['null'] = null;
      assert.equal(await expand(context, 'null'), null);
      assert.equal(await expand(context, 'null'), null);
    });

    it('test_length_query (ruby liquid tests)', async () => {
      const context = {};
      context['number'] = 500;
      context['numbers'] = [1, 2, 3, 4];
      context['letters'] = { a: 1, b: 2, c: 3, d: 4 };
      context['other'] = { 1: 1, 2: 2, 3: 3, 4: 4, length: 1000, size: 1000 };
      context['nil'] = {};

      assert.equal(3, await expand(context, 'number.size'));
      assert.equal(3, await expand(context, 'number.length'));

      assert.equal(0, await expand(context, 'nil.size'));
      assert.equal(0, await expand(context, 'nil.length'));

      assert.equal(4, await expand(context, 'numbers.size'));
      assert.equal(4, await expand(context, 'numbers.length'));

      assert.equal(1000, await expand(context, 'other.size'));
      assert.equal(1000, await expand(context, 'other.length'));

      context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4 };
      assert.equal(4, await expand(context, 'numbers.size'));

      context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4, size: 1000 };
      assert.equal(1000, await expand(context, 'numbers.size'));
    });
  });

  describe('edge cases', () => {
    it('proxy objects', async () => {
      const target = { foo: { bar: 'correct' } };
      const handler = {
        get(target, prop) {
          return prop === 'foo' ? new Proxy(target.foo, handler) : target[prop];
        }
      };
      const proxy = new Proxy(target, handler);
      assert.equal(await expand(proxy, 'foo.bar'), 'correct');
    });

    it('prototype pollution attempts', async () => {
      const obj = {};
      // This should either return undefined or throw
      assert.equal(await expand(obj, '__proto__.toString'), undefined);
      assert.equal(obj.toString, Object.prototype.toString);
    });

    it('BigInt keys', async () => {
      const obj = {
        big: {
          [BigInt(9007199254740991n)]: 'correct'
        }
      };
      // This might fail if BigInt keys aren't handled properly
      assert.equal(await expand(obj, 'big[9007199254740991]'), 'correct');
    });

    it('revoked proxies gracefully', async () => {
      const target = { foo: 'correct' };
      const { proxy, revoke } = Proxy.revocable(target, {});
      const result = await expand(proxy, 'foo');
      assert.equal(result, 'correct');
      revoke();
      await assert.rejects(() => expand(proxy, 'foo'), TypeError);
    });

    it('objects with no prototype', async () => {
      const obj = Object.create(null);
      obj.foo = { bar: 'correct' };
      assert.equal(await expand(obj, 'foo.bar'), 'correct');
    });

    it('getters that throw', async () => {
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

      await assert.rejects(() => expand(obj, 'throws'), /boom/);
      await assert.rejects(() => expand(obj, 'nested.throws'), /nested boom/);
    });

    it('very long path segments', async () => {
      const longKey = 'a'.repeat(10000);
      const obj = { [longKey]: 'correct' };
      assert.equal(await expand(obj, longKey), 'correct');
    });

    it('array-like objects with negative indices', async () => {
      const obj = {
        '-1': 'correct',
        'length': 5
      };
      // This might fail if array-like object handling isn't robust
      assert.equal(await expand(obj, '[-1]'), 'correct');
    });

    it('frozen objects', async () => {
      const frozen = Object.freeze({
        foo: Object.freeze({ bar: 'correct' })
      });
      assert.equal(await expand(frozen, 'foo.bar'), 'correct');
    });

    it('non-configurable properties', async () => {
      const obj = {};
      Object.defineProperty(obj, 'locked', {
        configurable: false,
        enumerable: true,
        value: 'correct'
      });
      assert.equal(await expand(obj, 'locked'), 'correct');
    });

    it('sparse arrays', async () => {
      const sparse = [];
      sparse[0] = 'start';
      sparse[999999] = 'end';
      assert.equal(await expand(sparse, '999999'), 'end');
      assert.equal(await expand(sparse, '1'), undefined);
    });

    it('exotic number keys', async () => {
      const obj = {
        [-0]: 'negative zero',
        [NaN]: 'not a number',
        [Infinity]: 'infinity',
        [-Infinity]: 'negative infinity'
      };

      assert.equal(await expand(obj, '[-0]'), 'negative zero');
      assert.equal(await expand(obj, '[NaN]'), 'not a number');
      assert.equal(await expand(obj, '[Infinity]'), 'infinity');
      assert.equal(await expand(obj, '[-Infinity]'), 'negative infinity');
    });
  });
});
