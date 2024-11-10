'use strict';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isEmpty = v => v === undefined || v === null || (Array.isArray(v) && v.length === 0);

const prune = obj => {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(v => prune(v));
  }

  const node = {};

  for (const [k, v] of Object.entries(obj)) {
    if (isEmpty(v)) continue;
    if (Array.isArray(v)) {
      node[k] = v.map(prune);
    } else if (isObject(v)) {
      node[k] = prune(v);
    } else {
      node[k] = v;
    }
  }

  return node;
};

module.exports = prune;
