import { getGraphemes, isObject, size as utilsSize } from '~/utils';

export const first = value => {
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
    const graphemes = getGraphemes(value.slice(0, 20));
    return graphemes[0];
  }

  return value[0];
};

export const last = value => {
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
    const graphemes = getGraphemes(value.slice(-20));
    return graphemes[graphemes.length - 1];
  }

  return value[value.length - 1];
};

export const length = value => {
  if (typeof value?.length === 'number') {
    return value.length;
  }

  if (typeof value?.size === 'number') {
    return value.size;
  }

  return size(value);
};

export const size = value => {
  if (value === null) {
    return 1;
  }

  if (typeof value?.size === 'number') {
    return value.size;
  }

  if (typeof value?.length === 'number') {
    return value.length;
  }

  return utilsSize(value);
};
