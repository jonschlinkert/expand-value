import isNumber from 'is-number';
import { Segmenter } from 'intl-segmenter';
export { isNumber };

const { defineProperty } = Reflect;

export const isObject = val => val && typeof val === 'object' && !Array.isArray(val);

export const unquote = str => {
  if (!str) return '';
  return str.replace(/^['"`]|['"`]$/g, '');
};

export const define = (node, key, value) => {
  defineProperty(node, key, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
};

export const size = value => {
  if (value == null) return 0;
  if (isNumber(value)) return String(value).length;
  if (isObject(value)) return Object.keys(value).length;
  if (typeof value.length === 'number') return value.length;
  if (typeof value.size === 'number') return value.size;
  return null;
};

export const isValidObject = val => {
  return isObject(val) || Array.isArray(val) || typeof val === 'function';
};

export const isSafeKey = key => {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

export const isValid = (key, data, options) => {
  if (!isSafeKey(key)) {
    return false;
  }

  if (typeof options.isValid === 'function') {
    return options.isValid(key, data);
  }

  return true;
};

export const isArrayLike = obj => {
  return obj != null && typeof obj === 'object' && typeof obj.length === 'number';
};

export const toKey = value => {
  if (typeof value === 'symbol') return value;
  if (value === 0 && 1 / value === -Infinity) return '-0';
  return String(value);
};

export const findSafeBreakPoint = input => {
  // Work backwards from the end of the input
  for (let i = input.length - 1; i >= 0; i--) {
    // Check for whitespace or simple ASCII characters
    if (/\s/.test(input[i]) || /^[\x20-\x7E]$/.test(input[i])) {
      return i + 1;
    }
  }

  // If no safe break points were found, return the full length
  return input.length;
};

export const getSegments = (input, language = 'en', granularity) => {
  const segmenter = new Segmenter(language, { granularity, localeMatcher: 'best fit' });
  return Array.from(segmenter.segment(input)).map(segment => segment.segment);
};

export const getGraphemes = (input, language = 'en', maxChunkLength = 500) => {
  const graphemes = [];
  let position = 0;

  while (position < input.length) {
    const remainingText = input.slice(position);
    const chunkSize = Math.min(maxChunkLength, remainingText.length);
    const potentialChunk = remainingText.slice(0, chunkSize);

    // Find a safe position to break the chunk
    const breakPoint = findSafeBreakPoint(potentialChunk);
    const chunk = potentialChunk.slice(0, breakPoint);

    // Process the chunk with Intl.Segmenter
    const chunkSegments = getSegments(chunk, language, 'grapheme');
    graphemes.push(...chunkSegments);

    position += breakPoint;
  }

  return graphemes;
};

// // // Example usage
// // const text = "Hello 👨‍👩‍👧‍👦 world! 🌍✨" + "a".repeat(1000);
// // console.log(getGraphemes(text));

// const start = new Date();
// // console.log(getGraphemes('a'.repeat(1_000_000)));
// const text = "Hello 👨‍👩‍👧‍👦 world! 🌍✨ a".repeat(1_000_000);
// console.log(Buffer.from(text).length.toLocaleString(), 'characters');
// console.log(getGraphemes(text));
// console.log(`Time: ${((new Date() - start) / 1000).toFixed(2)}s`);
