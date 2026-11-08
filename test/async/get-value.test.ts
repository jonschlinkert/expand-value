/**
 * Unit tests from jonschlinkert/get-value
 * MIT License
 */

import assert from 'node:assert/strict';
import expand from '~/async/expand';

describe('async expand', () => {
  it('should return non-object when given as the first argument', async () => {
    assert.deepStrictEqual(await expand(null), null);
    assert.deepStrictEqual(await expand('foo'), 'foo');
    assert.deepStrictEqual(await expand(['a']), ['a']);
  });

  it('should expand a value', async () => {
    assert.deepStrictEqual(await expand({ a: 'a', b: { c: 'd' } }, 'a'), 'a');
    assert.deepStrictEqual(await expand({ a: 'a', b: { c: 'd' } }, 'b.c'), 'd');
    assert.deepStrictEqual(await expand({ foo: 'bar' }, 'foo.bar'), undefined);
  });

  it('should expand a property that has dots in the key', async () => {
    assert.deepStrictEqual(await expand({ 'a.b': 'c' }, 'a.b'), 'c');
  });

  it('should support using dot notation to expand nested values', async () => {
    const fixture = {
      a: { locals: { name: { first: 'Brian' } } },
      b: { locals: { name: { last: 'Woodward' } } },
      c: { locals: { paths: ['a.txt', 'b.js', 'c.hbs'] } }
    };
    assert.deepStrictEqual(await expand(fixture, 'a.locals.name'), { first: 'Brian' });
    assert.deepStrictEqual(await expand(fixture, 'b.locals.name'), { last: 'Woodward' });
    assert.strictEqual(await expand(fixture, 'b.locals.name.last'), 'Woodward');
    assert.strictEqual(await expand(fixture, 'c.locals.paths.0'), 'a.txt');
    assert.strictEqual(await expand(fixture, 'c.locals.paths.1'), 'b.js');
    assert.strictEqual(await expand(fixture, 'c.locals.paths.2'), 'c.hbs');
  });

  it('should support a custom separator on options.separator', async () => {
    const fixture = { 'a.b': { c: { d: 'e' } } };
    assert.strictEqual(await expand(fixture, 'a.b/c/d', { separator: '/' }), 'e');
    assert.strictEqual(await expand(fixture, 'a\\.b.c.d', { separator: /\\?\./ }), 'e');
  });

  it('should support a default value as the last argument', async () => {
    const fixture = { foo: { c: { d: 'e' } } };
    assert.equal(await expand(fixture, 'foo.bar.baz', 'quz'), 'quz');
    assert.equal(await expand(fixture, 'foo.bar.baz', true), true);
    assert.equal(await expand(fixture, 'foo.bar.baz', false), false);
    assert.equal(await expand(fixture, 'foo.bar.baz', null), null);
  });

  it('should support options.default', async () => {
    const fixture = { foo: { c: { d: 'e' } } };
    assert.equal(await expand(fixture, 'foo.bar.baz', { default: 'qux' }), 'qux');
    assert.equal(await expand(fixture, 'foo.bar.baz', { default: true }), true);
    assert.equal(await expand(fixture, 'foo.bar.baz', { default: false }), false);
    assert.equal(await expand(fixture, 'foo.bar.baz', { default: null }), null);
    assert.deepStrictEqual(await expand(fixture, 'foo.bar.baz', { default: { one: 'two' } }), { one: 'two' });
  });

  it('should support a custom function for validating the object', async () => {
    const isEnumerable = Object.prototype.propertyIsEnumerable;
    const options = {
      isValid(key, obj) {
        return obj[key] === undefined || isEnumerable.call(obj, key);
      }
    };

    const fixture = { 'a.b': { c: { d: 'e' } } };
    assert.strictEqual(await expand(fixture, 'a.b.c.d', options), 'e');
  });

  it('should support nested keys with dots', async () => {
    assert.strictEqual(await expand({ 'a.b.c': 'd' }, 'a.b.c'), 'd');
    assert.strictEqual(await expand({ 'a.b': { c: 'd' } }, 'a.b.c'), 'd');
    assert.strictEqual(await expand({ 'a.b': { c: { d: 'e' } } }, 'a.b.c.d'), 'e');
    assert.strictEqual(await expand({ a: { b: { c: 'd' } } }, 'a.b.c'), 'd');
    assert.strictEqual(await expand({ a: { 'b.c': 'd' } }, 'a.b.c'), 'd');
    assert.strictEqual(await expand({ 'a.b.c.d': 'e' }, 'a.b.c.d'), 'e');
    assert.strictEqual(await expand({ 'a.b.c.d': 'e' }, 'a.b.c'), undefined);

    assert.strictEqual(await expand({ 'a.b.c.d.e.f': 'g' }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b.c.d': { e: { f: 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b.c': { d: { e: { f: 'g' } } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b': { c: { d: { e: { f: 'g' } } } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { b: { c: { d: { e: { f: 'g' } } } } } }, 'a.b.c.d.e.f'), 'g');

    assert.deepStrictEqual(await expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e'), { f: 'g' });
    assert.deepStrictEqual(await expand({ 'a.b.c.d': { 'e.f': 'g' } }, 'a.b.c.d.e'), undefined);
    assert.deepStrictEqual(await expand({ 'a.b.c': { 'd.e.f': 'g' } }, 'a.b.c'), { 'd.e.f': 'g' });
    assert.deepStrictEqual(await expand({ 'a.b': { 'c.d.e.f': 'g' } }, 'a.b'), { 'c.d.e.f': 'g' });
    assert.deepStrictEqual(await expand({ a: { 'b.c.d.e.f': 'g' } }, 'a'), { 'b.c.d.e.f': 'g' });

    assert.strictEqual(await expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b.c.d': { 'e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b.c': { 'd.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b': { 'c.d.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { 'b.c.d.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');

    assert.strictEqual(await expand({ 'a.b': { 'c.d': { 'e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ 'a.b': { c: { 'd.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { 'b.c.d.e': { f: 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { 'b.c.d': { 'e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { 'b.c': { 'd.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(await expand({ a: { b: { 'c.d.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
  });

  it('should support return default when options.isValid returns false', async () => {
    const fixture = { foo: { 'bar': { baz: 'qux' }, 'a.b.c': 'xyx', 'yyy': 'zzz' } };
    const options = val => {
      return { default: val, isValid: prop => prop !== 'bar' && prop !== 'a.b.c' };
    };

    assert.equal(await expand(fixture, 'foo.bar.baz', options('fez')), 'fez');
    assert.equal(await expand(fixture, 'foo.bar.baz', options(true)), true);
    assert.equal(await expand(fixture, 'foo.bar.baz', options(false)), false);
    assert.equal(await expand(fixture, 'foo.bar.baz', options(null)), null);

    assert.equal(await expand(fixture, 'foo.a.b.c', options('fez')), 'fez');
    assert.equal(await expand(fixture, 'foo.a.b.c', options(true)), true);
    assert.equal(await expand(fixture, 'foo.a.b.c', options(false)), false);
    assert.equal(await expand(fixture, 'foo.a.b.c', options(null)), null);

    assert.equal(await expand(fixture, 'foo.yyy', options('fez')), 'zzz');
  });

  it('should expand a value from an array', async () => {
    const fixture = {
      a: { paths: ['a.txt', 'a.js', 'a.hbs'] },
      b: {
        paths: {
          '0': 'b.txt',
          '1': 'b.js',
          '2': 'b.hbs',
          3: 'b3.hbs'
        }
      }
    };
    assert.strictEqual(await expand(fixture, 'a.paths.0'), 'a.txt');
    assert.strictEqual(await expand(fixture, 'a.paths.1'), 'a.js');
    assert.strictEqual(await expand(fixture, 'a.paths.2'), 'a.hbs');

    assert.strictEqual(await expand(fixture, 'b.paths.0'), 'b.txt');
    assert.strictEqual(await expand(fixture, 'b.paths.1'), 'b.js');
    assert.strictEqual(await expand(fixture, 'b.paths.2'), 'b.hbs');
    assert.strictEqual(await expand(fixture, 'b.paths.3'), 'b3.hbs');
  });

  it('should expand a value from an object in an array', async () => {
    assert.strictEqual(await expand({ a: { b: [{ c: 'd' }] } }, 'a.b.0.c'), 'd');
    assert.strictEqual(await expand({ a: { b: [{ c: 'd' }, { e: 'f' }] } }, 'a.b.1.e'), 'f');
  });

  it('should return `undefined` if the path is not found', async () => {
    const fixture = { a: { b: {} } };
    assert.strictEqual(await expand(fixture, 'a.b.c'), undefined);
    assert.strictEqual(await expand(fixture, 'a.b.c.d'), undefined);
  });

  it('should expand the specified property', async () => {
    assert.deepStrictEqual(await expand({ a: 'aaa', b: 'b' }, 'a'), 'aaa');
    assert.deepStrictEqual(await expand({ first: 'Jon', last: 'Schlinkert' }, 'first'), 'Jon');
    assert.deepStrictEqual(await expand({ locals: { a: 'a' }, options: { b: 'b' } }, 'locals'), { a: 'a' });
  });

  it('should support passing a property formatted as an array', async () => {
    assert.deepStrictEqual(await expand({ a: 'aaa', b: 'b' }, ['a']), 'aaa');
    assert.deepStrictEqual(await expand({ a: { b: { c: 'd' } } }, ['a', 'b', 'c']), 'd');
    assert.deepStrictEqual(await expand({ first: 'Harry', last: 'Potter' }, ['first']), 'Harry');
    assert.deepStrictEqual(await expand({ locals: { a: 'a' }, options: { b: 'b' } }, ['locals']), { a: 'a' });
  });

  it('should support escaped dots', async () => {
    assert.deepStrictEqual(await expand({ 'a.b': 'a', 'b': { c: 'd' } }, 'a\\.b'), 'a');
    assert.deepStrictEqual(await expand({ 'a.b': { b: { c: 'd' } } }, 'a\\.b.b.c'), 'd');
  });

  it('should expand the value of a deeply nested property', async () => {
    assert.strictEqual(await expand({ a: { b: 'c', c: { d: 'e', e: 'f', g: { h: 'i' } } } }, 'a.c.g.h'), 'i');
  });

  it('should return the entire object if no property is passed', async () => {
    assert.deepStrictEqual(await expand({ a: 'a', b: { c: 'd' } }), { a: 'a', b: { c: 'd' } });
  });
});

/**
 * These tests are from the "dot-prop" library
 */

describe('dot-prop tests', () => {
  it('should pass dot-prop tests', async () => {
    const f1 = { foo: { bar: 1 } };
    assert.deepStrictEqual(await expand(f1), f1);
    f1[''] = 'foo';
    assert.deepStrictEqual(await expand(f1, ''), 'foo');
    assert.deepStrictEqual(await expand(f1, 'foo'), f1.foo);
    assert.deepStrictEqual(await expand({ foo: 1 }, 'foo'), 1);
    assert.deepStrictEqual(await expand({ foo: null }, 'foo'), null);
    assert.deepStrictEqual(await expand({ foo: undefined }, 'foo'), undefined);
    assert.deepStrictEqual(await expand({ foo: { bar: true } }, 'foo.bar'), true);
    assert.deepStrictEqual(await expand({ foo: { bar: { baz: true } } }, 'foo.bar.baz'), true);
    assert.deepStrictEqual(await expand({ foo: { bar: { baz: null } } }, 'foo.bar.baz'), null);
    assert.deepStrictEqual(await expand({ '\\': true }, '\\'), true);
    assert.deepStrictEqual(await expand({ '\\foo': true }, '\\foo'), true);
    assert.deepStrictEqual(await expand({ 'bar\\': true }, 'bar\\'), true);
    assert.deepStrictEqual(await expand({ 'foo\\bar': true }, 'foo\\bar'), true);
    assert.deepStrictEqual(await expand({ '\\.foo': true }, '\\\\.foo'), true);
    assert.deepStrictEqual(await expand({ 'bar\\.': true }, 'bar\\\\.'), true);
    assert.deepStrictEqual(await expand({ 'foo\\.bar': true }, 'foo\\\\.bar'), true);
    assert.deepStrictEqual(await expand({ foo: 1 }, 'foo.bar'), undefined);

    function fn() {}
    fn.foo = { bar: 1 };
    assert.deepStrictEqual(await expand(fn), fn);
    assert.deepStrictEqual(await expand(fn, 'foo'), fn.foo);
    assert.deepStrictEqual(await expand(fn, 'foo.bar'), 1);

    const f3 = { foo: null };
    assert.deepStrictEqual(await expand(f3, 'foo.bar'), undefined);
    assert.deepStrictEqual(await expand(f3, 'foo.bar', 'some value'), 'some value');

    assert.deepStrictEqual(await expand({ 'foo.baz': { bar: true } }, 'foo\\.baz.bar'), true);
    assert.deepStrictEqual(await expand({ 'fo.ob.az': { bar: true } }, 'fo\\.ob\\.az.bar'), true);

    assert.deepStrictEqual(await expand(null, 'foo.bar', false), false);
    assert.deepStrictEqual(await expand('foo', 'foo.bar', false), false);
    assert.deepStrictEqual(await expand([], 'foo.bar', false), false);
    assert.deepStrictEqual(await expand(undefined, 'foo.bar', false), false);
  });

  it('should use a custom options.isValid function', async () => {
    const isEnumerable = Object.prototype.propertyIsEnumerable;
    const options = {
      isValid: (key, obj) => isEnumerable.call(obj, key)
    };

    const target = {};
    Object.defineProperty(target, 'foo', {
      value: 'bar',
      enumerable: false
    });

    assert.deepStrictEqual(await expand(target, 'foo', options), undefined);
    assert.deepStrictEqual(await expand({}, 'hasOwnProperty', options), undefined);
  });

  it('should return a default value', async () => {
    assert.deepStrictEqual(await expand({ foo: { bar: 'a' } }, 'foo.fake'), undefined);
    assert.deepStrictEqual(await expand({ foo: { bar: 'a' } }, 'foo.fake.fake2'), undefined);
    assert.deepStrictEqual(await expand({ foo: { bar: 'a' } }, 'foo.fake.fake2', 'some value'), 'some value');
  });

  it('should pass all of the dot-prop tests', async () => {
    const f1 = { foo: { bar: 1 } };
    assert.deepStrictEqual(await expand(f1), f1);
    assert.deepStrictEqual(await expand(f1, 'foo'), f1.foo);
    assert.deepStrictEqual(await expand({ foo: 1 }, 'foo'), 1);
    assert.deepStrictEqual(await expand({ foo: null }, 'foo'), null);
    assert.deepStrictEqual(await expand({ foo: undefined }, 'foo'), undefined);
    assert.deepStrictEqual(await expand({ foo: { bar: true } }, 'foo.bar'), true);
    assert.deepStrictEqual(await expand({ foo: { bar: { baz: true } } }, 'foo.bar.baz'), true);
    assert.deepStrictEqual(await expand({ foo: { bar: { baz: null } } }, 'foo.bar.baz'), null);
    assert.deepStrictEqual(await expand({ foo: { bar: 'a' } }, 'foo.fake.fake2'), undefined);
  });
});

/**
 * These tests are from the "object-path" library
 */

describe('object-path .expand tests', () => {
  function getTestObj() {
    return {
      a: 'b',
      b: {
        c: [],
        d: ['a', 'b'],
        e: [{}, { f: 'g' }],
        f: 'i'
      }
    };
  }

  it('should return the value using unicode key', async () => {
    const obj = { '15\u00f8C': { '3\u0111': 1 } };
    assert.equal(await expand(obj, '15\u00f8C.3\u0111'), 1);
    assert.equal(await expand(obj, ['15\u00f8C', '3\u0111']), 1);
  });

  it('should return the value using dot in key (with array of segments)', async () => {
    const obj = { 'a.b': { 'looks.like': 1 } };
    assert.equal(await expand(obj, ['a.b', 'looks.like']), 1);
  });

  // object-path fails this test
  it('should return the value using dot in key', async () => {
    const obj = { 'a.b': { 'looks.like': 1 } };
    assert.equal(await expand(obj, 'a.b.looks.like'), 1);
  });

  it('should return the value under shallow object', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'a'), 'b');
    assert.equal(await expand(obj, ['a']), 'b');
  });

  it('should work with number path', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj.b.d, 0), 'a');
    assert.equal(await expand(obj.b, 0), undefined);
  });

  it('should return the value under deep object', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'b.f'), 'i');
    assert.equal(await expand(obj, ['b', 'f']), 'i');
  });

  it('should return the value under array', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'b.d.0'), 'a');
    assert.equal(await expand(obj, ['b', 'd', 0]), 'a');
  });

  it('should return the value under array deep', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'b.e.1.f'), 'g');
    assert.equal(await expand(obj, ['b', 'e', 1, 'f']), 'g');
  });

  it('should return undefined for missing values under object', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'a.b'), undefined);
    assert.equal(await expand(obj, ['a', 'b']), undefined);
  });

  it('should return undefined for missing values under array', async () => {
    const obj = getTestObj();
    assert.equal(await expand(obj, 'b.d.5'), undefined);
    assert.equal(await expand(obj, ['b', 'd', '5']), undefined);
  });

  it('should return the value under integer-like key', async () => {
    const obj = { '1a': 'foo' };
    assert.equal(await expand(obj, '1a'), 'foo');
    assert.equal(await expand(obj, ['1a']), 'foo');
  });

  it('should return the default value when the key doesnt exist', async () => {
    const obj = { '1a': 'foo' };
    assert.equal(await expand(obj, '1b', null), null);
    assert.equal(await expand(obj, ['1b'], null), null);
  });

  // this test differs from behavior in object-path. I was unable to figure
  // out exactly how the default values work in object-path.
  it('should return the default value when path is empty', async () => {
    const obj = { '1a': 'foo' };
    assert.deepStrictEqual(await expand(obj, '', null), null);
    assert.deepStrictEqual(await expand(obj, []), undefined);
    assert.equal(await expand({}, ['1'], 'foo'), 'foo');
  });

  it('should return the default value when object is null or undefined', async () => {
    assert.deepStrictEqual(await expand(null, 'test', 'a'), 'a');
    assert.deepStrictEqual(await expand(undefined, 'test', 'a'), 'a');
  });

  it('should not fail on an object with a null prototype', async () => {
    const foo = 'FOO';
    const obj = Object.create(null);
    obj.foo = foo;
    assert.equal(await expand(obj, 'foo'), foo);
  });

  // this differs from object-path, which does not allow
  // the user to expand non-own properties for some reason.
  it('should expand non-"own" properties', async () => {
    class Base {
      constructor() {
        this.one = { two: true };
      }
    }

    class Extended extends Base {}
    const extended = new Extended();
    assert.equal(await expand(extended, ['one', 'two']), true);
    extended.enabled = true;

    assert.equal(await expand(extended, 'enabled'), true);
    assert.deepStrictEqual(await expand(extended, 'one'), { two: true });
  });
});

describe('deep-property unit tests', () => {
  it('should handle invalid input', async () => {
    const a = undefined;
    const b = {};

    assert.equal(await expand(a, 'sample'), undefined);
    assert.deepStrictEqual(await expand(b, undefined), {});
    assert.deepStrictEqual(await expand(b, ''), undefined);
    assert.deepStrictEqual(await expand(b, '...'), undefined);
  });

  it('should expand shallow properties', async () => {
    const fn = () => {};
    const a = {
      sample: 'string',
      example: fn,
      unknown: undefined
    };

    assert.equal(await expand(a, 'example'), fn);
    assert.equal(await expand(a, 'sample'), 'string');
    assert.equal(await expand(a, 'unknown'), undefined);
    assert.equal(await expand(a, 'invalid'), undefined);
  });

  it('should expand deep properties', async () => {
    const a = {
      b: { example: { type: 'vegetable' } },
      c: { example: { type: 'mineral' } }
    };

    assert.equal(await expand(a, 'b.example.type'), 'vegetable');
    assert.equal(await expand(a, 'c.example.type'), 'mineral');
    assert.equal(await expand(a, 'c.gorky.type'), undefined);
  });

  it('should expand properties on non-objects', async () => {
    const fn = () => {};

    // the commented out lines are from from the "deep-property" lib,
    // but it's invalid javascript. This is a good example of why it's always
    // better to use "use strict" (and lint your code).

    const str = 'An example string';
    const num = 42;

    fn.path = { to: { property: 'string' } };
    // str.path = { to: { property: 'string' } };
    // num.path = { to: { property: 'string' } };

    assert.equal(await expand(fn, 'path.to.property'), 'string');
    assert.equal(await expand(str, 'path.to.property'), undefined);
    assert.equal(await expand(num, 'path.to.property'), undefined);
  });
});
