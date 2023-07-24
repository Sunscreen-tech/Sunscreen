import { LocalStorage } from './utils/local-storage';
declare type LogFunction = () => void;
declare type LogOptions = {
    method?: any;
    time?: any;
    total?: number;
    delta?: number;
    tag?: string;
    message?: string;
    once?: boolean;
    nothrottle?: boolean;
    args?: any;
};
declare type LogConfiguration = {
    enabled?: boolean;
    level?: number;
};
/** A console wrapper */
export declare class Log {
    static VERSION: any;
    id: string;
    VERSION: string;
    _startTs: number;
    _deltaTs: number;
    _storage: LocalStorage<LogConfiguration>;
    userData: {};
    LOG_THROTTLE_TIMEOUT: number;
    constructor({ id }?: {
        id: string;
    });
    set level(newLevel: number);
    get level(): number;
    isEnabled(): boolean;
    getLevel(): number;
    /** @return milliseconds, with fractions */
    getTotal(): number;
    /** @return milliseconds, with fractions */
    getDelta(): number;
    /** @deprecated use logLevel */
    set priority(newPriority: number);
    /** @deprecated use logLevel */
    get priority(): number;
    /** @deprecated use logLevel */
    getPriority(): number;
    enable(enabled?: boolean): this;
    setLevel(level: number): this;
    /** return the current status of the setting */
    get(setting: string): any;
    set(setting: string, value: any): void;
    /** Logs the current settings as a table */
    settings(): void;
    assert(condition: unknown, message?: string): asserts condition;
    /** Warn, but only once, no console flooding */
    warn(message: string, ...args: any[]): LogFunction;
    /** Print an error */
    error(message: string, ...args: any[]): LogFunction;
    /** Print a deprecation warning */
    deprecated(oldUsage: string, newUsage: string): LogFunction;
    /** Print a removal warning */
    removed(oldUsage: string, newUsage: string): LogFunction;
    /** Log to a group */
    probe(logLevel: any, message?: any, ...args: any[]): LogFunction;
    /** Log a debug message */
    log(logLevel: any, message?: any, ...args: any[]): LogFunction;
    /** Log a normal message */
    info(logLevel: any, message?: any, ...args: any[]): LogFunction;
    /** Log a normal message, but only once, no console flooding */
    once(logLevel: any, message?: any, ...args: any[]): LogFunction;
    /** Logs an object as a table */
    table(logLevel: any, table?: any, columns?: any): LogFunction;
    /** logs an image under Chrome */
    image({ logLevel, priority, image, message, scale }: {
        logLevel: any;
        priority: any;
        image: any;
        message?: string;
        scale?: number;
    }): LogFunction;
    time(logLevel: any, message: any): LogFunction;
    timeEnd(logLevel: any, message: any): LogFunction;
    timeStamp(logLevel: any, message?: any): LogFunction;
    group(logLevel: any, message: any, opts?: {
        collapsed: boolean;
    }): LogFunction;
    groupCollapsed(logLevel: any, message: any, opts?: {}): LogFunction;
    groupEnd(logLevel: any): LogFunction;
    withGroup(logLevel: number, message: string, func: Function): void;
    trace(): void;
    /** Deduces log level from a variety of arguments */
    _shouldLog(logLevel: unknown): boolean;
    _getLogFunction(logLevel: unknown, message?: unknown, method?: Function, args?: IArguments, opts?: LogOptions): LogFunction;
}
/**
 * "Normalizes" the various argument patterns into an object with known types
 * - log(logLevel, message, args) => {logLevel, message, args}
 * - log(message, args) => {logLevel: 0, message, args}
 * - log({logLevel, ...}, message, args) => {logLevel, message, args}
 * - log({logLevel, message, args}) => {logLevel, message, args}
 */
export declare function normalizeArguments(opts: {
    logLevel: any;
    message: any;
    collapsed?: boolean;
    args?: IArguments;
    opts?: any;
}): {
    logLevel: number;
    message: string;
    args: any[];
};
export {};
//# sourceMappingURL=log.d.ts.map