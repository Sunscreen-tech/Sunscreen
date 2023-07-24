"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getHiResTimestamp = getHiResTimestamp;

var _env = require("@probe.gl/env");

function getHiResTimestamp() {
  var timestamp;

  if (_env.isBrowser && 'performance' in _env.window) {
    var _window$performance, _window$performance$n;

    timestamp = _env.window === null || _env.window === void 0 ? void 0 : (_window$performance = _env.window.performance) === null || _window$performance === void 0 ? void 0 : (_window$performance$n = _window$performance.now) === null || _window$performance$n === void 0 ? void 0 : _window$performance$n.call(_window$performance);
  } else if ('hrtime' in _env.process) {
    var _process$hrtime;

    var timeParts = _env.process === null || _env.process === void 0 ? void 0 : (_process$hrtime = _env.process.hrtime) === null || _process$hrtime === void 0 ? void 0 : _process$hrtime.call(_env.process);
    timestamp = timeParts[0] * 1000 + timeParts[1] / 1e6;
  } else {
    timestamp = Date.now();
  }

  return timestamp;
}
//# sourceMappingURL=hi-res-timestamp.js.map