"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeIterator = makeIterator;
var _makeStringIterator = require("./make-string-iterator");
var _makeArrayBufferIterator = require("./make-array-buffer-iterator");
var _makeBlobIterator = require("./make-blob-iterator");
var _makeStreamIterator = require("./make-stream-iterator");
var _isType = require("../../javascript-utils/is-type");
function makeIterator(data, options) {
  if (typeof data === 'string') {
    return (0, _makeStringIterator.makeStringIterator)(data, options);
  }
  if (data instanceof ArrayBuffer) {
    return (0, _makeArrayBufferIterator.makeArrayBufferIterator)(data, options);
  }
  if ((0, _isType.isBlob)(data)) {
    return (0, _makeBlobIterator.makeBlobIterator)(data, options);
  }
  if ((0, _isType.isReadableStream)(data)) {
    return (0, _makeStreamIterator.makeStreamIterator)(data, options);
  }
  if ((0, _isType.isResponse)(data)) {
    var response = data;
    return (0, _makeStreamIterator.makeStreamIterator)(response.body, options);
  }
  throw new Error('makeIterator');
}
//# sourceMappingURL=make-iterator.js.map