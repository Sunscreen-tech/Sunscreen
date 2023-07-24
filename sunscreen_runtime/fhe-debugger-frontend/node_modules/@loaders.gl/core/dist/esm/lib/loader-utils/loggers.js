import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Log } from '@probe.gl/log';
export const probeLog = new Log({
  id: 'loaders.gl'
});
export class NullLog {
  log() {
    return () => {};
  }
  info() {
    return () => {};
  }
  warn() {
    return () => {};
  }
  error() {
    return () => {};
  }
}
export class ConsoleLog {
  constructor() {
    _defineProperty(this, "console", void 0);
    this.console = console;
  }
  log() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return this.console.log.bind(this.console, ...args);
  }
  info() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    return this.console.info.bind(this.console, ...args);
  }
  warn() {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }
    return this.console.warn.bind(this.console, ...args);
  }
  error() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }
    return this.console.error.bind(this.console, ...args);
  }
}
//# sourceMappingURL=loggers.js.map