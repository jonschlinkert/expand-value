'use strict';

const set = require('set-value');
const get = require('.');

class ContextError extends Error {}

const handlers = {
  set(target, prop, value) {
    return prop in target ? ((target[prop] = value), true) : target.set(prop, value);
  },
  get(target, prop) {
    return prop in target ? target[prop] : target.get(prop);
  },
  has(target, prop) {
    return prop in target ? true : target.has(prop);
  },
  ownKeys(target) {
    return target.keys();
  },
  deleteProperty(target, prop) {
    if (prop in target) {
      delete target[prop];
      return true;
    }
    return target.delete(prop);
  }
};

class Context {
  constructor() {
    this.scopes = [];
    return new Proxy(this, handlers);
  }

  get(key) {
    return get(this.scope, key);
  }

  set(key, value) {
    set(this.scope, key, value);
    return true;
  }

  delete(key) {
    const segs = key.split('.');
    const prop = segs.pop();
    let scope = this.scope;

    if (segs.length > 0) {
      scope = this.get(segs.join('.'));
    }

    if (!(prop in scope)) {
      return false;
    }

    delete scope[prop];
    return true;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  key(key) {
    return this.has(key);
  }

  keys() {
    return Reflect.ownKeys(this.scope);
  }

  push(locals = {}) {
    this.scopes.unshift(locals);
    return locals;
  }

  // Merge local variables onto the current scope
  merge(locals) {
    Object.assign(this.scope, locals);
  }

  pop() {
    if (this.scopes.length === 1) {
      throw new ContextError();
    }
    this.scopes.shift();
  }

  invoke(method, ...args) {
    return this.strainer.invoke(method, ...args).to_liquid();
  }

  stack(locals, block) {
    if (typeof locals === 'function') {
      block = locals;
      locals = {};
    }

    this.push(locals);
    block();
    this.pop();
  }

  get scope() {
    return this.scopes[this.scopes.length - 1] || this.push({});
  }
}

module.exports = Context;

const context = new Context();

context.stack({}, () => {

});

context.stack(() => {

});

console.log('---');
context.foo = 'bar';
console.log(context.has('foo'));
console.log(context.has('bar'));
console.log(context);
console.log('---');
context.a = 'b';
context.set('c', 'd');
console.log(context);
console.log('---');

delete context.foo;
console.log(context);
console.log('---');
context.abc = 'xyz';
console.log('abc' in context);
console.log(context);
console.log('---');
context.scopes = [{}];
console.log(context);

// console.log(Object.keys(context));
console.log(Reflect.ownKeys(context));
console.log('---');
