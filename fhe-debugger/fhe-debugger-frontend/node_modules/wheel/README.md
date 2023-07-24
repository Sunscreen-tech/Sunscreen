# wheel  [![Build Status](https://travis-ci.org/anvaka/wheel.svg)](https://travis-ci.org/anvaka/wheel)

In 2014 this module was supposed to unify handling of mouse whee event across
different browsers.

Now it's just a wrapper on top of `element.addEventListener('wheel', callback)`;

# Usage

``` js
var addWheelListener = require('wheel').addWheelListener;
var removeWheelListener = require('wheel').removeWheelListener;
addWheelListener(domElement, function (e) {
	// mouse wheel event
});
removeWheelListener(domElement, function);
```

You can also use a shortcut for addWheelListener:

``` js
var addWheelListener = require('wheel');
addWheelListener(domElement, function (e) {
	// mouse wheel event
});
```

# install

With [npm](https://npmjs.org) do:

```
npm install wheel
```

# license

MIT
