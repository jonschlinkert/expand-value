import { isObject, isSafeKey, unquote } from '~/utils';
import { evaluate } from '~/expression';
import { expand } from '~/async/expand';
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
  resolve?: (target: unknown, prop: PropertyKey, value: unknown, state: { segments: PropertyKey[]; index: number }) => unknown | Promise<unknown>;
  strict?: boolean;
}

export const compile = async (
  ast: Node,
  data: Record<string, unknown> = {},
  options: Options = {}
): Promise<unknown> => {
  const orig = Array.isArray(data) ? data : { ...data };
  let context = orig;
  let prev = context;
  let selectionDepth = 0;
  let nodeCache;
  let siblingCache;

  const skipped = new Set();
  const segments = [];
  const fns = options.helpers || helpers;

  const resolveValue = (target: unknown, prop: PropertyKey, value: unknown): Promise<unknown> => {
    if (typeof options.resolve !== 'function') {
      return value;
    }

    const index = segments.push(prop) - 1;
    return options.resolve(target, prop, value, { segments, index });
  };

  const resolveNode = async (node: Node): Promise<void> => {
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
            args.push(await expand(context, child.value, options));
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
            await resolveNode({ type: 'ident', value: await evaluate(text, data) });
            return;
          } catch {}
        }

        if (inner.length === 1 && inner[0].type === 'ident') {
          await resolveNode(inner[0]);
          return;
        }

        if (structure.hasBracket) {
          const value = await expand(orig, node.output.slice(1, -1), options);

          if (value === undefined) {
            context = undefined;
            return;
          }

          prev = context;
          const raw = await context?.[value];
          context = options.resolve ? await resolveValue(context, value, raw) : raw;
          return;
        }
      }

      for (const child of node.nodes) {
        if (child.skip || skipped.has(child) || ['separator', 'left_bracket', 'right_bracket'].includes(child.type)) {
          continue;
        }

        await resolveNode(child);
      }
      return;
    }

    if (node.type === 'symbol') {
      prev = context;

      for (const symbol of Object.getOwnPropertySymbols(context)) {
        if (symbol === node.symbol || symbol.toString() === node.symbol.toString()) {
          const raw = await context[symbol];
          context = options.resolve ? await resolveValue(context, symbol, raw) : raw;
          return;
        }
      }

      const symbol = node.symbol || Symbol.for(node.value);
      const raw = await context[symbol];
      context = options.resolve ? await resolveValue(context, symbol, raw) : raw;
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
        value = await expand(temp, value, options);

        if (value === undefined) {
          context = undefined;
          return;
        }

        if (typeof value === 'number') {
          prev = context;
          const raw = await context[value];
          context = options.resolve ? await resolveValue(context, value, raw) : raw;
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
            value = await expand(value, key, options);
            skipped.add(next);
            temp = await expand(temp, value, options);
            next = siblings[++index];
          }
        }
      }

      const target = context;
      prev = target;

      const raw = await target?.[value];
      context = options.resolve ? await resolveValue(target, value, raw) : raw;

      if (context !== undefined) {
        if (typeof context === 'function' && value in fns) {
          context = await context.call(prev);
        }

        return;
      }

      const helper = await fns[value];

      if (typeof helper === 'function') {
        context = await helper(target);
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

      const raw = await context[key];
      context = options.resolve ? await resolveValue(context, key, raw) : raw;
      return;
    }

    if (node.type === 'quoted') {
      prev = context;
      const key = node.match[2];
      const raw = await context[key];
      context = options.resolve ? await resolveValue(context, key, raw) : raw;
    }
  };

  const resolve = async (node: Node): Promise<void> => {
    if (node.skip || node.type === 'separator') {
      return;
    }

    if (node.type === 'root') {
      for (const child of node.nodes) {
        if (child.skip || child.type === 'separator') {
          continue;
        }

        await resolve(child);
      }
      return;
    }

    const inner = node.type === 'bracket' ? node.nodes.slice(1, -1) : [];
    const wildcard = inner.length === 1 && inner[0].type === 'wildcard';
    const range =
      inner.length === 3 &&
      inner[1].type === 'range' &&
      ['integer', 'number'].includes(inner[0].type) &&
      ['integer', 'number'].includes(inner[2].type);

    const apply = async (value, depth) => {
      value = await value;

      if (depth > 0) {
        if (!Array.isArray(value)) {
          return undefined;
        }

        const selected = new Array(value.length);

        for (let i = 0; i < value.length; i++) {
          if (i in value) {
            selected[i] = await apply(value[i], depth - 1);
          }
        }

        return selected;
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
            selected[i - start] = options.resolve ? await resolveValue(value, i, await value[i]) : await value[i];
          }
        }

        return selected;
      }

      context = value;
      skipped.clear();
      await resolveNode(node);
      return context;
    };

    context = await apply(context, selectionDepth);

    if (wildcard || range) {
      selectionDepth++;
    }
  };

  await resolve(ast);

  if (typeof context === 'function') {
    context.context = prev;
  }

  if (ast.nodes?.length > 0 && context === orig) {
    return undefined;
  }

  return context;
};

export default compile;
