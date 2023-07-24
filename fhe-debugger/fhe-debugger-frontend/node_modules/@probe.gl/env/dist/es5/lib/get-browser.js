"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getBrowser;
exports.isMobile = isMobile;

var _isBrowser = _interopRequireDefault(require("./is-browser"));

var _isElectron = _interopRequireDefault(require("./is-electron"));

var window = globalThis;

function isMobile() {
  return typeof window.orientation !== 'undefined';
}

function getBrowser(mockUserAgent) {
  if (!mockUserAgent && !(0, _isBrowser.default)()) {
    return 'Node';
  }

  if ((0, _isElectron.default)(mockUserAgent)) {
    return 'Electron';
  }

  var navigator_ = typeof navigator !== 'undefined' ? navigator : {};
  var userAgent = mockUserAgent || navigator_.userAgent || '';

  if (userAgent.indexOf('Edge') > -1) {
    return 'Edge';
  }

  var isMSIE = userAgent.indexOf('MSIE ') !== -1;
  var isTrident = userAgent.indexOf('Trident/') !== -1;

  if (isMSIE || isTrident) {
    return 'IE';
  }

  if (window.chrome) {
    return 'Chrome';
  }

  if (window.safari) {
    return 'Safari';
  }

  if (window.mozInnerScreenX) {
    return 'Firefox';
  }

  return 'Unknown';
}
//# sourceMappingURL=get-browser.js.map