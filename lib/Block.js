/* eslint-disable no-unused-expressions */
'use strict';

const Node = require('./Node');
const { define } = require('./utils');

class Block extends Node {
  constructor(node) {
    super(node);
    this.nodes = node.nodes || [];
  }
  append(input) {
    this.parent && this.parent.append(input);
    this.output = this.output || '';
    this.output += input;
  }
  push(node) {
    define(node, 'parent', this);
    this.nodes.push(node);
  }
}

module.exports = Block;
