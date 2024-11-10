'use strict';

const { isObject, size } = require('./utils');

const getSegments = (input, language = 'en', granularity) => {
  const segmenter = new Intl.Segmenter(language, { granularity, localeMatcher: 'best fit' });
  return Array.from(segmenter.segment(input));
};

exports.first = value => {
  if (!value) return;

  if (value instanceof Set || value instanceof Map) {
    value = [...value];
  }

  if (isObject(value)) {
    return typeof value.first === 'function' ? value.first() : value.first;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === 'string') {
    const segments = getSegments(value);
    return segments[0].segment;
  }
};

exports.last = value => {
  if (!value) return;

  if (value instanceof Set || value instanceof Map) {
    value = [...value];
  }

  if (isObject(value)) {
    return typeof value.last === 'function' ? value.last() : value.last;
  }

  if (Array.isArray(value)) {
    return value[value.length - 1];
  }

  if (typeof value === 'string') {
    const segments = getSegments(value);
    return segments[segments.length - 1].segment;
  }
};

exports.length = value => {
  if (typeof value?.length === 'number') {
    return value.length;
  }

  if (typeof value?.size === 'number') {
    return value.size;
  }

  return size(value);
};

exports.size = value => {
  if (value === null) {
    return 1;
  }

  if (typeof value?.size === 'number') {
    return value.size;
  }

  if (typeof value?.length === 'number') {
    return value.length;
  }

  return size(value);
};
