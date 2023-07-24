"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTransferList = getTransferList;
exports.getTransferListForWriter = getTransferListForWriter;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function getTransferList(object) {
  var recursive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var transfers = arguments.length > 2 ? arguments[2] : undefined;
  var transfersSet = transfers || new Set();
  if (!object) {} else if (isTransferable(object)) {
    transfersSet.add(object);
  } else if (isTransferable(object.buffer)) {
    transfersSet.add(object.buffer);
  } else if (ArrayBuffer.isView(object)) {} else if (recursive && (0, _typeof2.default)(object) === 'object') {
    for (var key in object) {
      getTransferList(object[key], recursive, transfersSet);
    }
  }
  return transfers === undefined ? Array.from(transfersSet) : [];
}
function isTransferable(object) {
  if (!object) {
    return false;
  }
  if (object instanceof ArrayBuffer) {
    return true;
  }
  if (typeof MessagePort !== 'undefined' && object instanceof MessagePort) {
    return true;
  }
  if (typeof ImageBitmap !== 'undefined' && object instanceof ImageBitmap) {
    return true;
  }
  if (typeof OffscreenCanvas !== 'undefined' && object instanceof OffscreenCanvas) {
    return true;
  }
  return false;
}
function getTransferListForWriter(object) {
  if (object === null) {
    return {};
  }
  var clone = Object.assign({}, object);
  Object.keys(clone).forEach(function (key) {
    if ((0, _typeof2.default)(object[key]) === 'object' && !ArrayBuffer.isView(object[key]) && !(object[key] instanceof Array)) {
      clone[key] = getTransferListForWriter(object[key]);
    } else if (typeof clone[key] === 'function' || clone[key] instanceof RegExp) {
      clone[key] = {};
    } else {
      clone[key] = object[key];
    }
  });
  return clone;
}
//# sourceMappingURL=get-transfer-list.js.map