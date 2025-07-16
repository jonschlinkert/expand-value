import { define } from '~/utils';
import { Node } from './Node';

export class Block extends Node {
  nodes: any[];

  constructor(node: any) {
    super(node);
    this.nodes = node.nodes || [];
  }

  append(input: string): void {
    // eslint-disable-next-line no-unused-expressions
    this.parent && this.parent.append(input);
    this.output = this.output || '';
    this.output += input;
  }

  push(node: any): void {
    define(node, 'parent', this);
    this.nodes.push(node);
  }
}

export default Block;
