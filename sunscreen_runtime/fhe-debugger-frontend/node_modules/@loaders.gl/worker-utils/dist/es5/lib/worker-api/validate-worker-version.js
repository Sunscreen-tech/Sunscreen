"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateWorkerVersion = validateWorkerVersion;
var _assert = require("../env-utils/assert");
var _version = require("../env-utils/version");
function validateWorkerVersion(worker) {
  var coreVersion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _version.VERSION;
  (0, _assert.assert)(worker, 'no worker provided');
  var workerVersion = worker.version;
  if (!coreVersion || !workerVersion) {
    return false;
  }
  return true;
}
function parseVersion(version) {
  var parts = version.split('.').map(Number);
  return {
    major: parts[0],
    minor: parts[1]
  };
}
//# sourceMappingURL=validate-worker-version.js.map