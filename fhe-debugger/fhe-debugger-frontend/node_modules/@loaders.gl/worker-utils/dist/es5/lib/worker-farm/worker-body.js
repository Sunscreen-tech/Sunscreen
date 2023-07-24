"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _getTransferList = require("../worker-utils/get-transfer-list");
function getParentPort() {
  var parentPort;
  try {
    eval('globalThis.parentPort = require(\'worker_threads\').parentPort');
    parentPort = globalThis.parentPort;
  } catch (_unused) {}
  return parentPort;
}
var onMessageWrapperMap = new Map();
var WorkerBody = function () {
  function WorkerBody() {
    (0, _classCallCheck2.default)(this, WorkerBody);
  }
  (0, _createClass2.default)(WorkerBody, null, [{
    key: "inWorkerThread",
    value: function inWorkerThread() {
      return typeof self !== 'undefined' || Boolean(getParentPort());
    }
  }, {
    key: "onmessage",
    set: function set(onMessage) {
      function handleMessage(message) {
        var parentPort = getParentPort();
        var _ref = parentPort ? message : message.data,
          type = _ref.type,
          payload = _ref.payload;
        onMessage(type, payload);
      }
      var parentPort = getParentPort();
      if (parentPort) {
        parentPort.on('message', handleMessage);
        parentPort.on('exit', function () {
          return console.debug('Node worker closing');
        });
      } else {
        globalThis.onmessage = handleMessage;
      }
    }
  }, {
    key: "addEventListener",
    value: function addEventListener(onMessage) {
      var onMessageWrapper = onMessageWrapperMap.get(onMessage);
      if (!onMessageWrapper) {
        onMessageWrapper = function onMessageWrapper(message) {
          if (!isKnownMessage(message)) {
            return;
          }
          var parentPort = getParentPort();
          var _ref2 = parentPort ? message : message.data,
            type = _ref2.type,
            payload = _ref2.payload;
          onMessage(type, payload);
        };
      }
      var parentPort = getParentPort();
      if (parentPort) {
        console.error('not implemented');
      } else {
        globalThis.addEventListener('message', onMessageWrapper);
      }
    }
  }, {
    key: "removeEventListener",
    value: function removeEventListener(onMessage) {
      var onMessageWrapper = onMessageWrapperMap.get(onMessage);
      onMessageWrapperMap.delete(onMessage);
      var parentPort = getParentPort();
      if (parentPort) {
        console.error('not implemented');
      } else {
        globalThis.removeEventListener('message', onMessageWrapper);
      }
    }
  }, {
    key: "postMessage",
    value: function postMessage(type, payload) {
      var data = {
        source: 'loaders.gl',
        type: type,
        payload: payload
      };
      var transferList = (0, _getTransferList.getTransferList)(payload);
      var parentPort = getParentPort();
      if (parentPort) {
        parentPort.postMessage(data, transferList);
      } else {
        globalThis.postMessage(data, transferList);
      }
    }
  }]);
  return WorkerBody;
}();
exports.default = WorkerBody;
function isKnownMessage(message) {
  var type = message.type,
    data = message.data;
  return type === 'message' && data && typeof data.source === 'string' && data.source.startsWith('loaders.gl');
}
//# sourceMappingURL=worker-body.js.map