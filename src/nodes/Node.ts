import { define } from '~/utils';

export class Node {
  type: string;
  value: string;
  output?: string;
  symbol?: string;
  parent?: { nodes: Node[] };

  constructor(node: {
    type: string;
    value?: string;
    output?: string;
    symbol?: string;
    alt?: any;
    match?: any;
    loc?: any;
  }) {
    this.type = node.type;
    this.value = node.value || '';

    if (node.output != null && node.output !== '') {
      this.output = node.output;
    }

    if (node.symbol) {
      this.symbol = node.symbol;
    }

    define(this, 'alt', node.alt);
    define(this, 'match', node.match);
    define(this, 'loc', node.loc);
  }

  get siblings(): Node[] {
    return this.parent?.nodes || [];
  }
}

export default Node;
