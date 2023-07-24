# html-dom-parser

[![NPM](https://nodei.co/npm/html-dom-parser.png)](https://nodei.co/npm/html-dom-parser/)

[![NPM version](https://img.shields.io/npm/v/html-dom-parser.svg)](https://www.npmjs.com/package/html-dom-parser)
[![Build Status](https://travis-ci.org/remarkablemark/html-dom-parser.svg?branch=master)](https://travis-ci.org/remarkablemark/html-dom-parser)
[![Coverage Status](https://coveralls.io/repos/github/remarkablemark/html-dom-parser/badge.svg?branch=master)](https://coveralls.io/github/remarkablemark/html-dom-parser?branch=master)
[![Dependency status](https://david-dm.org/remarkablemark/html-dom-parser.svg)](https://david-dm.org/remarkablemark/html-dom-parser)

An HTML to DOM parser that works on both the server and client.

## Installation

NPM:

```sh
$ npm install html-dom-parser
```

CDN:

```html
<script src="https://unpkg.com/html-dom-parser@latest/dist/html-dom-parser.js"></script>
```

## Usage

```js
// server
var Parser = require('html-dom-parser');

// client
var Parser = window.HTMLDOMParser;

Parser('<p>Hello, world!</p>');
```

Output:

```js
[ { type: 'tag',
    name: 'p',
    attribs: {},
    children:
     [ { data: 'Hello, world!',
         type: 'text',
         next: null,
         prev: null,
         parent: [Circular] } ],
    next: null,
    prev: null,
    parent: null } ]
```

The server parser is a wrapper of [htmlparser2](https://github.com/fb55/htmlparser2)'s `parseDOM()` and the client parser uses the browser's [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) API to mimic the output of the server parser.

## Testing

```sh
$ npm test
$ npm run lint
```

## License

[MIT](https://github.com/remarkablemark/html-dom-parser/blob/master/LICENSE)
