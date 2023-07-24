import Stat from './stat';

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
    for (const key in this.stats) {
      this.stats[key].reset();
    }

    return this;
  }

  forEach(fn: (stat: Stat) => void): void {
    for (const key in this.stats) {
      fn(this.stats[key]);
    }
  }

  getTable(): Record<
    string,
    {
      time: number;
      count: number;
      average: number;
      hz: number;
    }
    > {
    const table = {};
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

  _getOrCreate(stat): Stat {
    if (!stat || !stat.name) {
      return null;
    }

    const {name, type} = stat;
    if (!this.stats[name]) {
      if (stat instanceof Stat) {
        this.stats[name] = stat;
      } else {
        this.stats[name] = new Stat(name, type);
      }
    }
    return this.stats[name];
  }
}
