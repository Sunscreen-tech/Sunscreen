"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.count = count;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var ERR_NOT_OBJECT = 'count(): argument not an object';
var ERR_NOT_CONTAINER = 'count(): argument not a container';

function count(container) {
  if (!isObject(container)) {
    throw new Error(ERR_NOT_OBJECT);
  }

  if (typeof container.count === 'function') {
    return container.count();
  }

  if (Number.isFinite(container.size)) {
    return container.size;
  }

  if (Number.isFinite(container.length)) {
    return container.length;
  }

  if (isPlainObject(container)) {
    return Object.keys(container).length;
  }

  throw new Error(ERR_NOT_CONTAINER);
}

function isPlainObject(value) {
  return value !== null && (0, _typeof2.default)(value) === 'object' && value.constructor === Object;
}

function isObject(value) {
  return value !== null && (0, _typeof2.default)(value) === 'object';
}
//# sourceMappingURL=count.js.map