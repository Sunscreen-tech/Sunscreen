// probe.gl, MIT license

import Stat from './stat';

type TableEntry = {
  time: number;
  count: number;
  average: number;
  hz: number;
};

/** A "bag" of `Stat` objects, can be visualized using `StatsWidget` */
export default class Stats {
  readonly id: string;
  readonly stats: Record<string, Stat> = {};

  constructor(options: {id: string; stats?: Stats | Stat[] | {name: string; type?: string}[]}) {
    this.id = options.id;
    this.stats = {};

    this._initializeStats(options.stats);

    Object.seal(this);
  }

  /** Acquire a stat. Create if it doesn't exist. */
  get(name: string, type: string = 'count'): Stat {
    return this._getOrCreate({name, type});
  }

  get size(): number {
    return Object.keys(this.stats).length;
  }

  /** Reset all stats */
  reset(): this {
    for (const stat of Object.values(this.stats)) {
      stat.reset();
    }

    return this;
  }

  forEach(fn: (stat: Stat) => void): void {
    for (const stat of Object.values(this.stats)) {
      fn(stat);
    }
  }

  getTable(): Record<string, TableEntry> {
    const table: Record<string, TableEntry> = {};
    this.forEach(stat => {
      table[stat.name] = {
        time: stat.time || 0,
        count: stat.count || 0,
        average: stat.getAverageTime() || 0,
        hz: stat.getHz() || 0
      };
    });

    return table;
  }

  _initializeStats(stats: Stats | Stat[] | {name: string; type?: string}[] = []): void {
    stats.forEach(stat => this._getOrCreate(stat));
  }

  _getOrCreate(stat: Stat | {name: string, type?: string}): Stat {
    const {name, type} = stat;
    let result = this.stats[name];
    if (!result) {
      if (stat instanceof Stat) {
        result = stat;
      } else {
        result = new Stat(name, type);
      }
      this.stats[name] = result;
    }
    return result;
  }
}
