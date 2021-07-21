'use strict';

require('mocha');
const assert = require('assert').strict;
const expand = require('..');

const data = {
  product: { variants: [{ title: 'draft151cm' }, { title: 'element151cm' }] }
};

describe('expand-value', () => {
  describe('symbols', () => {
    it('should get a symbol', () => {
      const foo = Symbol('foo');
      assert.equal(expand({ [foo]: 'correct' }, foo), 'correct');
    });
  });

  describe('properties', () => {
    it('should get a property', () => {
      assert.equal(expand({ foo: 'correct' }, 'foo'), 'correct');
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
  });

  describe('variable accessors', () => {
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
});
