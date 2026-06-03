const { defineProperty } = Reflect;

export class Token {
  type: string;
  value: unknown;
  loc: unknown;
  match: unknown;

  constructor(token: { type: string; value: unknown; loc: unknown; match: unknown }) {
    this.type = token.type;
    this.value = token.value;
    defineProperty(this, 'loc', { value: token.loc, writable: true });
    defineProperty(this, 'match', { value: token.match });
  }
}

export default Token;
