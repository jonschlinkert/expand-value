import { isObject, isSafeKey, unquote } from '~/utils';
import { evaluate } from '~/expression';
import { expand } from '~/expand';
import * as helpers from '~/helpers';

export interface Node {
  type: string;
  value?: string;
  nodes?: Node[];
  skip?: boolean;
  symbol?: symbol;
  parent?: Node;
  siblings?: Node[];
  match?: string[];
}

export interface Options {
  helpers?: Record<string, Function>;
  resolve?: (target: unknown, prop: PropertyKey, value: unknown, state: { segments: PropertyKey[]; index: number }) => unknown;
  strict?: boolean;
}

export const compile = (ast: Node, data: Record<string, unknown> = {}, options: Options = {}): unknown => {
  const orig = Array.isArray(data) ? data : { ...data };
  let context = orig;
  let prev = context;
  let selectionDepth = 0;
  let nodeCache;
  let siblingCache;

  const skipped = new Set();
  const segments = [];
  const fns = options.helpers || helpers;

  const resolveValue = (target: unknown, prop: PropertyKey, value: unknown): unknown => {
    if (typeof options.resolve !== 'function') {
      return value;
    }

    const index = segments.push(prop) - 1;
    return options.resolve(target, prop, value, { segments, index });
  };

  const resolveNode = (node: Node): void => {
    if (node.skip || skipped.has(node) || ['separator', 'left_bracket', 'right_bracket'].includes(node.type)) {
      return;
    }

    if (context == null) {
      context = undefined;
      return;
    }

    if (node.type === 'paren') {
      const args = [];

      for (let i = 1; i < node.nodes.length - 1; i++) {
        const child = node.nodes[i];

        switch (child.type) {
          case 'integer':
            args.push(Number(child.value));
            break;
          case 'quoted':
            args.push(unquote(child.value));
            break;
          case 'symbol':
            args.push(Symbol.for(child.value));
            break;
          case 'ident':
            args.push(expand(context, child.value));
            break;
          default: {
            break;
          }
        }
      }

      context = `(${args.join('..')})`;
      return;
    }

    if (node.nodes) {
      if (node.type !== 'root') {
        let structure = selectionDepth > 0 ? nodeCache?.get(node) : undefined;

        if (!structure) {
          const inner = node.nodes.slice(1, -1);
          structure = {
            inner,
            hasSpace: inner.some(n => n.value === ' '),
            hasBracket: node.type === 'bracket' && inner.some(n => n.type === 'bracket')
          };

          if (selectionDepth > 0) {
            nodeCache ??= new Map();
            nodeCache.set(node, structure);
          }
        }

        const inner = structure.inner;

        if (structure.hasSpace) {
          try {
            const text = (structure.text ??= inner.map(n => n.value).join(''));
            resolveNode({ type: 'ident', value: evaluate(text, data) });
            return;
          } catch {}
        }

        if (inner.length === 1 && inner[0].type === 'ident') {
          resolveNode(inner[0]);
          return;
        }

        if (structure.hasBracket) {
          const value = expand(orig, node.output.slice(1, -1), options);

          if (value === undefined) {
            context = undefined;
            return;
          }

          prev = context;
          const raw = context?.[value];
          context = options.resolve ? resolveValue(context, value, raw) : raw;
          return;
        }
      }

      node.nodes.forEach(child => resolveNode(child));
      return;
    }

    if (node.type === 'symbol') {
      prev = context;

      for (const symbol of Object.getOwnPropertySymbols(context)) {
        if (symbol === node.symbol || symbol.toString() === node.symbol.toString()) {
          const raw = context[symbol];
          context = options.resolve ? resolveValue(context, symbol, raw) : raw;
          return;
        }
      }

      const symbol = node.symbol || Symbol.for(node.value);
      const raw = context[symbol];
      context = options.resolve ? resolveValue(context, symbol, raw) : raw;
      return;
    }

    if (node.type === 'ident') {
      if (!isSafeKey(node.value)) {
        context = undefined;
        return;
      }

      let value = node.value;

      if (node.parent?.type === 'bracket') {
        let temp = orig;
        value = expand(temp, value);

        if (value === undefined) {
          context = undefined;
          return;
        }

        if (typeof value === 'number') {
          prev = context;
          const raw = context[value];
          context = options.resolve ? resolveValue(context, value, raw) : raw;
          return;
        }

        if (isObject(value)) {
          let structure = selectionDepth > 0 ? siblingCache?.get(node) : undefined;

          if (!structure) {
            const siblings = node.siblings.filter(n => ['ident', 'quoted', 'symbol'].includes(n.type));
            structure = { siblings, index: siblings.indexOf(node) + 1 };

            if (selectionDepth > 0) {
              siblingCache ??= new Map();
              siblingCache.set(node, structure);
            }
          }

          const siblings = structure.siblings;
          let index = structure.index;
          let next = siblings[index];

          while (isObject(value) && isObject(next) && temp) {
            const key = next.value;
            value = expand(value, key);
            skipped.add(next);
            temp = expand(temp, value);
            next = siblings[++index];
          }
        }
      }

      const target = context;
      prev = target;

      const raw = target?.[value];
      context = options.resolve ? resolveValue(target, value, raw) : raw;

      if (context !== undefined) {
        if (typeof context === 'function') {
          context = context.call(prev);
        }

        return;
      }

      const helper = fns[value];

      if (typeof helper === 'function') {
        context = helper(target);
      }

      if (context === undefined && options.strict === true) {
        throw new Error(`Variable is undefined: "${node.value}"`);
      }

      return;
    }

    if (node.type === 'integer' || node.type === 'number') {
      prev = context;
      let key = Number(node.value);

      if (Array.isArray(context) && Number.isInteger(key) && key < 0) {
        key += context.length;
      }

      const raw = context[key];
      context = options.resolve ? resolveValue(context, key, raw) : raw;
      return;
    }

    if (node.type === 'quoted') {
      prev = context;
      const key = node.match[2];
      const raw = context[key];
      context = options.resolve ? resolveValue(context, key, raw) : raw;
    }
  };

  const resolve = (node: Node): void => {
    if (node.skip || node.type === 'separator') {
      return;
    }

    if (node.type === 'root') {
      node.nodes.forEach(child => resolve(child));
      return;
    }

    const inner = node.type === 'bracket' ? node.nodes.slice(1, -1) : [];
    const wildcard = inner.length === 1 && inner[0].type === 'wildcard';
    const range =
      inner.length === 3 &&
      inner[1].type === 'range' &&
      ['integer', 'number'].includes(inner[0].type) &&
      ['integer', 'number'].includes(inner[2].type);

    const apply = (value, depth) => {
      if (depth > 0) {
        return Array.isArray(value) ? value.map(item => apply(item, depth - 1)) : undefined;
      }

      if (wildcard || range) {
        if (value == null || (wildcard && !Array.isArray(value))) {
          return undefined;
        }

        const start = wildcard ? 0 : Number(inner[0].value);
        const end = wildcard ? value.length - 1 : Number(inner[2].value);
        const selected = new Array(Math.max(0, end - start + 1));
        const target = Object(value);

        for (let i = start; i <= end; i++) {
          if (i in target) {
            const raw = value[i];
            selected[i - start] = options.resolve ? resolveValue(value, i, raw) : raw;
          }
        }

        return selected;
      }

      context = value;
      skipped.clear();
      resolveNode(node);
      return context;
    };

    context = apply(context, selectionDepth);

    if (wildcard || range) {
      selectionDepth++;
    }
  };

  resolve(ast);

  if (typeof context === 'function') {
    context.context = prev;
  }

  if (ast.nodes?.length > 0 && context === orig) {
    return undefined;
  }

  return context;
};

export default compile;
