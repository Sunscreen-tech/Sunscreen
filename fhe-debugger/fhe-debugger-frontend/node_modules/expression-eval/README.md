# expression-eval

[![Latest NPM release](https://img.shields.io/npm/v/expression-eval.svg)](https://www.npmjs.com/package/expression-eval)
[![Minzipped size](https://badgen.net/bundlephobia/minzip/expression-eval)](https://bundlephobia.com/result?p=expression-eval)
[![License](https://img.shields.io/npm/l/expression-eval.svg)](https://github.com/donmccurdy/expression-eval/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/donmccurdy/expression-eval.svg?branch=master)](https://travis-ci.com/donmccurdy/expression-eval)

JavaScript expression parsing and evaluation.

Powered by [jsep](https://github.com/soney/jsep).

## Installation

```
npm install --save expression-eval
```

## API

### Parsing

```javascript
const expr = require('expression-eval');
const ast = expr.parse('1 + foo');
```

The result of the parse is an AST (abstract syntax tree), like:

```json
{
  "type": "BinaryExpression",
  "operator": "+",
  "left": {
    "type": "Literal",
    "value": 1,
    "raw": "1"
  },
  "right": {
    "type": "Identifier",
    "name": "foo"
  }
}
```

### Evaluation

```javascript
const expr = require('expression-eval');
const ast = expr.parse('a + b / c'); // abstract syntax tree (AST)
const value = expr.eval(ast, {a: 2, b: 2, c: 5}); // 2.4
```

Alternatively, use `evalAsync` for asynchronous evaluation.

### Compilation

```javascript
const expr = require('expression-eval');
const fn = expr.compile('foo.bar + 10');
fn({foo: {bar: 'baz'}}); // 'baz10'
```

Alternatively, use `compileAsync` for asynchronous compilation.

## Security

Although this package does [avoid the use of `eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!), it _cannot guarantee that user-provided expressions, or user-provided inputs to evaluation, will not modify the state or behavior of your application_. Always use caution when combining user input and dynamic evaluation, and avoid it where possible.

For example:

```js
const ast = expr.parse('foo[bar](baz)()');
expr.eval(ast, {
  foo: String,
  bar: 'constructor',
  baz: 'console.log("im in ur logs");'
});
// Prints: "im in ur logs"
```

The kinds of expressions that can expose vulnerabilities can be more subtle than this, and are sometimes possible even in cases where users only provide primitive values as inputs to pre-defined expressions.

## License

MIT License.
