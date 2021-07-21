# expand-value [![NPM version](https://img.shields.io/npm/v/expand-value.svg?style=flat)](https://www.npmjs.com/package/expand-value) [![NPM monthly downloads](https://img.shields.io/npm/dm/expand-value.svg?style=flat)](https://npmjs.org/package/expand-value) [![NPM total downloads](https://img.shields.io/npm/dt/expand-value.svg?style=flat)](https://npmjs.org/package/expand-value)

> Expand deeply nested values from an object, with support for advanced features.

Please consider following this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), and consider starring the project to show your :heart: and support.

## Install

Install with [npm](https://www.npmjs.com/) (requires [Node.js](https://nodejs.org/en/) >=14):

```sh
$ npm install --save expand-value
```

## Usage

Similar to [get-value](https://github.com/jonschlinkert/get-value) and [dot-prop](https://github.com/sindresorhus/dot-prop) (and passes all of the `get-value` unit tests), but supports more complex expressions for accessing deeply nested properties. For example, this library is used by [Dry](https://github.com/jonschlinkert/dry) for resolving values in expressions in user-defined templates.

```js
const expand = require('expand-value');

const data = { user: { name: 'Brian' }, key: 'name' };

console.log(expand(data, 'user.name')) //=> 'Brian'
console.log(expand(data, 'user["name"]')) //=> 'Brian'
console.log(expand(data, 'user[key]')) //=> 'Brian'

console.log(expand({ foo: { bar: { baz: 'correct' } } }, 'foo["bar"].baz')); //=> 'correct'
```

## .parse

```js
const { parse } = require('expand-value);
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

### Author

**Jon Schlinkert**

* [GitHub Profile](https://github.com/jonschlinkert)
* [Twitter Profile](https://twitter.com/jonschlinkert)
* [LinkedIn Profile](https://linkedin.com/in/jonschlinkert)

### License

Copyright © 2021, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.8.0, on July 20, 2021._