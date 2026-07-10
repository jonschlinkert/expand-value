import { compile } from '~/async/compile';
import { parse } from '~/parse';
import { isObject, isValidObject, isValid } from '~/utils';

const METHOD_REGEX = /(\[[^[\]]+?\]|\.(?:blank|empty|first|last|length|nil|size)(\.|$))/;

export const expand = async (data, path, options = {}) => {
  if (!isObject(options)) {
    options = { default: options };
  }

  const fallback = options.default !== undefined ? options.default : options.fallback;
  const helpers = options.helpers;
  const resolveValue = async (target, prop, value, state) => {
    return options.resolve?.(target, prop, value, state) ?? value;
  };

  const readValue = async (receiver, key) => {
    const value = await receiver?.[key];
    return value === undefined && typeof receiver?.get === 'function' ? receiver.get(key) : value;
  };

  if (data && typeof path === 'string') {
    if (path.startsWith('[') && path.endsWith(']') && !path.slice(1).includes('[')) {
      const prop = path.slice(1, -1);
      const value = await readValue(data, prop);

      if (isValid(prop, data, options)) {
        const resolved = await resolveValue(data, prop, value, { segments: [prop], index: 0 });
        if (resolved !== undefined) {
          return resolved;
        }
      }
    }

    const value = await readValue(data, path);
    const hasSegments = /(?<!\\)\.(?!$)/.test(path);
    if ((!hasSegments || value !== undefined) && isValid(path, data, options)) {
      const resolved = await resolveValue(data, path, value, { segments: [path], index: 0 });
      if (resolved !== undefined) {
        return resolved;
      }
    }
  }

  if ((typeof path === 'symbol' || typeof path === 'number') && isValid(path, data, options)) {
    return resolveValue(data, path, await readValue(data, path), { segments: [path], index: 0 });
  }

  if (typeof path !== 'string' && !Array.isArray(path)) {
    return data;
  }

  if (!isValidObject(data)) {
    return fallback;
  }

  const value = await readValue(data, path);
  if ((value !== undefined || path in data) && isValid(path, data, options)) {
    return resolveValue(data, path, value, { segments: [path], index: 0 });
  }

  if ((Array.isArray(path) || !METHOD_REGEX.test(path)) && !options.separator) {
    const segs = Array.isArray(path) ? path : path.split(/(?<!\\)\.(?!$)/);
    let ctx = data;
    let prev = ctx;
    let i = 0;

    if (segs.length === 0) {
      return fallback;
    }

    for (; i < segs.length; i++) {
      if (ctx === undefined) {
        return fallback;
      }

      let key = String(segs[i]).replace(/\\(.)/g, '$1');
      const helper = helpers?.[key];

      if (!isValidObject(ctx)) {
        if (!helper) {
          return fallback;
        }

        ctx = await helper(ctx);
        continue;
      }

      if (options.onResolve) {
        await options.onResolve(ctx, key);
      }

      // Handle negative indices and special number cases
      if (Array.isArray(ctx) || typeof ctx === 'string') {
        const index = Number(key);
        if (!Number.isNaN(index)) {
          key = index;
        }
      } else if (key === '-0') {
        key = -0;
      } else if (key === 'NaN') {
        key = NaN;
      } else if (key === 'Infinity' || key === '-Infinity') {
        key = Number(key);
      }

      if (!isValid(key, ctx, options)) {
        return fallback;
      }

      let val = await resolveValue(ctx, key, await readValue(ctx, key), { segments: segs, index: i });

      if (val === undefined && helper) {
        val = await helper(ctx);
      }

      if (val !== undefined) {
        if (!isValid(key, ctx, options)) {
          return fallback;
        }

        prev = ctx;
        ctx = val;
        continue;
      }

      let temp = ctx;
      let next = segs[i + 1];
      let found = false;

      while (next) {
        i++;
        key += `.${next}`;

        if (!isValid(key, ctx, options)) {
          return fallback;
        }

        temp = await resolveValue(ctx, key, await readValue(ctx, key), { segments: segs, index: i });
        next = segs[i + 1];

        if (temp !== undefined) {
          prev = ctx;
          ctx = temp;
          found = true;
          break;
        }
      }

      if (!found) {
        prev = ctx;
        ctx = fallback;
        break;
      }
    }

    if (i < segs.length) {
      if (options.strict === true && fallback === undefined) {
        throw new Error(`Variable is undefined: "${segs[i - 1]}"`);
      }

      return fallback;
    }

    if (typeof ctx === 'function' && isObject(prev)) {
      ctx.context = prev;
    }

    return ctx;
  }

  const { ast } = parse(path, options);
  const output = await compile(ast, data, options);

  if (output === undefined) {
    return fallback;
  }

  return output;
};

expand.parse = parse;
expand.compile = compile;

export { parse, compile };
export default expand;
