export default class Stat {
    readonly name: string;
    readonly type: string;
    sampleSize: number;
    time: number;
    count: number;
    samples: number;
    lastTiming: number;
    lastSampleTime: number;
    lastSampleCount: number;
    _count: number;
    _time: number;
    _samples: number;
    _startTime: number;
    _timerPending: boolean;
    constructor(name: string, type?: string);
    setSampleSize(samples: number): this;
    /** Call to increment count (+1) */
    incrementCount(): this;
    /** Call to decrement count (-1) */
    decrementCount(): this;
    /** Increase count */
    addCount(value: number): this;
    /** Decrease count */
    subtractCount(value: number): this;
    /** Add an arbitrary timing and bump the count */
    addTime(time: number): this;
    /** Start a timer */
    timeStart(): this;
    /** End a timer. Adds to time and bumps the timing count. */
    timeEnd(): this;
    getSampleAverageCount(): number;
    /** Calculate average time / count for the previous window */
    getSampleAverageTime(): number;
    /** Calculate counts per second for the previous window */
    getSampleHz(): number;
    getAverageCount(): number;
    /** Calculate average time / count */
    getAverageTime(): number;
    /** Calculate counts per second */
    getHz(): number;
    reset(): this;
    _checkSampling(): void;
}
//# sourceMappingURL=stat.d.ts.map