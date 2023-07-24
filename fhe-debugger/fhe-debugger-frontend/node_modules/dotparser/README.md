# dotparser

Parser of GraphViz dot file format.

 [![Build Status](https://github.com/anvaka/dotparser/actions/workflows/tests.yaml/badge.svg)](https://github.com/anvaka/dotparser/actions/workflows/tests.yaml)

# usage

``` js
 var parse = require('dotparser');
 var ast = parse('graph g {}');

 // ast is now an abstract syntax tree of an empty graph:
 // [{
 //   "type": "graph",
 //   "children": [],
 //   "id": "g"
 // }]
```

# why?

The produced output is not bound to any specific graph library. It can be used
by graph library authors to transform dot files into their own graph representation.

This implementation is capable of parsing all graphs from standard [graphviz test suite](https://github.com/ellson/graphviz/tree/master/rtest/graphs).

# install

With [npm](https://npmjs.org) do:

```
npm install dotparser
```

# compiling grammar

If you've changed grammar and want to have an updated parser, run this:

```
npm start
```

This will generate a new parser and save it into `grammar/dot.js` file

# license

MIT
