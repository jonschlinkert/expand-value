# expand-value [![NPM version](https://img.shields.io/npm/v/expand-value.svg?style=flat)](https://www.npmjs.com/package/expand-value) [![NPM monthly downloads](https://img.shields.io/npm/dm/expand-value.svg?style=flat)](https://npmjs.org/package/expand-value) [![NPM total downloads](https://img.shields.io/npm/dt/expand-value.svg?style=flat)](https://npmjs.org/package/expand-value)

> Get deeply nested values from an object, like dot-prop and get-value, but with support for advanced features like bracket-notation and more.

Please consider following this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), and consider starring the project to show your :heart: and support.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save expand-value
```

## Usage

Similar to [get-value](https://github.com/jonschlinkert/get-value) and [dot-prop](https://github.com/sindresorhus/dot-prop) (and passes all of the `get-value` unit tests), but supports more complex expressions for accessing deeply nested properties. For example, this library is used by [Dry](https://github.com/jonschlinkert/dry) for resolving values in expressions in user-defined templates.

## expand

Examples for using the main export (the `expand` function).

### Basic Property Access

Access nested properties using dot notation.

```ts
import expand from 'expand-value';

const data = { user: { name: 'Brian', username: 'doowb' }, key: 'username' };

console.log(expand(data, 'user.name')); //=> 'Brian'
console.log(expand(data, 'user.username')); //=> 'doowb'
```

### Bracket Notation

Access properties using bracket notation with string keys.

```ts
import expand from 'expand-value';

const data = { user: { name: 'Brian', username: 'doowb' }, key: 'username' };

console.log(expand(data, 'user["name"]')); //=> 'Brian'
console.log(expand(data, 'user["username"]')); //=> 'doowb'
```

### Computed Property Access

Use bracket notation with variables to access properties dynamically.

```ts
import expand from 'expand-value';

const data = {
  user: { name: 'Brian', username: 'doowb' },
  key: 'username'
};

console.log(expand(data, 'user[key]')); //=> 'doowb'
```

Get array values using computed property names.

```ts
import expand from 'expand-value';

const data = {
  items: ['apple', 'banana', 'cherry'],
  index: 2
};

console.log(expand(data, 'items[index]')); //=> 'cherry'
```

### Mixed Notation

Combine dot notation and bracket notation in the same path.

```ts
import expand from 'expand-value';

const data = { foo: { bar: { baz: 'correct' } } };

console.log(expand(data, 'foo["bar"].baz')); //=> 'correct'
```

### Array Index Access

Access array elements using numeric indices.

```ts
import expand from 'expand-value';

const data = { items: ['first', 'second', 'third'] };

console.log(expand(data, 'items[0]')); //=> 'first'
console.log(expand(data, 'items[1]')); //=> 'second'
console.log(expand(data, 'items.2')); //=> 'third'
```

Access array elements using basic math expressions.

```ts
import expand from 'expand-value';

const data = { items: ['first', 'second', 'third', 'fourth'] };

console.log(expand(data, 'items[items.length - 1]')); //=> 'fourth'
console.log(expand(data, 'items[1 + 1]')); //=> 'third'
```

### Negative Array Indices

Access array elements from the end using negative indices.

```ts
import expand from 'expand-value';

const data = { items: ['first', 'second', 'third'] };

console.log(expand(data, 'items[-1]')); //=> 'third'
console.log(expand(data, 'items[-2]')); //=> 'second'
```

### Special Number Values

Handle special JavaScript number values like NaN and Infinity.

```ts
import expand from 'expand-value';

const data = {
  'NaN': 'not a number',
  'Infinity': 'infinite',
  '-Infinity': 'negative infinite',
  '-0': 'negative zero'
};

console.log(expand(data, 'NaN')); //=> 'not a number'
console.log(expand(data, 'Infinity')); //=> 'infinite'
console.log(expand(data, '-Infinity')); //=> 'negative infinite'
console.log(expand(data, '-0')); //=> 'negative zero'
```

### Symbol Properties

Access properties defined with Symbol keys.

```ts
import expand from 'expand-value';

const symbolKey = Symbol('mySymbol');
const data = { [symbolKey]: 'symbol value' };

console.log(expand(data, 'Symbol(mySymbol)')); //=> 'symbol value'
```

### Escaped Characters

Handle escaped characters in property names.

```ts
import expand from 'expand-value';

const data = { 'prop.with.dots': 'escaped value' };

console.log(expand(data, 'prop\\.with\\.dots')); //=> 'escaped value'
```

### Function Properties

Execute functions found in the property path.

```ts
import expand from 'expand-value';

const data = {
  user: {
    getName: function () {
      return 'Brian';
    },
    context: 'user object'
  }
};

