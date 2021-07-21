'use strict';

const assert = require('assert').strict;
const prune = require('./support/prune');
const parse = require('../lib/parse');

describe('parse', () => {
  it('should get a node', () => {
    const { ast } = parse('a.b.c');

    assert.deepEqual(prune(ast), {
      type: 'root',
      value: '',
      nodes: [
        { type: 'ident', value: 'a' },
        { type: 'separator', value: '.' },
        { type: 'ident', value: 'b' },
        { type: 'separator', value: '.' },
        { type: 'ident', value: 'c' }
      ],
      output: 'a.b.c'
    });
  });

  it('should get "loc" from node', () => {
    const { ast } = parse('a.b.c');

    assert.deepEqual(prune(ast.nodes[0].loc), {
      start: { index: 0, line: 1, col: 0 },
      end: { index: 1, line: 1, col: 1 }
    });
  });

  it('should get "range" from node.loc', () => {
    const { ast } = parse('a.b.c');
    assert.deepEqual(ast.nodes[0].loc.range, [0, 1]);
    assert.deepEqual(ast.nodes[1].loc.range, [1, 2]);
    assert.deepEqual(ast.nodes[2].loc.range, [2, 3]);
  });

  it('should "slice" a range the given input', () => {
    const input = 'a.b.c';
    const { ast } = parse(input);
    assert.equal(ast.nodes[0].loc.slice(input), 'a');
    assert.equal(ast.nodes[1].loc.slice(input), '.');
    assert.equal(ast.nodes[2].loc.slice(input), 'b');
    assert.equal(ast.nodes[3].loc.slice(input), '.');
    assert.equal(ast.nodes[4].loc.slice(input), 'c');
  });
});
