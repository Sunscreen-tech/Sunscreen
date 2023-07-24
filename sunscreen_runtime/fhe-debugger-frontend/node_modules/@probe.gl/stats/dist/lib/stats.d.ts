import Stat from './stat';
/** A "bag" of `Stat` objects, can be visualized using `StatsWidget` */
export default class Stats {
    readonly id: string;
    readonly stats: Record<string, Stat>;
    constructor(options: {
        id: string;
        stats?: Stats | Stat[] | {
            name: string;
            type?: string;
        }[];
    });
    /** Acquire a stat. Create if it doesn't exist. */
    get(name: string, type?: string): Stat;
    get size(): number;
    /** Reset all stats */
    reset(): this;
    forEach(fn: (stat: Stat) => void): void;
    getTable(): Record<string, {
        time: number;
        count: number;
        average: number;
        hz: number;
    }>;
    _initializeStats(stats?: Stats | Stat[] | {
        name: string;
        type?: string;
    }[]): void;
    _getOrCreate(stat: any): Stat;
}
//# sourceMappingURL=stats.d.ts.map