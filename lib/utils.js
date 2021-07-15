'use strict';

const { defineProperty } = Reflect;

exports.isNumber = require('is-number');
exports.isNil = value => value === null || value === undefined;
exports.isObject = val => val && typeof val === 'object' && !Array.isArray(val);
exports.define = (node, key, value) => {
  defineProperty(node, key, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
};

exports.size = value => {
  if (exports.isNil(value)) return 0;
  if (exports.isNumber(value)) return Number(value);
  if (exports.isObject(value)) return Object.keys(value).length;
  if (typeof value.length === 'number') return value.length;
  if (typeof value.size === 'number') return value.size;
  return null;
};

exports.isValidObject = val => {
  return exports.isObject(val) || Array.isArray(val) || typeof val === 'function';
};
