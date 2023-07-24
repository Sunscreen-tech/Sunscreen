import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { VERSION, isBrowser } from '@probe.gl/env';
import { LocalStorage } from './utils/local-storage';
import { formatImage, formatTime, leftPad } from './utils/formatters';
import { addColor } from './utils/color';
import { autobind } from './utils/autobind';
import assert from './utils/assert';
import { getHiResTimestamp } from './utils/hi-res-timestamp';
const originalConsole = {
  debug: isBrowser ? console.debug || console.log : console.log,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};
const DEFAULT_SETTINGS = {
  enabled: true,
  level: 0
};

function noop() {}

const cache = {};
const ONCE = {
  once: true
};
export class Log {
  constructor() {
    let {
      id
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
      id: ''
    };

    _defineProperty(this, "id", void 0);

    _defineProperty(this, "VERSION", VERSION);

    _defineProperty(this, "_startTs", getHiResTimestamp());

    _defineProperty(this, "_deltaTs", getHiResTimestamp());

    _defineProperty(this, "_storage", void 0);

    _defineProperty(this, "userData", {});

    _defineProperty(this, "LOG_THROTTLE_TIMEOUT", 0);

    this.id = id;
    this.userData = {};
    this._storage = new LocalStorage("__probe-".concat(this.id, "__"), DEFAULT_SETTINGS);
    this.timeStamp("".concat(this.id, " started"));
    autobind(this);
    Object.seal(this);
  }

  set level(newLevel) {
    this.setLevel(newLevel);
  }

  get level() {
    return this.getLevel();
  }

  isEnabled() {
    return this._storage.config.enabled;
  }

  getLevel() {
    return this._storage.config.level;
  }

  getTotal() {
    return Number((getHiResTimestamp() - this._startTs).toPrecision(10));
  }

  getDelta() {
    return Number((getHiResTimestamp() - this._deltaTs).toPrecision(10));
  }

  set priority(newPriority) {
    this.level = newPriority;
  }

  get priority() {
    return this.level;
  }

  getPriority() {
    return this.level;
  }

  enable() {
    let enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    this._storage.setConfiguration({
      enabled
    });

    return this;
  }

  setLevel(level) {
    this._storage.setConfiguration({
      level
    });

    return this;
  }

  get(setting) {
    return this._storage.config[setting];
  }

  set(setting, value) {
    this._storage.setConfiguration({
      [setting]: value
    });
  }

  settings() {
    if (console.table) {
      console.table(this._storage.config);
    } else {
      console.log(this._storage.config);
    }
  }

  assert(condition, message) {
    assert(condition, message);
  }

  warn(message) {
    return this._getLogFunction(0, message, originalConsole.warn, arguments, ONCE);
  }

  error(message) {
    return this._getLogFunction(0, message, originalConsole.error, arguments);
  }

  deprecated(oldUsage, newUsage) {
    return this.warn("`".concat(oldUsage, "` is deprecated and will be removed in a later version. Use `").concat(newUsage, "` instead"));
  }

  removed(oldUsage, newUsage) {
    return this.error("`".concat(oldUsage, "` has been removed. Use `").concat(newUsage, "` instead"));
  }

  probe(logLevel, message) {
    return this._getLogFunction(logLevel, message, originalConsole.log, arguments, {
      time: true,
      once: true
    });
  }

  log(logLevel, message) {
    return this._getLogFunction(logLevel, message, originalConsole.debug, arguments);
  }

  info(logLevel, message) {
    return this._getLogFunction(logLevel, message, console.info, arguments);
  }

