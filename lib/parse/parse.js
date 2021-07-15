'use strict';

const { isObject } = require('../utils');
const location = require('./Location');
const Block = require('./Block');
const Token = require('./Token');
const Node = require('./Node');

const QUOTED_STRING = /^(['"`])((?:\\.|(?!\1)[\s\S])*?)(\1)/;
const IDENT_DOT = /^([a-zA-Z_][-a-zA-Z0-9_.]*(?<!\.))/;
const IDENT = /^([a-zA-Z_][-a-zA-Z0-9_]*)/;

const parse = (input = '', options) => {
  if (!isObject(options)) options = {};
  const loc = { index: 0, line: 1, col: 0 };
  let pos = location(loc);

  const str = String(input);
  const ast = new Block({ type: 'root' });
  ast.output = '';

  const stack = [ast];
  const stash = [];

  const tokens = [];
  let remaining = str;
  let block = ast;
  let token;
  let match;
  let prev;

  let separator = /^\./;
  let IDENTITY = IDENT;
  if (typeof options.separator === 'string') {
    separator = new RegExp(`^\\${options.separator.replace(/^[\\^]+/, '')}`);
    IDENTITY = IDENT_DOT;
  }

  const eos = () => remaining === undefined || remaining === '';
  const scan = (regex, type = 'text') => {
    if ((match = regex.exec(remaining))) {
      consume(match[0]);
      return new Token({ type, value: match[0], match });
    }
  };

  const updateLocation = (value, len) => {
    const i = value.lastIndexOf('\n');
    loc.index += len;
    loc.col = ~i ? len - i : (loc.col + len);
    loc.row += Math.max(0, value.split('\n').length - 1);
  };

  const consume = (value, len = value.length) => {
    updateLocation(value, len);
    remaining = remaining.slice(len);
    return value;
  };

  const drop = () => {
    if (stash.length) {
      block.push(stash.shift());
    }
  };

  const shouldPush = node => {
    return node.type !== 'newline' || options.newlines !== false;
  };

  const push = node => {
    pos(node);

    if (prev && prev.type === 'ident' && node.type === 'ident') {
      block.append(node.output || node.match[0]);
      prev.value += node.value;
      console.log(prev);
      return;
    }

    if (!shouldPush(node)) return;
    block.push(node);

    if (node.nodes) {
      stack.push(node);
      block = node;
    } else {
      block.append(node.output || node.match[0]);
      tokens.push(node);
    }

    pos = location(loc);
    prev = node;

    if (block.type === 'root') {
      drop();
    }
  };

  const pop = () => {
    const parent = stack.pop();
    block = stack[stack.length - 1];
    return parent;
  };

  const advance = () => {

    /**
     * Escaped text
     */

    if ((token = scan(/^\\+/, 'escaped'))) {
      if (token.value.length % 2 === 1) token.value += consume(remaining[0]);

      if (token.value === '\\.') {
        token.type = 'ident';
        token.value = '.';
        token.output = '\\.';
      }

      push(new Node(token));
      return;
    }

    /**
     * Brackets
     */

    if ((token = scan(/^\[/, 'left_bracket'))) {
      token.index = tokens.length;
      push(new Block({ type: 'bracket' }));
      push(new Node(token));
      return;
    }
    if ((token = scan(/^\]/, 'right_bracket'))) {
      push(new Node(token));

      if (block.type === 'bracket') {
        pop();
      }
      return;
    }

    /**
     * Parens
     */

    if ((token = scan(/^\(/, 'left_paren'))) {
      token.index = tokens.length;
      push(new Block({ type: 'paren' }));
      push(new Node(token));
      return;
    }
    if ((token = scan(/^\)/, 'right_paren'))) {
      push(new Node(token));

      if (block.type === 'paren') {
        pop();
      }
      return;
    }

    /**
     * Ranges
     */

    if (block.type === 'paren' && (token = scan(/^\.\./, 'dots'))) {
      push(new Node(token));
      return;
    }

    /**
     * Separator
     */

    if (!options.separator && (token = scan(separator, 'separator'))) {
      push(new Node(token));
      return;
    }

    /**
     * Integer
     */

    if ((token = scan(/^[0-9]+/, 'integer'))) {
      push(new Node(token));
      return;
    }

    /**
     * Identifier
     */

    if ((token = scan(IDENTITY, 'ident'))) {
      push(new Node(token));
      return;
    }

    if (options.separator && options.separator !== '.') {
      if ((token = scan(separator, 'separator'))) {
        push(new Node(token));
        return;
      }
    }

    /**
     * Quoted string
     */

    if ((token = scan(QUOTED_STRING, 'quoted'))) {
      push(new Node(token));
      return;
    }

    /**
     * Text (anything not matched by previous scanners)
     */

    push(new Node(scan(/^([-_a-zA-Z0-9?!;.~@#^&*]+|.)/, 'text')));
  };

  while (!eos()) advance();
  return { ast, tokens, output: ast.output };
};

module.exports = parse;
