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
  const orig = { ...data };
  let context: unknown = orig;
  let prev: unknown = context;
  const segments: PropertyKey[] = [];
  const fns = options.helpers ? { ...helpers, ...options.helpers } : helpers;
  const resolveValue = (target: unknown, prop: PropertyKey, value: unknown): unknown => {
    const index = segments.push(prop) - 1;
    return options.resolve?.(target, prop, value, { segments, index }) ?? value;
  };

  const resolve = (node: Node): void => {
    if (node.skip || node.type === 'separator') {
      return;
    }

    if (context === undefined) {
      return;
    }

    if (node.type === 'paren') {
      const args: unknown[] = [];

      for (let i = 1; i < node.nodes!.length - 1; i++) {
        const child = node.nodes![i];

        switch (child.type) {
          case 'integer':
            args.push(Number(child.value));
            break;
          case 'quoted':
            args.push(unquote(child.value!));
            break;
          case 'symbol':
            args.push(Symbol.for(child.value!));
            break;
          case 'ident':
            args.push(expand(context, child.value!));
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
        const inner = node.nodes.slice(1, -1);

        if (inner.some(n => n.value === ' ')) {
          try {
            const text = inner.map(n => n.value).join('');
            resolve({ type: 'ident', value: evaluate(text, data) });
            return;
          } catch {}
        }

        if (inner.length === 1 && inner[0].type === 'ident') {
          resolve(inner[0]);
          return;
        }

        if (node.type === 'bracket' && inner.some(n => n.type === 'bracket')) {
          const value = expand(orig, node.output.slice(1, -1), options);

          if (value === undefined) {
            context = undefined;
            return;
          }

          prev = context;
          context = resolveValue(context, value, context?.[value]);
          return;
        }
      }

      node.nodes.forEach(child => resolve(child));
      return;
    }

    if (node.type === 'symbol') {
      prev = context;

      for (const symbol of Object.getOwnPropertySymbols(context)) {
        if (symbol === node.symbol || symbol.toString() === node.symbol!.toString()) {
          context = resolveValue(context, symbol, context[symbol]);
          return;
        }
      }

      const symbol = node.symbol || Symbol.for(node.value!);
      context = resolveValue(context, symbol, context[symbol]);
      return;
    }

    if (node.type === 'ident') {
      if (!isSafeKey(node.value!)) {
        context = undefined;
        return;
      }

      let value = node.value!;

      if (node.parent?.type === 'bracket') {
        let temp = orig;
        value = expand(temp, value);

        if (value === undefined) {
          context = undefined;
          return;
        }

        if (typeof value === 'number') {
          prev = context;
          context = resolveValue(context, value, context[value]);
          return;
        }

        if (isObject(value)) {
          const siblings = node.siblings!.filter(n => ['ident', 'quoted', 'symbol'].includes(n.type));
          let index = siblings.indexOf(node) + 1;
          let next = siblings[index];

          while (isObject(value) && isObject(next) && temp) {
            const key = next.value!;
            value = expand(value, key);
            next.skip = true;
            temp = expand(temp, value);
            next = siblings[++index];
          }
        }
      }

      const target = context;
      prev = target;
      context = resolveValue(target, value, target?.[value]);

      if (context !== undefined) {
        if (typeof context === 'function') {
          context = context.call(prev);
        }

        return;
      }

      context = target;
      const helper = fns[value];

      if (typeof helper === 'function') {
        context = helper(context);
      }

      if (context === undefined && options.strict === true) {
        throw new Error(`Variable is undefined: "${node.value}"`);
      }

      return;
    }

    if (node.type === 'integer' || node.type === 'number') {
      if (node.parent.type === 'bracket') {
        const index = node.parent.nodes.indexOf(node);
        const next = node.parent.nodes[index + 1];
        const after = node.parent.nodes[index + 2];

        if (next?.type === 'range' && (after?.type === 'integer' || after?.type === 'number')) {
          next.skip = true;
          after.skip = true;
          const start = Number(node.value);
          const end = Number(after.value);
          const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          context = range.map(i => resolveValue(context, i, context[i]));
          return;
        }
      }

      prev = context;
      const key = Number(node.value);
      context = resolveValue(context, key, context[key]);
      return;
    }

    if (node.type === 'quoted') {
      prev = context;
      const key = node.match![2];
      context = resolveValue(context, key, context[key]);
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
