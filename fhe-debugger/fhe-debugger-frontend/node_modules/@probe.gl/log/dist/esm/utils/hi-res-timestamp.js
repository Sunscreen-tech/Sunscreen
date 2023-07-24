import { window, process, isBrowser } from '@probe.gl/env';
export function getHiResTimestamp() {
  let timestamp;

  if (isBrowser && 'performance' in window) {
    var _window$performance, _window$performance$n;

    timestamp = window === null || window === void 0 ? void 0 : (_window$performance = window.performance) === null || _window$performance === void 0 ? void 0 : (_window$performance$n = _window$performance.now) === null || _window$performance$n === void 0 ? void 0 : _window$performance$n.call(_window$performance);
  } else if ('hrtime' in process) {
    var _process$hrtime;

    const timeParts = process === null || process === void 0 ? void 0 : (_process$hrtime = process.hrtime) === null || _process$hrtime === void 0 ? void 0 : _process$hrtime.call(process);
    timestamp = timeParts[0] * 1000 + timeParts[1] / 1e6;
  } else {
    timestamp = Date.now();
  }

  return timestamp;
}
//# sourceMappingURL=hi-res-timestamp.js.map