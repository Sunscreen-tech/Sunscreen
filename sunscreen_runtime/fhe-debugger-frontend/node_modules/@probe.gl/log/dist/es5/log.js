"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Log = void 0;
exports.normalizeArguments = normalizeArguments;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _env = require("@probe.gl/env");

var _localStorage = require("./utils/local-storage");

var _formatters = require("./utils/formatters");

var _color = require("./utils/color");

var _autobind = require("./utils/autobind");

var _assert2 = _interopRequireDefault(require("./utils/assert"));

var _hiResTimestamp = require("./utils/hi-res-timestamp");

var originalConsole = {
  debug: _env.isBrowser ? console.debug || console.log : console.log,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};
var DEFAULT_SETTINGS = {
  enabled: true,
  level: 0
};

function noop() {}

var cache = {};
var ONCE = {
  once: true
};

var Log = function () {
  function Log() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      id: ''
    },
        id = _ref.id;

    (0, _classCallCheck2.default)(this, Log);
    (0, _defineProperty2.default)(this, "id", void 0);
    (0, _defineProperty2.default)(this, "VERSION", _env.VERSION);
    (0, _defineProperty2.default)(this, "_startTs", (0, _hiResTimestamp.getHiResTimestamp)());
    (0, _defineProperty2.default)(this, "_deltaTs", (0, _hiResTimestamp.getHiResTimestamp)());
    (0, _defineProperty2.default)(this, "_storage", void 0);
    (0, _defineProperty2.default)(this, "userData", {});
    (0, _defineProperty2.default)(this, "LOG_THROTTLE_TIMEOUT", 0);
    this.id = id;
    this.userData = {};
    this._storage = new _localStorage.LocalStorage("__probe-".concat(this.id, "__"), DEFAULT_SETTINGS);
    this.timeStamp("".concat(this.id, " started"));
    (0, _autobind.autobind)(this);
    Object.seal(this);
  }

  (0, _createClass2.default)(Log, [{
    key: "level",
    get: function get() {
      return this.getLevel();
    },
    set: function set(newLevel) {
      this.setLevel(newLevel);
    }
  }, {
    key: "isEnabled",
    value: function isEnabled() {
      return this._storage.config.enabled;
    }
  }, {
    key: "getLevel",
    value: function getLevel() {
      return this._storage.config.level;
    }
  }, {
    key: "getTotal",
    value: function getTotal() {
      return Number(((0, _hiResTimestamp.getHiResTimestamp)() - this._startTs).toPrecision(10));
    }
  }, {
    key: "getDelta",
    value: function getDelta() {
      return Number(((0, _hiResTimestamp.getHiResTimestamp)() - this._deltaTs).toPrecision(10));
    }
  }, {
    key: "priority",
    get: function get() {
      return this.level;
    },
    set: function set(newPriority) {
      this.level = newPriority;
    }
  }, {
    key: "getPriority",
    value: function getPriority() {
      return this.level;
    }
  }, {
    key: "enable",
    value: function enable() {
      var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      this._storage.setConfiguration({
        enabled: enabled
      });

      return this;
    }
  }, {
    key: "setLevel",
    value: function setLevel(level) {
      this._storage.setConfiguration({
        level: level
      });

      return this;
    }
  }, {
    key: "get",
    value: function get(setting) {
      return this._storage.config[setting];
    }
  }, {
    key: "set",
    value: function set(setting, value) {
      this._storage.setConfiguration((0, _defineProperty2.default)({}, setting, value));
    }
  }, {
    key: "settings",
    value: function settings() {
      if (console.table) {
        console.table(this._storage.config);
      } else {
        console.log(this._storage.config);
      }
    }
  }, {
    key: "assert",
    value: function assert(condition, message) {
      (0, _assert2.default)(condition, message);
    }
  }, {
    key: "warn",
    value: function warn(message) {
      return this._getLogFunction(0, message, originalConsole.warn, arguments, ONCE);
    }
  }, {
    key: "error",
    value: function error(message) {
      return this._getLogFunction(0, message, originalConsole.error, arguments);
    }
  }, {
    key: "deprecated",
    value: function deprecated(oldUsage, newUsage) {
      return this.warn("`".concat(oldUsage, "` is deprecated and will be removed in a later version. Use `").concat(newUsage, "` instead"));
    }
  }, {
    key: "removed",
    value: function removed(oldUsage, newUsage) {
      return this.error("`".concat(oldUsage, "` has been removed. Use `").concat(newUsage, "` instead"));
    }
  }, {
    key: "probe",
    value: function probe(logLevel, message) {
      return this._getLogFunction(logLevel, message, originalConsole.log, arguments, {
        time: true,
        once: true
      });
    }
  }, {
    key: "log",
    value: function log(logLevel, message) {
      return this._getLogFunction(logLevel, message, originalConsole.debug, arguments);
    }
  }, {
    key: "info",
    value: function info(logLevel, message) {
      return this._getLogFunction(logLevel, message, console.info, arguments);
    }
  }, {
    key: "once",
    value: function once(logLevel, message) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }

      return this._getLogFunction(logLevel, message, originalConsole.debug || originalConsole.info, arguments, ONCE);
    }
  }, {
    key: "table",
    value: function table(logLevel, _table, columns) {
      if (_table) {
        return this._getLogFunction(logLevel, _table, console.table || noop, columns && [columns], {
          tag: getTableHeader(_table)
        });
      }

      return noop;
    }
  }, {
    key: "image",
    value: function image(_ref2) {
      var logLevel = _ref2.logLevel,
          priority = _ref2.priority,
          _image = _ref2.image,
          _ref2$message = _ref2.message,
          message = _ref2$message === void 0 ? '' : _ref2$message,
          _ref2$scale = _ref2.scale,
          scale = _ref2$scale === void 0 ? 1 : _ref2$scale;

      if (!this._shouldLog(logLevel || priority)) {
        return noop;
      }

      return _env.isBrowser ? logImageInBrowser({
        image: _image,
        message: message,
        scale: scale
      }) : logImageInNode({
        image: _image,
        message: message,
        scale: scale
      });
    }
  }, {
    key: "time",
    value: function time(logLevel, message) {
      return this._getLogFunction(logLevel, message, console.time ? console.time : console.info);
    }
  }, {
    key: "timeEnd",
    value: function timeEnd(logLevel, message) {
      return this._getLogFunction(logLevel, message, console.timeEnd ? console.timeEnd : console.info);
    }
  }, {
    key: "timeStamp",
    value: function timeStamp(logLevel, message) {
      return this._getLogFunction(logLevel, message, console.timeStamp || noop);
    }
  }, {
    key: "group",
    value: function group(logLevel, message) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        collapsed: false
      };
      var options = normalizeArguments({
        logLevel: logLevel,
        message: message,
        opts: opts
      });
      var collapsed = opts.collapsed;
      options.method = (collapsed ? console.groupCollapsed : console.group) || console.info;
      return this._getLogFunction(options);
    }
  }, {
    key: "groupCollapsed",
    value: function groupCollapsed(logLevel, message) {
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      return this.group(logLevel, message, Object.assign({}, opts, {
        collapsed: true
      }));
    }
  }, {
    key: "groupEnd",
    value: function groupEnd(logLevel) {
      return this._getLogFunction(logLevel, '', console.groupEnd || noop);
    }
  }, {
    key: "withGroup",
    value: function withGroup(logLevel, message, func) {
      this.group(logLevel, message)();

      try {
        func();
      } finally {
        this.groupEnd(logLevel)();
      }
    }
  }, {
    key: "trace",
    value: function trace() {
      if (console.trace) {
        console.trace();
      }
    }
  }, {
    key: "_shouldLog",
    value: function _shouldLog(logLevel) {
      return this.isEnabled() && this.getLevel() >= normalizeLogLevel(logLevel);
    }
  }, {
    key: "_getLogFunction",
    value: function _getLogFunction(logLevel, message, method, args, opts) {
      if (this._shouldLog(logLevel)) {
        var _method;

        opts = normalizeArguments({
          logLevel: logLevel,
          message: message,
          args: args,
          opts: opts
        });
        method = method || opts.method;
        (0, _assert2.default)(method);
        opts.total = this.getTotal();
        opts.delta = this.getDelta();
        this._deltaTs = (0, _hiResTimestamp.getHiResTimestamp)();
        var tag = opts.tag || opts.message;

        if (opts.once) {
          if (!cache[tag]) {
            cache[tag] = (0, _hiResTimestamp.getHiResTimestamp)();
          } else {
            return noop;
          }
        }

        message = decorateMessage(this.id, opts.message, opts);
        return (_method = method).bind.apply(_method, [console, message].concat((0, _toConsumableArray2.default)(opts.args)));
      }

      return noop;
    }
  }]);
  return Log;
}();

