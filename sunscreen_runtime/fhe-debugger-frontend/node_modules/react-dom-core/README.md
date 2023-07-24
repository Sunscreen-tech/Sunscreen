# react-dom-core

[![NPM](https://nodei.co/npm/react-dom-core.png)](https://nodei.co/npm/react-dom-core/)

[![NPM version](https://img.shields.io/npm/v/react-dom-core.svg)](https://www.npmjs.com/package/react-dom-core)
[![Dependency status](https://david-dm.org/remarkablemark/react-dom-core.svg)](https://david-dm.org/remarkablemark/react-dom-core)

A package that exposes the core/internals of [react-dom@15](https://unpkg.com/react-dom@15/lib/).

## Install

```sh
# with npm
npm install react-dom-core --save

# with yarn
yarn add react-dom-core
```

Additional modules may be installed:
- [fbjs](https://www.npmjs.com/package/fbjs)
- [object-assign](https://www.npmjs.com/package/object-assign)

## Usage

You can find the modules in [lib](https://unpkg.com/react-dom-core/lib/).

CommonJS:

```js
var HTMLDOMPropertyConfig = require('react-dom-core/lib/HTMLDOMPropertyConfig');
```

ES Modules:

```js
import SVGDOMPropertyConfig from 'react-dom-core/lib/SVGDOMPropertyConfig';
```

## License

See [license](https://github.com/facebook/react#license) from original project.
