'use strict';

const { define } = require('./utils');

class Node {
  constructor(node) {
    this.type = node.type;
    this.value = node.value || '';
    if (node.output != null && node.output !== '') {
      this.output = node.output;
    }
    define(this, 'match', node.match);
    define(this, 'loc', node.loc);
  }
  get siblings() {
    return this.parent && this.parent.nodes || [];
  }
}

module.exports = Node;
