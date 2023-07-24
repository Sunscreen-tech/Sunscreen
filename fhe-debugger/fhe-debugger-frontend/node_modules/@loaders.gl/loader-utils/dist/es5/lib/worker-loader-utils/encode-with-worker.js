"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.canEncodeWithWorker = canEncodeWithWorker;
var _workerUtils = require("@loaders.gl/worker-utils");
var _globals = require("../env-utils/globals");
function canEncodeWithWorker(writer, options) {
  if (!_workerUtils.WorkerFarm.isSupported()) {
    return false;
  }
  if (!_globals.isBrowser && !(options !== null && options !== void 0 && options._nodeWorkers)) {
    return false;
  }
  return writer.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
//# sourceMappingURL=encode-with-worker.js.map