exports.Log = Log;
(0, _defineProperty2.default)(Log, "VERSION", _env.VERSION);

function normalizeLogLevel(logLevel) {
  if (!logLevel) {
    return 0;
  }

  var resolvedLevel;

  switch ((0, _typeof2.default)(logLevel)) {
    case 'number':
      resolvedLevel = logLevel;
      break;

    case 'object':
      resolvedLevel = logLevel.logLevel || logLevel.priority || 0;
      break;

    default:
      return 0;
  }

  (0, _assert2.default)(Number.isFinite(resolvedLevel) && resolvedLevel >= 0);
  return resolvedLevel;
}

function normalizeArguments(opts) {
  var logLevel = opts.logLevel,
      message = opts.message;
  opts.logLevel = normalizeLogLevel(logLevel);
  var args = opts.args ? Array.from(opts.args) : [];

  while (args.length && args.shift() !== message) {}

  switch ((0, _typeof2.default)(logLevel)) {
    case 'string':
    case 'function':
      if (message !== undefined) {
        args.unshift(message);
      }

      opts.message = logLevel;
      break;

    case 'object':
      Object.assign(opts, logLevel);
      break;

    default:
  }

  if (typeof opts.message === 'function') {
    opts.message = opts.message();
  }

  var messageType = (0, _typeof2.default)(opts.message);
  (0, _assert2.default)(messageType === 'string' || messageType === 'object');
  return Object.assign(opts, {
    args: args
  }, opts.opts);
}

