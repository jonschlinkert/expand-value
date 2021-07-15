'use strict';

const compile = require('./compile');
const parse = require('./parse');
const { isObject, isValidObject } = require('./utils');

const METHOD_REGEX = /([["()]|\.(?:blank|empty|first|last|length|nil|size)(\.|$))/;

const resolve = (data, path, options = {}) => {
  if (!isObject(options)) {
    options = { default: options };
  }

  const fallback = options.default !== undefined ? options.default : options.fallback;
  const helpers = options.helpers;

  if (typeof path === 'symbol' || typeof path === 'number') return data[path];
  if (typeof path !== 'string' && !Array.isArray(path)) {
    return data;
  }

  if (!isValidObject(data)) {
    return fallback;
  }

  const isValid = (key, data) => {
    return typeof options.isValid === 'function' ? options.isValid(key, data) : true;
  };

  if (path in data) {
    return isValid(path, data, options) ? data[path] : fallback;
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
      if (ctx === undefined) return;

      let key = String(segs[i]).replace(/\\\./g, '.');
      const helper = helpers?.[key];

      if (!isValidObject(ctx)) {
        if (!helper) break;
        ctx = helper(ctx);
        continue;
      }

      if (options.onResolve) {
        options.onResolve(ctx, key);
      }

      let val = ctx[key];
      if (val === undefined && helper) {
        val = helper(ctx);
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

        temp = ctx[key];
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
  const output = compile(ast, data, options);

  if (output === undefined) {
    return fallback;
  }

  return output;
};

resolve.parse = parse;
resolve.compile = compile;
module.exports = resolve;
