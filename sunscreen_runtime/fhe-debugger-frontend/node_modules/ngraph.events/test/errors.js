var test = require('tap').test,
    eventify = require('..');

test('Eventify protects your object', function(t) {
   t.plan(1);
   try {
     eventify({
       on: "I'm a dummy string, please don't wipe me out"
     });
   } catch (e) {
     t.ok(true, 'Eventify should thrown an exception to protect your object');
   }
   t.end();
});

test('Eventify does not allow falsy objects', function(t) {
   t.plan(1);
   try {
     eventify(false);
   } catch (e) {
     t.ok(true, 'Eventify should thrown an exception to protect your object');
   }
   t.end();
});

test('Eventify does not allow to subscribe without function', function(t) {
   t.plan(1);
   var subject = eventify({});
   try {
     subject.on('foo')
   } catch (e) {
     t.ok(true, 'Eventify should thrown an exception: no function is specified');
   }
   t.end();
});
