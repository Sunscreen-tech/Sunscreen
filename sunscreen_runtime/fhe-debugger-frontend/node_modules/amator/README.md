# amator

Tiny animation library.

# usage

``` js
var animate = require('amator')
var from = { x: 0 }
var to = { x: 42 }

// This will animate from.x from 0 to 42 in 400ms, using cubic bezier easing
// function (same effect as default CSS `ease` function)
animate(from, to)
```

Overall the signature of the `animate()` function:

```js
animate(fromObj, toObj, options)
```

## options

This is a hash dictionary with the following keys:

* `duration` - sets animation duration in milliseconds. Default value is 400ms;
* `easing` - Easing function. Can accept predefined value similar to CSS animations:
  `ease`, `easeIn`, `easeOut`, `easeInOut`, `linear`; NOTE: You can also have a
  custom function instead of a string value. The function should take a single
  argument `t` from range [0..1] and return value from 0 to 1.
* `step(fromObj)` - a function callback that is called after each animation frame.
  the only argument to this function is `fromObj` that has current animation values.
* `done()` - a function callback that is called when animation is finished.

## return value

The return value of the `animate` is an object, which has just one key:

* `cancel()` - if you want to cancel animation before it completes, you can call
this method.

# license

MIT
