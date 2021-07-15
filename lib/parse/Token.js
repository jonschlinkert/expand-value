'use strict';

const { defineProperty } = Reflect;

class Token {
  constructor(token) {
    this.type = token.type;
    this.value = token.value;
    defineProperty(this, 'loc', { value: token.loc, writable: true });
    defineProperty(this, 'match', { value: token.match });
  }
}

module.exports = Token;
