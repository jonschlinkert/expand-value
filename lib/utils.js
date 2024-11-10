'use strict';

const { defineProperty } = Reflect;

exports.isNumber = require('is-number');
exports.isObject = val => val && typeof val === 'object' && !Array.isArray(val);

exports.unquote = str => {
  if (!str) return '';
  return str.replace(/^['"`]|['"`]$/g, '');
};

exports.define = (node, key, value) => {
  defineProperty(node, key, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
};

exports.size = value => {
  if (value == null) return 0;
  if (exports.isNumber(value)) return String(value).length;
  if (exports.isObject(value)) return Object.keys(value).length;
  if (typeof value.length === 'number') return value.length;
  if (typeof value.size === 'number') return value.size;
  return null;
};

exports.isValidObject = val => {
  return exports.isObject(val) || Array.isArray(val) || typeof val === 'function';
};

exports.isSafeKey = key => {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

exports.isValid = (key, data, options) => {
  if (!exports.isSafeKey(key)) {
    return false;
  }

  if (typeof options.isValid === 'function') {
    return options.isValid(key, data);
  }

  return true;
};

exports.isArrayLike = obj => {
  return obj != null && typeof obj === 'object' && typeof obj.length === 'number';
};

exports.toKey = value => {
  if (typeof value === 'symbol') return value;
  if (value === 0 && 1 / value === -Infinity) return '-0';
  return String(value);
};
