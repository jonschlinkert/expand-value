function parse(expression) {
  let pos = 0;

  function peek() {
    return expression[pos];
  }

  function consume() {
    return expression[pos++];
  }

  function skipWs() {
    while (pos < expression.length && /\s/.test(peek())) {
      pos++;
    }
  }

  function parseNum() {
    let n = '';
    while (pos < expression.length && /\d/.test(peek())) {
      n += consume();
    }
    return { type: 'num', val: parseInt(n, 10) };
  }

  function parseIdent() {
    let id = '';
    while (pos < expression.length && /[\w$]/.test(peek())) {
      id += consume();
    }
    return id;
  }

  function parsePath() {
    const parts = [parseIdent()];
    while (peek() === '.') {
      consume();
      parts.push(parseIdent());
    }
    return { type: 'path', parts };
  }

  function parsePrimary() {
    skipWs();
    const ch = peek();
    if (/\d/.test(ch)) {
      return parseNum();
    }
    if (/[\w$]/.test(ch)) {
      return parsePath();
    }
    if (ch === '(') {
      consume();
      const node = parseExpr();
      skipWs();
      if (peek() === ')') consume();
      return node;
    }
    return null;
  }

  function parseExpr() {
    let left = parsePrimary();
    while (true) {
      skipWs();
      const op = peek();
      if (op !== '+' && op !== '-') break;
      consume();
      const right = parsePrimary();
      left = { type: 'bin', op, left, right };
    }
    return left;
  }

  return parseExpr();
}

function evaluateExpression(node, data) {
  if (!node) return undefined;

  switch (node.type) {
    case 'num':
      return node.val;
    case 'path': {
      let val = data;
      for (const p of node.parts) {
        if (val == null) return undefined;
        val = val[p];
      }
      return val;
    }
    case 'bin': {
      const l = evaluateExpression(node.left, data);
      const r = evaluateExpression(node.right, data);
      if (node.op === '+') return l + r;
      if (node.op === '-') return l - r;
      return undefined;
    }
    default: {
      return undefined;
    }
  }
}

export function evaluate(expression: string, data) {
  const ast = parse(expression);
  return evaluateExpression(ast, data);
}