  once(logLevel, message) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    return this._getLogFunction(logLevel, message, originalConsole.debug || originalConsole.info, arguments, ONCE);
  }

  table(logLevel, table, columns) {
    if (table) {
      return this._getLogFunction(logLevel, table, console.table || noop, columns && [columns], {
        tag: getTableHeader(table)
      });
    }

    return noop;
  }

  image(_ref) {
    let {
      logLevel,
      priority,
      image,
      message = '',
      scale = 1
    } = _ref;

    if (!this._shouldLog(logLevel || priority)) {
      return noop;
    }

    return isBrowser ? logImageInBrowser({
      image,
      message,
      scale
    }) : logImageInNode({
      image,
      message,
      scale
    });
  }

  time(logLevel, message) {
    return this._getLogFunction(logLevel, message, console.time ? console.time : console.info);
  }

  timeEnd(logLevel, message) {
    return this._getLogFunction(logLevel, message, console.timeEnd ? console.timeEnd : console.info);
  }

  timeStamp(logLevel, message) {
    return this._getLogFunction(logLevel, message, console.timeStamp || noop);
  }

  group(logLevel, message) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
      collapsed: false
    };
    const options = normalizeArguments({
      logLevel,
      message,
      opts
    });
    const {
      collapsed
    } = opts;
    options.method = (collapsed ? console.groupCollapsed : console.group) || console.info;
    return this._getLogFunction(options);
  }

  groupCollapsed(logLevel, message) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return this.group(logLevel, message, Object.assign({}, opts, {
      collapsed: true
    }));
  }

  groupEnd(logLevel) {
    return this._getLogFunction(logLevel, '', console.groupEnd || noop);
  }

  withGroup(logLevel, message, func) {
    this.group(logLevel, message)();

    try {
      func();
    } finally {
      this.groupEnd(logLevel)();
    }
  }

  trace() {
    if (console.trace) {
      console.trace();
    }
  }

  _shouldLog(logLevel) {
    return this.isEnabled() && this.getLevel() >= normalizeLogLevel(logLevel);
  }

  _getLogFunction(logLevel, message, method, args, opts) {
    if (this._shouldLog(logLevel)) {
      opts = normalizeArguments({
        logLevel,
        message,
        args,
        opts
      });
      method = method || opts.method;
      assert(method);
      opts.total = this.getTotal();
      opts.delta = this.getDelta();
      this._deltaTs = getHiResTimestamp();
      const tag = opts.tag || opts.message;

      if (opts.once) {
        if (!cache[tag]) {
          cache[tag] = getHiResTimestamp();
        } else {
          return noop;
        }
      }

      message = decorateMessage(this.id, opts.message, opts);
      return method.bind(console, message, ...opts.args);
    }

    return noop;
  }

}

_defineProperty(Log, "VERSION", VERSION);

function normalizeLogLevel(logLevel) {
  if (!logLevel) {
    return 0;
  }

  let resolvedLevel;

  switch (typeof logLevel) {
    case 'number':
      resolvedLevel = logLevel;
      break;

    case 'object':
      resolvedLevel = logLevel.logLevel || logLevel.priority || 0;
      break;

    default:
      return 0;
  }

  assert(Number.isFinite(resolvedLevel) && resolvedLevel >= 0);
  return resolvedLevel;
}

export function normalizeArguments(opts) {
  const {
    logLevel,
    message
  } = opts;
  opts.logLevel = normalizeLogLevel(logLevel);
  const args = opts.args ? Array.from(opts.args) : [];

  while (args.length && args.shift() !== message) {}

  switch (typeof logLevel) {
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

  const messageType = typeof opts.message;
  assert(messageType === 'string' || messageType === 'object');
  return Object.assign(opts, {
    args
  }, opts.opts);
}

function decorateMessage(id, message, opts) {
  if (typeof message === 'string') {
    const time = opts.time ? leftPad(formatTime(opts.total)) : '';
    message = opts.time ? "".concat(id, ": ").concat(time, "  ").concat(message) : "".concat(id, ": ").concat(message);
    message = addColor(message, opts.color, opts.background);
  }

  return message;
}

function logImageInNode(_ref2) {
  let {
    image,
    message = '',
    scale = 1
  } = _ref2;
  console.warn('removed');
  return noop;
}

function logImageInBrowser(_ref3) {
  let {
    image,
    message = '',
    scale = 1
  } = _ref3;

  if (typeof image === 'string') {
    const img = new Image();

    img.onload = () => {
      const args = formatImage(img, message, scale);
      console.log(...args);
    };

    img.src = image;
    return noop;
  }

  const element = image.nodeName || '';

  if (element.toLowerCase() === 'img') {
    console.log(...formatImage(image, message, scale));
    return noop;
  }

  if (element.toLowerCase() === 'canvas') {
    const img = new Image();

    img.onload = () => console.log(...formatImage(img, message, scale));

    img.src = image.toDataURL();
    return noop;
  }

  return noop;
}

function getTableHeader(table) {
  for (const key in table) {
    for (const title in table[key]) {
      return title || 'untitled';
    }
  }

  return 'empty';
}
//# sourceMappingURL=log.js.map