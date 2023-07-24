"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLog = exports.NullLog = exports.probeLog = void 0;
// probe.gl Log compatible loggers
const log_1 = require("@probe.gl/log");
exports.probeLog = new log_1.Log({ id: 'loaders.gl' });
// Logs nothing
class NullLog {
    log() {
        return () => { };
    }
    info() {
        return () => { };
    }
    warn() {
        return () => { };
    }
    error() {
        return () => { };
    }
}
exports.NullLog = NullLog;
// Logs to console
class ConsoleLog {
    constructor() {
        this.console = console; // eslint-disable-line
    }
    log(...args) {
        return this.console.log.bind(this.console, ...args);
    }
    info(...args) {
        return this.console.info.bind(this.console, ...args);
    }
    warn(...args) {
        return this.console.warn.bind(this.console, ...args);
    }
    error(...args) {
        return this.console.error.bind(this.console, ...args);
    }
}
exports.ConsoleLog = ConsoleLog;
