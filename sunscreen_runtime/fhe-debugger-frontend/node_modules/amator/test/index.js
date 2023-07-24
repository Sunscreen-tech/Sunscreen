var test = require('tap').test;
var animate = require('../');

test('it can animate objects', function(t) {
  var source = {
    x: 0
  };
  var target = {
    x: 42
  }

  animate(source, target, {
    duration: 100,
    done: function() {
      t.equals(source.x, 42, 'it animated source to target');
      t.end();
    }
  })
});

test('it can animate objects even when duration is 0', function(t) {
  var source = {
    x: 0
  };
  var target = {
    x: 42
  }

  animate(source, target, {
    duration: 0,
    done: function() {
      t.equals(source.x, 42, 'it animated source to target');
      t.end();
    }
  })
});

test('it notifies about each animation step', function(t) {
  var source = {
    x: 0
  };
  var target = {
    x: 42
  };

  var invokedCount = 0;

  animate(source, target, {
    duration: 10,
    step: function(currentValue) {
      t.ok(currentValue === source, 'source value is passed as an argument')
      invokedCount += 1;
    },

    done: function() {
      t.equals(source.x, 42, 'it animated source to target');
      t.ok(invokedCount > 0, 'It invoked step() at least once');
      t.end();
    }
  })
});
