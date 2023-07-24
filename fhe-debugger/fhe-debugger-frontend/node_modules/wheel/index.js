/**
 * This module used to unify mouse wheel behavior between different browsers in 2014
 * Now it's just a wrapper around addEventListener('wheel');
 *
 * Usage:
 *  var addWheelListener = require('wheel').addWheelListener;
 *  var removeWheelListener = require('wheel').removeWheelListener;
 *  addWheelListener(domElement, function (e) {
 *    // mouse wheel event
 *  });
 *  removeWheelListener(domElement, function);
 */

module.exports = addWheelListener;

// But also expose "advanced" api with unsubscribe:
module.exports.addWheelListener = addWheelListener;
module.exports.removeWheelListener = removeWheelListener;


function addWheelListener(element, listener, useCapture) {
  element.addEventListener('wheel', listener, useCapture);
}

function removeWheelListener( element, listener, useCapture ) {
  element.removeEventListener('wheel', listener, useCapture);
}