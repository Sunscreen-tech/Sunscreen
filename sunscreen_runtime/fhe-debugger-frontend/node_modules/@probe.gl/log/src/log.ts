// probe.gl, MIT license

/* eslint-disable no-console */
import {VERSION, isBrowser} from '@probe.gl/env';
import {LocalStorage} from './utils/local-storage';
import {formatImage, formatTime, leftPad} from './utils/formatters';
import {addColor} from './utils/color';
import {autobind} from './utils/autobind';
import assert from './utils/assert';
import {getHiResTimestamp} from './utils/hi-res-timestamp';

// Instrumentation in other packages may override console methods, so preserve them here
const originalConsole = {
  debug: isBrowser ? console.debug || console.log : console.log,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

type Table = Record<string, any>;

type LogFunction = () => void;

type LogOptions = {
  method?;
  time?;
  total?: number;
  delta?: number;
  tag?: string;
  message?: string;
  once?: boolean;
  nothrottle?: boolean;
  args?: any;
};

type LogSettings = {
  enabled?: boolean;
  level?: number;
  [key: string]: any;
};

const DEFAULT_SETTINGS: Required<LogSettings> = {
  enabled: true,
  level: 0
};

function noop() {} // eslint-disable-line @typescript-eslint/no-empty-function

const cache = {};
const ONCE = {once: true};

type LogConfiguration = {
  enabled?: boolean;
  level?: number;
};

/** A console wrapper */

export class Log {
  static VERSION = VERSION;

  id: string;
  VERSION: string = VERSION;
  _startTs: number = getHiResTimestamp();
  _deltaTs: number = getHiResTimestamp();
  _storage: LocalStorage<LogConfiguration>;
  userData = {};

  // TODO - fix support from throttling groups
  LOG_THROTTLE_TIMEOUT: number = 0; // Time before throttled messages are logged again

  constructor({id} = {id: ''}) {
    this.id = id;
    this.userData = {};
    this._storage = new LocalStorage<LogConfiguration>(`__probe-${this.id}__`, DEFAULT_SETTINGS);

    this.timeStamp(`${this.id} started`);

    autobind(this);
    Object.seal(this);
  }

  set level(newLevel: number) {
    this.setLevel(newLevel);
  }

  get level(): number {
    return this.getLevel();
  }

  isEnabled(): boolean {
    return this._storage.config.enabled;
  }

  getLevel(): number {
    return this._storage.config.level;
  }

  /** @return milliseconds, with fractions */
  getTotal(): number {
    return Number((getHiResTimestamp() - this._startTs).toPrecision(10));
  }

  /** @return milliseconds, with fractions */
  getDelta(): number {
    return Number((getHiResTimestamp() - this._deltaTs).toPrecision(10));
  }

  /** @deprecated use logLevel */
  set priority(newPriority: number) {
    this.level = newPriority;
  }

  /** @deprecated use logLevel */
  get priority(): number {
    return this.level;
  }

  /** @deprecated use logLevel */
  getPriority(): number {
    return this.level;
  }

  // Configure

  enable(enabled: boolean = true): this {
    this._storage.setConfiguration({enabled});
    return this;
  }

  setLevel(level: number): this {
    this._storage.setConfiguration({level});
    return this;
  }

  /** return the current status of the setting */
  get(setting: string): any {
    return this._storage.config[setting];
  }

  // update the status of the setting
  set(setting: string, value: any): void {
    this._storage.setConfiguration({[setting]: value});
  }

  /** Logs the current settings as a table */
  settings(): void {
    if (console.table) {
      console.table(this._storage.config);
    } else {
      console.log(this._storage.config);
    }
  }

  // Unconditional logging

  assert(condition: unknown, message?: string): asserts condition {
    assert(condition, message);
  }

  /** Warn, but only once, no console flooding */
  warn(message: string, ...args): LogFunction;
  warn(message: string): LogFunction {
    return this._getLogFunction(0, message, originalConsole.warn, arguments, ONCE);
  }

  /** Print an error */
  error(message: string, ...args): LogFunction;
  error(message: string): LogFunction {
    return this._getLogFunction(0, message, originalConsole.error, arguments);
  }

  /** Print a deprecation warning */
  deprecated(oldUsage: string, newUsage: string): LogFunction {
    return this.warn(`\`${oldUsage}\` is deprecated and will be removed \
in a later version. Use \`${newUsage}\` instead`);
  }

  /** Print a removal warning */
  removed(oldUsage: string, newUsage: string): LogFunction {
    return this.error(`\`${oldUsage}\` has been removed. Use \`${newUsage}\` instead`);
  }

  // Conditional logging

  /** Log to a group */
  probe(logLevel, message?, ...args): LogFunction;
  probe(logLevel, message?): LogFunction {
    return this._getLogFunction(logLevel, message, originalConsole.log, arguments, {
      time: true,
      once: true
    });
  }

  /** Log a debug message */
  log(logLevel, message?, ...args): LogFunction;
  log(logLevel, message?): LogFunction {
    return this._getLogFunction(logLevel, message, originalConsole.debug, arguments);
  }

  /** Log a normal message */
  info(logLevel, message?, ...args): LogFunction;
  info(logLevel, message?): LogFunction {
    return this._getLogFunction(logLevel, message, console.info, arguments);
  }

  /** Log a normal message, but only once, no console flooding */
  once(logLevel, message?, ...args): LogFunction;
  once(logLevel, message?, ...args) {
    return this._getLogFunction(
      logLevel,
      message,
      originalConsole.debug || originalConsole.info,
      arguments,
      ONCE
    );
  }

  /** Logs an object as a table */
  table(logLevel, table?, columns?): LogFunction {
    if (table) {
      // @ts-expect-error Not clear how this works, columns being passed as arguments
      return this._getLogFunction(logLevel, table, console.table || noop, columns && [columns], {
        tag: getTableHeader(table)
      });
    }
    return noop;
  }

  /** logs an image under Chrome */
  image({logLevel, priority, image, message = '', scale = 1}): LogFunction {
    if (!this._shouldLog(logLevel || priority)) {
      return noop;
    }
    return isBrowser
      ? logImageInBrowser({image, message, scale})
      : logImageInNode({image, message, scale});
  }

  time(logLevel, message) {
    return this._getLogFunction(logLevel, message, console.time ? console.time : console.info);
  }

  timeEnd(logLevel, message) {
    return this._getLogFunction(
      logLevel,
      message,
      console.timeEnd ? console.timeEnd : console.info
    );
  }

  timeStamp(logLevel, message?) {
    return this._getLogFunction(logLevel, message, console.timeStamp || noop);
  }

  group(logLevel, message, opts = {collapsed: false}) {
    const options = normalizeArguments({logLevel, message, opts});
    const {collapsed} = opts;
    // @ts-expect-error
    options.method = (collapsed ? console.groupCollapsed : console.group) || console.info;

    return this._getLogFunction(options);
  }

  groupCollapsed(logLevel, message, opts = {}) {
    return this.group(logLevel, message, Object.assign({}, opts, {collapsed: true}));
  }

  groupEnd(logLevel) {
    return this._getLogFunction(logLevel, '', console.groupEnd || noop);
  }

  // EXPERIMENTAL

  withGroup(logLevel: number, message: string, func: Function): void {
    this.group(logLevel, message)();

    try {
      func();
    } finally {
      this.groupEnd(logLevel)();
    }
  }

  trace(): void {
    if (console.trace) {
      console.trace();
    }
  }

  // PRIVATE METHODS

  /** Deduces log level from a variety of arguments */
  _shouldLog(logLevel: unknown): boolean {
    return this.isEnabled() && this.getLevel() >= normalizeLogLevel(logLevel);
  }

  _getLogFunction(
    logLevel: unknown,
    message?: unknown,
    method?: Function,
    args?: IArguments,
    opts?: LogOptions
  ): LogFunction {
    if (this._shouldLog(logLevel)) {
      // normalized opts + timings
      opts = normalizeArguments({logLevel, message, args, opts});
      method = method || opts.method;
      assert(method);

      opts.total = this.getTotal();
      opts.delta = this.getDelta();
      // reset delta timer
      this._deltaTs = getHiResTimestamp();

      const tag = opts.tag || opts.message;

      if (opts.once) {
        if (!cache[tag]) {
          cache[tag] = getHiResTimestamp();
        } else {
          return noop;
        }
      }

      // TODO - Make throttling work with groups
      // if (opts.nothrottle || !throttle(tag, this.LOG_THROTTLE_TIMEOUT)) {
      //   return noop;
      // }

      message = decorateMessage(this.id, opts.message, opts);

      // Bind console function so that it can be called after being returned
      return method.bind(console, message, ...opts.args);
    }
    return noop;
  }
}

/**
 * Get logLevel from first argument:
 * - log(logLevel, message, args) => logLevel
 * - log(message, args) => 0
 * - log({logLevel, ...}, message, args) => logLevel
 * - log({logLevel, message, args}) => logLevel
 */
function normalizeLogLevel(logLevel: unknown): number {
  if (!logLevel) {
    return 0;
  }
  let resolvedLevel;

  switch (typeof logLevel) {
    case 'number':
      resolvedLevel = logLevel;
      break;

    case 'object':
      // Backward compatibility
      // TODO - deprecate `priority`
      // @ts-expect-error
      resolvedLevel = logLevel.logLevel || logLevel.priority || 0;
      break;

    default:
      return 0;
  }
  // 'log level must be a number'
  assert(Number.isFinite(resolvedLevel) && resolvedLevel >= 0);

  return resolvedLevel;
}

/**
 * "Normalizes" the various argument patterns into an object with known types
 * - log(logLevel, message, args) => {logLevel, message, args}
 * - log(message, args) => {logLevel: 0, message, args}
 * - log({logLevel, ...}, message, args) => {logLevel, message, args}
 * - log({logLevel, message, args}) => {logLevel, message, args}
 */
export function normalizeArguments(opts: {
  logLevel;
  message;
  collapsed?: boolean;
  args?: IArguments;
  opts?;
}): {
  logLevel: number;
  message: string;
  args: any[];
} {
  const {logLevel, message} = opts;
  opts.logLevel = normalizeLogLevel(logLevel);

  // We use `arguments` instead of rest parameters (...args) because IE
  // does not support the syntax. Rest parameters is transpiled to code with
  // perf impact. Doing it here instead avoids constructing args when logging is
  // disabled.
  // TODO - remove when/if IE support is dropped
  const args: any[] = opts.args ? Array.from(opts.args) : [];
  // args should only contain arguments that appear after `message`
  // eslint-disable-next-line no-empty
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

  // Resolve functions into strings by calling them
  if (typeof opts.message === 'function') {
    opts.message = opts.message();
  }
  const messageType = typeof opts.message;
  // 'log message must be a string' or object
  assert(messageType === 'string' || messageType === 'object');

  // original opts + normalized opts + opts arg + fixed up message
  return Object.assign(opts, {args}, opts.opts);
}

function decorateMessage(id, message, opts) {
  if (typeof message === 'string') {
    const time = opts.time ? leftPad(formatTime(opts.total)) : '';
    message = opts.time ? `${id}: ${time}  ${message}` : `${id}: ${message}`;
    message = addColor(message, opts.color, opts.background);
  }
  return message;
}

/** @deprecated Function removed */
function logImageInNode({image, message = '', scale = 1}) {
  console.warn('removed');
  return noop;
}

function logImageInBrowser({image, message = '', scale = 1}) {
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

function getTableHeader(table: Table): string {
  for (const key in table) {
    for (const title in table[key]) {
      return title || 'untitled';
    }
  }
  return 'empty';
}
