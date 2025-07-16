const { defineProperty } = Reflect;

export class Token {
  type: string;
  value: any;
  loc: any;
  match: any;

  constructor(token: { type: string; value: any; loc: any; match: any }) {
    this.type = token.type;
    this.value = token.value;
    defineProperty(this, 'loc', { value: token.loc, writable: true });
    defineProperty(this, 'match', { value: token.match });
  }
}

export default Token;
