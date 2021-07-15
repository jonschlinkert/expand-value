'use strict';

const { isObject, size } = require('./utils');

exports.first = value => {
  if (value instanceof Set || value instanceof Map) {
    value = [...value];
  }
  if (isObject(value)) {
    return typeof value.first === 'function' ? value.first() : value.first;
  }
  if (Array.isArray(value) || typeof value === 'string') {
    return value[0];
  }
};

exports.last = value => {
  if (value instanceof Set || value instanceof Map) {
    value = [...value];
  }
  if (isObject(value)) {
    return typeof value.last === 'function' ? value.last() : value.last;
  }
  if (Array.isArray(value) || typeof value === 'string') {
    return value[value.length - 1];
  }
};

exports.length = value => {
  if (isObject(value) && typeof value.length === 'number') {
    return value.length;
  }
  return size(value);
};

exports.size = value => {
  if (isObject(value) && typeof value.size === 'number') {
    return value.size;
  }
  return size(value);
};
