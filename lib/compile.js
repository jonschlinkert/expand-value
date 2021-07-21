'use strict';

const helpers = require('./helpers');
const utils = require('./utils');

const compile = (ast, data = {}, options = {}) => {
  const getValue = require('.');
  const orig = { ...data };
  let context = orig;
  let prev = context;

  const fns = options.helpers ? { ...helpers, ...options.helpers } : helpers;

  const resolve = node => {
    if (node.skip) return;

    if (context === undefined) {
      return;
    }

    if (node.type === 'paren') {
      const args = [];

      for (let i = 1; i < node.nodes.length - 1; i++) {
        const child = node.nodes[i];

        if (child.type === 'integer') {
          args.push(Number(child.value));
          continue;
        }

        if (child.type === 'quoted') {
          args.push(utils.unquote(child.value));
          continue;
        }

        if (child.type === 'ident') {
          args.push(getValue(context, child.value));
          continue;
        }
      }

      context = `(${args.join('..')})`;
      return;
    }

    if (node.nodes) {
      node.nodes.forEach(child => resolve(child));
      return;
    }

    if (node.type === 'ident') {
      const sibs = node.siblings.filter(n => n.type === 'ident' || n.type === 'quoted');
      let value = node.value;

      if (node.parent.type === 'bracket') {
        let temp = orig;
        value = getValue(temp, value);

        if (utils.isObject(value)) {
          let index = sibs.indexOf(node) + 1;
          let next = sibs[index];

          while (utils.isObject(value) && utils.isObject(next) && temp) {
            const key = next.value;
            value = getValue(value, key);
            next.skip = true;
            temp = getValue(temp, value);
            next = sibs[++index];
          }
        }
      }

      prev = context;
      const helper = fns[value];
      context = typeof helper === 'function' ? helper(context) : context?.[value];

      if (options.strict === true) {
        throw new Error(`Variable is undefined: "${node.value}"`);
      }

      return;
    }

    if (node.type === 'integer') {
      prev = context;
      context = context[Number(node.value)];
      return;
    }

    if (node.type === 'quoted') {
      prev = context;
      context = context[node.match[2]];
    }
  };

  resolve(ast);

  if (typeof context === 'function') {
    context.context = prev;
  }

  return context;
};

module.exports = compile;
