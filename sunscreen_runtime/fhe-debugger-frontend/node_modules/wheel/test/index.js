var test = require('tap').test;

var api = require('../');

test('it exists', function(t) {
  t.ok(typeof api === 'function', 'Api is there');
  t.ok(typeof api.addWheelListener === 'function', 'You can add wheel listener');
  t.ok(typeof api.removeWheelListener === 'function', 'You can remove wheel listener');

  t.end();
});