function decorateMessage(id, message, opts) {
  if (typeof message === 'string') {
    var time = opts.time ? (0, _formatters.leftPad)((0, _formatters.formatTime)(opts.total)) : '';
    message = opts.time ? "".concat(id, ": ").concat(time, "  ").concat(message) : "".concat(id, ": ").concat(message);
    message = (0, _color.addColor)(message, opts.color, opts.background);
  }

  return message;
}

function logImageInNode(_ref3) {
  var image = _ref3.image,
      _ref3$message = _ref3.message,
      message = _ref3$message === void 0 ? '' : _ref3$message,
      _ref3$scale = _ref3.scale,
      scale = _ref3$scale === void 0 ? 1 : _ref3$scale;
  console.warn('removed');
  return noop;
}

function logImageInBrowser(_ref4) {
  var image = _ref4.image,
      _ref4$message = _ref4.message,
      message = _ref4$message === void 0 ? '' : _ref4$message,
      _ref4$scale = _ref4.scale,
      scale = _ref4$scale === void 0 ? 1 : _ref4$scale;

  if (typeof image === 'string') {
    var img = new Image();

    img.onload = function () {
      var _console;

      var args = (0, _formatters.formatImage)(img, message, scale);

      (_console = console).log.apply(_console, (0, _toConsumableArray2.default)(args));
    };

    img.src = image;
    return noop;
  }

  var element = image.nodeName || '';

  if (element.toLowerCase() === 'img') {
    var _console2;

    (_console2 = console).log.apply(_console2, (0, _toConsumableArray2.default)((0, _formatters.formatImage)(image, message, scale)));

    return noop;
  }

  if (element.toLowerCase() === 'canvas') {
    var _img = new Image();

    _img.onload = function () {
      var _console3;

      return (_console3 = console).log.apply(_console3, (0, _toConsumableArray2.default)((0, _formatters.formatImage)(_img, message, scale)));
    };

    _img.src = image.toDataURL();
    return noop;
  }

  return noop;
}

function getTableHeader(table) {
  for (var _key2 in table) {
    for (var title in table[_key2]) {
      return title || 'untitled';
    }
  }

  return 'empty';
}
//# sourceMappingURL=log.js.map