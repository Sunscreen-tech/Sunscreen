var test = require('tap').test,
    eventify = require('..');

test('fire fires callback', function(t) {
   var subject = {};
   eventify(subject);
   t.plan(1);
   subject.on('something', function (){
     t.ok(true, 'fired callback');
   });

   subject.fire('something');
   t.end();
});

test('fire fires all callbacks', function(t) {
   t.plan(2);

   var subject = eventify({});
   var onSomething = function (){
     t.ok(true, 'fired callback');
   };

   subject.on('something', onSomething);
   subject.on('something', onSomething);

   subject.fire('something');
   t.end();
});

test('Chaining can be used on fire and "on"', function(t) {
   t.plan(2);

   var subject = eventify({});
   var onSomething = function (){
     t.ok(true, 'fired callback');
   };

   subject.on('beep', onSomething).on('bop', onSomething);
   subject.fire('beep').fire('bop');

   t.end();
});

test('fire passes all arguments', function(t) {
   t.plan(2);

   var subject = eventify({});
   var testX = 42,
       testY = 'hello';

   subject.on('something', function (x, y){
     t.equal(x, testX, "X argument should be expected");
     t.equal(y, testY, "Y argument should be expected");
   });

   subject.fire('something', testX, testY);
   t.end();
});

test('"on" and fire preserves the context', function(t) {
   var subject = eventify({});
   var context = {};

   subject.on('something', function (){
     t.equal(this, context, "On should be called with expected context");
   }, context);

   subject.fire('something');
   t.end();
});

test('"off" removes passed listener', function(t) {
  t.plan(1);
   var subject = eventify({});
   var context = {};
   var onFoo = function (){
     t.ok(false, "off() did not properly removed the handler");
   };
   var onBar = function (){
     t.ok(true, "off() removed bar handler");
   };

   subject.on('foo', onFoo);
   subject.on('bar', onBar);

   subject.off('foo', onFoo);

   subject.fire('foo');
   subject.fire('bar');
   t.end();
});

test('"off" removes only one from the same event name', function(t) {
  t.plan(1);
   var subject = eventify({});
   var context = {};
   var onFoo1 = function (){
     t.ok(false, "off() did not properly removed the handler");
   };
   var onFoo2 = function (){
     t.ok(true, "off() removed wrong handler");
   };

   subject.on('foo', onFoo1);
   subject.on('foo', onFoo2);

   subject.off('foo', onFoo1);

   subject.fire('foo');
   t.end();
});

test('"off" removes all for given event name', function(t) {
   t.plan(0);
   var subject = eventify({});
   var context = {};
   var onFoo = function (){
     t.ok(false, "off() did not properly removed the handler");
   };

   subject.on('foo', onFoo);

   subject.off('foo');

   subject.fire('foo');
});

test('"off" removes all events', function(t) {
   t.plan(0);
   var subject = eventify({});
   var onFoo = function (){
     t.ok(false, "off() did not properly removed the handler");
   };

   subject.on('foo', onFoo);
   subject.on('bar', onFoo);
   subject.off();

   subject.fire('foo');
   subject.fire('bar');
});

test('"off" does not harm when no such event', function(t) {
   t.plan(1);
   var subject = eventify({});
   var onFoo = function () {
     t.ok(true, "off() called just one");
   };

   subject.on('foo', onFoo);
   subject.off('bar', onFoo);

   subject.fire('foo');
   subject.fire('bar');
});

test('"off" can remove by function', function(t) {
   t.plan(1);
   var subject = eventify({});
   var onFooYes = function () {
     t.ok(true, "off() called just one");
   };

   var onFooNo = function () {
     t.ok(false, "off() should not be called");
   };

   subject.on('foo', onFooYes);
   subject.on('foo', onFooNo);
   subject.off('foo', onFooNo);

   subject.fire('foo');
});

test('eventify can chain', function(t) {
  var subject = {};
  var eventifiedSubject = eventify(subject);
  t.ok(subject === eventifiedSubject, "eventified result should be the same as subject");
  t.end();
});
