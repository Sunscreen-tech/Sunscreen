import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import Stat from './stat';
export default class Stats {
  constructor(options) {
    _defineProperty(this, "id", void 0);

    _defineProperty(this, "stats", {});

    this.id = options.id;
    this.stats = {};

    this._initializeStats(options.stats);

    Object.seal(this);
  }

  get(name) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'count';
    return this._getOrCreate({
      name,
      type
    });
  }

  get size() {
    return Object.keys(this.stats).length;
  }

  reset() {
    for (const key in this.stats) {
      this.stats[key].reset();
    }

    return this;
  }

  forEach(fn) {
    for (const key in this.stats) {
      fn(this.stats[key]);
    }
  }

  getTable() {
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

  _initializeStats() {
    let stats = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    stats.forEach(stat => this._getOrCreate(stat));
  }

  _getOrCreate(stat) {
    if (!stat || !stat.name) {
      return null;
    }

    const {
      name,
      type
    } = stat;

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
//# sourceMappingURL=stats.js.map