console.log(expand(data, 'user.getName')); //=> 'Brian'
```

### Helper Functions

Use custom helper functions to process values.

```ts
import expand from 'expand-value';

const data = { items: ['apple', 'banana', 'cherry'] };
const options = {
  helpers: {
    first: arr => (Array.isArray(arr) ? arr[0] : arr),
    last: arr => (Array.isArray(arr) ? arr[arr.length - 1] : arr)
  }
};

console.log(expand(data, 'items.first', options)); //=> 'apple'
console.log(expand(data, 'items.last', options)); //=> 'cherry'
```

### Fallback Values

Provide fallback values when properties don't exist.

```ts
import expand from 'expand-value';

const data = { user: { name: 'Brian' } };

console.log(expand(data, 'user.missing', 'default value')); //=> 'default value'
console.log(expand(data, 'user.missing', { default: 'fallback' })); //=> 'fallback'
```

### Strict Mode

Enable strict mode to throw errors for undefined variables.

```ts
import expand from 'expand-value';

const data = { user: { name: 'Brian' } };

try {
  expand(data, 'user.missing', { strict: true });
} catch (error) {
  console.log(error.message); //=> 'Variable is undefined: "missing"'
}
```

### Custom Separators

Use custom separators instead of dots for property access.

```ts
import expand from 'expand-value';

const data = { user: { profile: { email: 'brian@example.com' } } };

console.log(expand(data, 'user->profile->email', { separator: '->' })); //=> 'brian@example.com'
```

### Property Validation

Use custom validation to control which properties can be accessed.

```ts
import expand from 'expand-value';

const data = {
  public: { info: 'accessible' },
  private: { secret: 'hidden' }
};

const options = {
  isValid: (key, obj) => !key.startsWith('private')
};

console.log(expand(data, 'public.info', options)); //=> 'accessible'
console.log(expand(data, 'private.secret', options)); //=> undefined
```

### Range Expressions

Use parentheses with range expressions for complex operations.

```ts
import expand from 'expand-value';

const data = { items: ['a', 'b', 'c', 'd', 'e'] };

console.log(expand(data, 'items[1..3]')); //=> ['b', 'c', 'd']
```

### Quoted Property Names

Access properties with spaces or special characters using quoted strings.

```ts
import expand from 'expand-value';

const data = { 'property with spaces': 'value', 'special-chars!': 'works' };

console.log(expand(data, '"property with spaces"')); //=> 'value'
console.log(expand(data, "'special-chars!'")); //=> 'works'
```

### Chained Property Resolution

Resolve complex property chains with multiple levels of indirection.

```ts
import expand from 'expand-value';

const data = {
  config: { theme: 'dark' },
  themes: {
    dark: { background: 'black', text: 'white' },
    light: { background: 'white', text: 'black' }
  },
  setting: 'theme'
};

console.log(expand(data, 'themes[config[setting]].background')); //=> 'black'
```

## .parse

```ts
import { parse } from 'expand-value';

const { ast } = parse('a.b.c');
console.log(ast);

// results in
{
  type: 'root',
  nodes: [
    { type: 'ident', value: 'a' },
    { type: 'separator', value: '.' },
    { type: 'ident', value: 'b' },
    { type: 'separator', value: '.' },
    { type: 'ident', value: 'c' }
  ]
}
```

## About

<details>
<summary><strong>Contributing</strong></summary>

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](.github/contributing.md) for advice on opening issues, pull requests, and coding standards.

</details>

<details>
<summary><strong>Running Tests</strong></summary>

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

</details>

<details>
<summary><strong>Building docs</strong></summary>

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

</details>

### Related projects

You might also be interested in these projects:

* [dry](https://www.npmjs.com/package/dry): Dry is superset of the Liquid templating language, with first-class support for advanced inheritance features… [more](https://github.com/jonschlinkert/dry) | [homepage](https://github.com/jonschlinkert/dry "Dry is superset of the Liquid templating language, with first-class support for advanced inheritance features, and more.")
* [get-value](https://www.npmjs.com/package/get-value): Use property paths like 'a.b.c' to get a nested value from an object. Even works… [more](https://github.com/jonschlinkert/get-value) | [homepage](https://github.com/jonschlinkert/get-value "Use property paths like 'a.b.c' to get a nested value from an object. Even works when keys have dots in them (no other dot-prop library we tested does this, or does it correctly).")

### Contributors

| **Commits** | **Contributor** |  
| --- | --- |  
| 16 | [jonschlinkert](https://github.com/jonschlinkert) |  
| 1  | [aykutkardas](https://github.com/aykutkardas) |  

### Author

**Jon Schlinkert**

* [GitHub Profile](https://github.com/jonschlinkert)
* [Twitter Profile](https://twitter.com/jonschlinkert)
* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)

### License

Copyright © 2025, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.8.0, on December 15, 2025._