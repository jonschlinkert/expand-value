/**
 * Unit tests from jonschlinkert/get-value
 * MIT License
 */

import assert from 'node:assert/strict';
import expand from '~/expand';

describe('expand', () => {
  it('should return non-object when given as the first argument', () => {
    assert.deepStrictEqual(expand(null), null);
    assert.deepStrictEqual(expand('foo'), 'foo');
    assert.deepStrictEqual(expand(['a']), ['a']);
  });

  it('should expand a value', () => {
    assert.deepStrictEqual(expand({ a: 'a', b: { c: 'd' } }, 'a'), 'a');
    assert.deepStrictEqual(expand({ a: 'a', b: { c: 'd' } }, 'b.c'), 'd');
    assert.deepStrictEqual(expand({ foo: 'bar' }, 'foo.bar'), undefined);
  });

  it('should expand a property that has dots in the key', () => {
    assert.deepStrictEqual(expand({ 'a.b': 'c' }, 'a.b'), 'c');
  });

  it('should support using dot notation to expand nested values', () => {
    const fixture = {
      a: { locals: { name: { first: 'Brian' } } },
      b: { locals: { name: { last: 'Woodward' } } },
      c: { locals: { paths: ['a.txt', 'b.js', 'c.hbs'] } }
    };
    assert.deepStrictEqual(expand(fixture, 'a.locals.name'), { first: 'Brian' });
    assert.deepStrictEqual(expand(fixture, 'b.locals.name'), { last: 'Woodward' });
    assert.strictEqual(expand(fixture, 'b.locals.name.last'), 'Woodward');
    assert.strictEqual(expand(fixture, 'c.locals.paths.0'), 'a.txt');
    assert.strictEqual(expand(fixture, 'c.locals.paths.1'), 'b.js');
    assert.strictEqual(expand(fixture, 'c.locals.paths.2'), 'c.hbs');
  });

  it('should support a custom separator on options.separator', () => {
    const fixture = { 'a.b': { c: { d: 'e' } } };
    assert.strictEqual(expand(fixture, 'a.b/c/d', { separator: '/' }), 'e');
    assert.strictEqual(expand(fixture, 'a\\.b.c.d', { separator: /\\?\./ }), 'e');
  });

  it('should support a default value as the last argument', () => {
    const fixture = { foo: { c: { d: 'e' } } };
    assert.equal(expand(fixture, 'foo.bar.baz', 'quz'), 'quz');
    assert.equal(expand(fixture, 'foo.bar.baz', true), true);
    assert.equal(expand(fixture, 'foo.bar.baz', false), false);
    assert.equal(expand(fixture, 'foo.bar.baz', null), null);
  });

  it('should support options.default', () => {
    const fixture = { foo: { c: { d: 'e' } } };
    assert.equal(expand(fixture, 'foo.bar.baz', { default: 'qux' }), 'qux');
    assert.equal(expand(fixture, 'foo.bar.baz', { default: true }), true);
    assert.equal(expand(fixture, 'foo.bar.baz', { default: false }), false);
    assert.equal(expand(fixture, 'foo.bar.baz', { default: null }), null);
    assert.deepStrictEqual(expand(fixture, 'foo.bar.baz', { default: { one: 'two' } }), { one: 'two' });
  });

  it('should support a custom function for validating the object', () => {
    const isEnumerable = Object.prototype.propertyIsEnumerable;
    const options = {
      isValid(key, obj) {
        return obj[key] === undefined || isEnumerable.call(obj, key);
      }
    };

    const fixture = { 'a.b': { c: { d: 'e' } } };
    assert.strictEqual(expand(fixture, 'a.b.c.d', options), 'e');
  });

  it('should support nested keys with dots', () => {
    assert.strictEqual(expand({ 'a.b.c': 'd' }, 'a.b.c'), 'd');
    assert.strictEqual(expand({ 'a.b': { c: 'd' } }, 'a.b.c'), 'd');
    assert.strictEqual(expand({ 'a.b': { c: { d: 'e' } } }, 'a.b.c.d'), 'e');
    assert.strictEqual(expand({ a: { b: { c: 'd' } } }, 'a.b.c'), 'd');
    assert.strictEqual(expand({ a: { 'b.c': 'd' } }, 'a.b.c'), 'd');
    assert.strictEqual(expand({ 'a.b.c.d': 'e' }, 'a.b.c.d'), 'e');
    assert.strictEqual(expand({ 'a.b.c.d': 'e' }, 'a.b.c'), undefined);

    assert.strictEqual(expand({ 'a.b.c.d.e.f': 'g' }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b.c.d': { e: { f: 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b.c': { d: { e: { f: 'g' } } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b': { c: { d: { e: { f: 'g' } } } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { b: { c: { d: { e: { f: 'g' } } } } } }, 'a.b.c.d.e.f'), 'g');

    assert.deepStrictEqual(expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e'), { f: 'g' });
    assert.deepStrictEqual(expand({ 'a.b.c.d': { 'e.f': 'g' } }, 'a.b.c.d.e'), undefined);
    assert.deepStrictEqual(expand({ 'a.b.c': { 'd.e.f': 'g' } }, 'a.b.c'), { 'd.e.f': 'g' });
    assert.deepStrictEqual(expand({ 'a.b': { 'c.d.e.f': 'g' } }, 'a.b'), { 'c.d.e.f': 'g' });
    assert.deepStrictEqual(expand({ a: { 'b.c.d.e.f': 'g' } }, 'a'), { 'b.c.d.e.f': 'g' });

    assert.strictEqual(expand({ 'a.b.c.d.e': { f: 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b.c.d': { 'e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b.c': { 'd.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b': { 'c.d.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { 'b.c.d.e.f': 'g' } }, 'a.b.c.d.e.f'), 'g');

    assert.strictEqual(expand({ 'a.b': { 'c.d': { 'e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ 'a.b': { c: { 'd.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { 'b.c.d.e': { f: 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { 'b.c.d': { 'e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { 'b.c': { 'd.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
    assert.strictEqual(expand({ a: { b: { 'c.d.e.f': 'g' } } }, 'a.b.c.d.e.f'), 'g');
  });

  it('should support return default when options.isValid returns false', () => {
    const fixture = { foo: { bar: { baz: 'qux' }, 'a.b.c': 'xyx', yyy: 'zzz' } };
    const options = val => {
      return { default: val, isValid: prop => prop !== 'bar' && prop !== 'a.b.c' };
    };

    assert.equal(expand(fixture, 'foo.bar.baz', options('fez')), 'fez');
    assert.equal(expand(fixture, 'foo.bar.baz', options(true)), true);
    assert.equal(expand(fixture, 'foo.bar.baz', options(false)), false);
    assert.equal(expand(fixture, 'foo.bar.baz', options(null)), null);

    assert.equal(expand(fixture, 'foo.a.b.c', options('fez')), 'fez');
    assert.equal(expand(fixture, 'foo.a.b.c', options(true)), true);
    assert.equal(expand(fixture, 'foo.a.b.c', options(false)), false);
    assert.equal(expand(fixture, 'foo.a.b.c', options(null)), null);

    assert.equal(expand(fixture, 'foo.yyy', options('fez')), 'zzz');
  });

  it('should expand a value from an array', () => {
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
    assert.strictEqual(expand(fixture, 'a.paths.0'), 'a.txt');
    assert.strictEqual(expand(fixture, 'a.paths.1'), 'a.js');
    assert.strictEqual(expand(fixture, 'a.paths.2'), 'a.hbs');

    assert.strictEqual(expand(fixture, 'b.paths.0'), 'b.txt');
    assert.strictEqual(expand(fixture, 'b.paths.1'), 'b.js');
    assert.strictEqual(expand(fixture, 'b.paths.2'), 'b.hbs');
    assert.strictEqual(expand(fixture, 'b.paths.3'), 'b3.hbs');
  });

  it('should expand a value from an object in an array', () => {
    assert.strictEqual(expand({ a: { b: [{ c: 'd' }] } }, 'a.b.0.c'), 'd');
    assert.strictEqual(expand({ a: { b: [{ c: 'd' }, { e: 'f' }] } }, 'a.b.1.e'), 'f');
  });

  it('should return `undefined` if the path is not found', () => {
    const fixture = { a: { b: {} } };
    assert.strictEqual(expand(fixture, 'a.b.c'), undefined);
    assert.strictEqual(expand(fixture, 'a.b.c.d'), undefined);
  });

  it('should expand the specified property', () => {
    assert.deepStrictEqual(expand({ a: 'aaa', b: 'b' }, 'a'), 'aaa');
    assert.deepStrictEqual(expand({ first: 'Jon', last: 'Schlinkert' }, 'first'), 'Jon');
    assert.deepStrictEqual(expand({ locals: { a: 'a' }, options: { b: 'b' } }, 'locals'), { a: 'a' });
  });

  it('should support passing a property formatted as an array', () => {
    assert.deepStrictEqual(expand({ a: 'aaa', b: 'b' }, ['a']), 'aaa');
    assert.deepStrictEqual(expand({ a: { b: { c: 'd' } } }, ['a', 'b', 'c']), 'd');
    assert.deepStrictEqual(expand({ first: 'Harry', last: 'Potter' }, ['first']), 'Harry');
    assert.deepStrictEqual(expand({ locals: { a: 'a' }, options: { b: 'b' } }, ['locals']), { a: 'a' });
  });

  it('should support escaped dots', () => {
    assert.deepStrictEqual(expand({ 'a.b': 'a', b: { c: 'd' } }, 'a\\.b'), 'a');
    assert.deepStrictEqual(expand({ 'a.b': { b: { c: 'd' } } }, 'a\\.b.b.c'), 'd');
  });

  it('should expand the value of a deeply nested property', () => {
    assert.strictEqual(expand({ a: { b: 'c', c: { d: 'e', e: 'f', g: { h: 'i' } } } }, 'a.c.g.h'), 'i');
  });

  it('should return the entire object if no property is passed', () => {
    assert.deepStrictEqual(expand({ a: 'a', b: { c: 'd' } }), { a: 'a', b: { c: 'd' } });
  });
});

/**
 * These tests are from the "dot-prop" library
 */

describe('dot-prop tests', () => {
  it('should pass dot-prop tests', () => {
    const f1 = { foo: { bar: 1 } };
    assert.deepStrictEqual(expand(f1), f1);
    f1[''] = 'foo';
    assert.deepStrictEqual(expand(f1, ''), 'foo');
    assert.deepStrictEqual(expand(f1, 'foo'), f1.foo);
    assert.deepStrictEqual(expand({ foo: 1 }, 'foo'), 1);
    assert.deepStrictEqual(expand({ foo: null }, 'foo'), null);
    assert.deepStrictEqual(expand({ foo: undefined }, 'foo'), undefined);
    assert.deepStrictEqual(expand({ foo: { bar: true } }, 'foo.bar'), true);
    assert.deepStrictEqual(expand({ foo: { bar: { baz: true } } }, 'foo.bar.baz'), true);
    assert.deepStrictEqual(expand({ foo: { bar: { baz: null } } }, 'foo.bar.baz'), null);
    assert.deepStrictEqual(expand({ '\\': true }, '\\'), true);
    assert.deepStrictEqual(expand({ '\\foo': true }, '\\foo'), true);
    assert.deepStrictEqual(expand({ 'bar\\': true }, 'bar\\'), true);
    assert.deepStrictEqual(expand({ 'foo\\bar': true }, 'foo\\bar'), true);
    assert.deepStrictEqual(expand({ '\\.foo': true }, '\\\\.foo'), true);
    assert.deepStrictEqual(expand({ 'bar\\.': true }, 'bar\\\\.'), true);
    assert.deepStrictEqual(expand({ 'foo\\.bar': true }, 'foo\\\\.bar'), true);
    assert.deepStrictEqual(expand({ foo: 1 }, 'foo.bar'), undefined);

    function fn() {}
    fn.foo = { bar: 1 };
    assert.deepStrictEqual(expand(fn), fn);
    assert.deepStrictEqual(expand(fn, 'foo'), fn.foo);
    assert.deepStrictEqual(expand(fn, 'foo.bar'), 1);

    const f3 = { foo: null };
    assert.deepStrictEqual(expand(f3, 'foo.bar'), undefined);
    assert.deepStrictEqual(expand(f3, 'foo.bar', 'some value'), 'some value');

    assert.deepStrictEqual(expand({ 'foo.baz': { bar: true } }, 'foo\\.baz.bar'), true);
    assert.deepStrictEqual(expand({ 'fo.ob.az': { bar: true } }, 'fo\\.ob\\.az.bar'), true);

    assert.deepStrictEqual(expand(null, 'foo.bar', false), false);
    assert.deepStrictEqual(expand('foo', 'foo.bar', false), false);
    assert.deepStrictEqual(expand([], 'foo.bar', false), false);
    assert.deepStrictEqual(expand(undefined, 'foo.bar', false), false);
  });

  it('should use a custom options.isValid function', () => {
    const isEnumerable = Object.prototype.propertyIsEnumerable;
    const options = {
      isValid: (key, obj) => isEnumerable.call(obj, key)
    };

    const target = {};
    Object.defineProperty(target, 'foo', {
      value: 'bar',
      enumerable: false
    });

    assert.deepStrictEqual(expand(target, 'foo', options), undefined);
    assert.deepStrictEqual(expand({}, 'hasOwnProperty', options), undefined);
  });

  it('should return a default value', () => {
    assert.deepStrictEqual(expand({ foo: { bar: 'a' } }, 'foo.fake'), undefined);
    assert.deepStrictEqual(expand({ foo: { bar: 'a' } }, 'foo.fake.fake2'), undefined);
    assert.deepStrictEqual(expand({ foo: { bar: 'a' } }, 'foo.fake.fake2', 'some value'), 'some value');
  });

  it('should pass all of the dot-prop tests', () => {
    const f1 = { foo: { bar: 1 } };
    assert.deepStrictEqual(expand(f1), f1);
    assert.deepStrictEqual(expand(f1, 'foo'), f1.foo);
    assert.deepStrictEqual(expand({ foo: 1 }, 'foo'), 1);
    assert.deepStrictEqual(expand({ foo: null }, 'foo'), null);
    assert.deepStrictEqual(expand({ foo: undefined }, 'foo'), undefined);
    assert.deepStrictEqual(expand({ foo: { bar: true } }, 'foo.bar'), true);
    assert.deepStrictEqual(expand({ foo: { bar: { baz: true } } }, 'foo.bar.baz'), true);
    assert.deepStrictEqual(expand({ foo: { bar: { baz: null } } }, 'foo.bar.baz'), null);
    assert.deepStrictEqual(expand({ foo: { bar: 'a' } }, 'foo.fake.fake2'), undefined);
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

  it('should return the value using unicode key', () => {
    const obj = { '15\u00f8C': { '3\u0111': 1 } };
    assert.equal(expand(obj, '15\u00f8C.3\u0111'), 1);
    assert.equal(expand(obj, ['15\u00f8C', '3\u0111']), 1);
  });

  it('should return the value using dot in key (with array of segments)', () => {
    const obj = { 'a.b': { 'looks.like': 1 } };
    assert.equal(expand(obj, ['a.b', 'looks.like']), 1);
  });

  // object-path fails this test
  it('should return the value using dot in key', () => {
    const obj = { 'a.b': { 'looks.like': 1 } };
    assert.equal(expand(obj, 'a.b.looks.like'), 1);
  });

  it('should return the value under shallow object', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'a'), 'b');
    assert.equal(expand(obj, ['a']), 'b');
  });

  it('should work with number path', () => {
    const obj = getTestObj();
    assert.equal(expand(obj.b.d, 0), 'a');
    assert.equal(expand(obj.b, 0), undefined);
  });

  it('should return the value under deep object', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'b.f'), 'i');
    assert.equal(expand(obj, ['b', 'f']), 'i');
  });

  it('should return the value under array', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'b.d.0'), 'a');
    assert.equal(expand(obj, ['b', 'd', 0]), 'a');
  });

  it('should return the value under array deep', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'b.e.1.f'), 'g');
    assert.equal(expand(obj, ['b', 'e', 1, 'f']), 'g');
  });

  it('should return undefined for missing values under object', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'a.b'), undefined);
    assert.equal(expand(obj, ['a', 'b']), undefined);
  });

  it('should return undefined for missing values under array', () => {
    const obj = getTestObj();
    assert.equal(expand(obj, 'b.d.5'), undefined);
    assert.equal(expand(obj, ['b', 'd', '5']), undefined);
  });

  it('should return the value under integer-like key', () => {
    const obj = { '1a': 'foo' };
    assert.equal(expand(obj, '1a'), 'foo');
    assert.equal(expand(obj, ['1a']), 'foo');
  });

  it('should return the default value when the key doesnt exist', () => {
    const obj = { '1a': 'foo' };
    assert.equal(expand(obj, '1b', null), null);
    assert.equal(expand(obj, ['1b'], null), null);
  });

  // this test differs from behavior in object-path. I was unable to figure
  // out exactly how the default values work in object-path.
  it('should return the default value when path is empty', () => {
    const obj = { '1a': 'foo' };
    assert.deepStrictEqual(expand(obj, '', null), null);
    assert.deepStrictEqual(expand(obj, []), undefined);
    assert.equal(expand({}, ['1'], 'foo'), 'foo');
  });

  it('should return the default value when object is null or undefined', () => {
    assert.deepStrictEqual(expand(null, 'test', 'a'), 'a');
    assert.deepStrictEqual(expand(undefined, 'test', 'a'), 'a');
  });

  it('should not fail on an object with a null prototype', () => {
    const foo = 'FOO';
    const obj = Object.create(null);
    obj.foo = foo;
    assert.equal(expand(obj, 'foo'), foo);
  });

  // this differs from object-path, which does not allow
  // the user to expand non-own properties for some reason.
  it('should expand non-"own" properties', () => {
    class Base {
      constructor() {
        this.one = { two: true };
      }
    }

    class Extended extends Base {}
    const extended = new Extended();
    assert.equal(expand(extended, ['one', 'two']), true);
    extended.enabled = true;

    assert.equal(expand(extended, 'enabled'), true);
    assert.deepStrictEqual(expand(extended, 'one'), { two: true });
  });
});

describe('deep-property unit tests', () => {
  it('should handle invalid input', () => {
    const a = undefined;
    const b = {};

    assert.equal(expand(a, 'sample'), undefined);
    assert.deepStrictEqual(expand(b, undefined), {});
    assert.deepStrictEqual(expand(b, ''), undefined);
    assert.deepStrictEqual(expand(b, '...'), undefined);
  });

  it('should expand shallow properties', () => {
    const fn = () => {};
    const a = {
      sample: 'string',
      example: fn,
      unknown: undefined
    };

    assert.equal(expand(a, 'example'), fn);
    assert.equal(expand(a, 'sample'), 'string');
    assert.equal(expand(a, 'unknown'), undefined);
    assert.equal(expand(a, 'invalid'), undefined);
  });

  it('should expand deep properties', () => {
    const a = {
      b: { example: { type: 'vegetable' } },
      c: { example: { type: 'mineral' } }
    };

    assert.equal(expand(a, 'b.example.type'), 'vegetable');
    assert.equal(expand(a, 'c.example.type'), 'mineral');
    assert.equal(expand(a, 'c.gorky.type'), undefined);
  });

  it('should expand properties on non-objects', () => {
    const fn = () => {};

    // the commented out lines are from from the "deep-property" lib,
    // but it's invalid javascript. This is a good example of why it's always
    // better to use "use strict" (and lint your code).

    const str = 'An example string';
    const num = 42;

    fn.path = { to: { property: 'string' } };
    // str.path = { to: { property: 'string' } };
    // num.path = { to: { property: 'string' } };

    assert.equal(expand(fn, 'path.to.property'), 'string');
    assert.equal(expand(str, 'path.to.property'), undefined);
    assert.equal(expand(num, 'path.to.property'), undefined);
  });
});
