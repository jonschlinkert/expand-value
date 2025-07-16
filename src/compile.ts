import { isObject, isSafeKey, unquote } from '~/utils';
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
  strict?: boolean;
}

export const compile = (ast: Node, data: Record<string, any> = {}, options: Options = {}): any => {
  const orig = { ...data };
  let context: any = orig;
  let prev: any = context;
  const fns = options.helpers ? { ...helpers, ...options.helpers } : helpers;

  // eslint-disable-next-line complexity
  const resolve = (node: Node): void => {
    if (node.skip || node.type === 'separator') {
      return;
    }

    if (context === undefined) {
      return;
    }

    if (node.type === 'paren') {
      const args: any[] = [];

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
      node.nodes.forEach(child => resolve(child));
      return;
    }

    if (node.type === 'symbol') {
      prev = context;

      for (const symbol of Object.getOwnPropertySymbols(context)) {
        if (symbol === node.symbol || symbol.toString() === node.symbol!.toString()) {
          context = context[symbol];
          return;
        }
      }

      const symbol = node.symbol || Symbol.for(node.value!);
      context = context[symbol];
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

        if (isObject(value)) {
          const sibs = node.siblings!.filter(n => ['ident', 'quoted', 'symbol'].includes(n.type));
          let index = sibs.indexOf(node) + 1;
          let next = sibs[index];

          while (isObject(value) && isObject(next) && temp) {
            const key = next.value!;
            value = expand(value, key);
            next.skip = true;
            temp = expand(temp, value);
            next = sibs[++index];
          }
        }
      }

      prev = context;

      if (context?.[value] !== undefined) {
        context = context[value];

        if (typeof context === 'function') {
          context = context.call(prev);
        }

        return;
      }

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
      prev = context;
      context = context[Number(node.value)];
      return;
    }

    if (node.type === 'quoted') {
      prev = context;
      context = context[node.match![2]];
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
