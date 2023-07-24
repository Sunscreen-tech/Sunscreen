import { Log } from '@probe.gl/log';
export declare const probeLog: Log;
export declare class NullLog {
    log(): () => void;
    info(): () => void;
    warn(): () => void;
    error(): () => void;
}
export declare class ConsoleLog {
    console: any;
    constructor();
    log(...args: any[]): any;
    info(...args: any[]): any;
    warn(...args: any[]): any;
    error(...args: any[]): any;
}
//# sourceMappingURL=loggers.d.ts.map