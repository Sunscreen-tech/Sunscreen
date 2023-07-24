import getHiResTimestamp from '../utils/hi-res-timestamp';

export default class Stat {
  readonly name: string;
  readonly type: string | undefined;
  sampleSize: number = 1;
  time: number = 0;
  count: number = 0;
  samples: number = 0;
  lastTiming: number = 0;
  lastSampleTime: number = 0;
  lastSampleCount: number = 0;

  _count: number = 0;
  _time: number = 0;
  _samples: number = 0;
  _startTime: number = 0;
  _timerPending: boolean = false;

  constructor(name: string, type?: string) {
    this.name = name;
    this.type = type;
    this.reset();
  }

  reset(): this {
    this.time = 0;
    this.count = 0;
    this.samples = 0;
    this.lastTiming = 0;
    this.lastSampleTime = 0;
    this.lastSampleCount = 0;
    this._count = 0;
    this._time = 0;
    this._samples = 0;
    this._startTime = 0;
    this._timerPending = false;

    return this;
  }

  setSampleSize(samples: number): this {
    this.sampleSize = samples;
    return this;
  }

  /** Call to increment count (+1) */
  incrementCount(): this {
    this.addCount(1);

    return this;
  }

  /** Call to decrement count (-1) */
  decrementCount(): this {
    this.subtractCount(1);

    return this;
  }

  /** Increase count */
  addCount(value: number): this {
    this._count += value;
    this._samples++;
    this._checkSampling();

    return this;
  }

  /** Decrease count */
  subtractCount(value: number): this {
    this._count -= value;
    this._samples++;
    this._checkSampling();

    return this;
  }

  /** Add an arbitrary timing and bump the count */
  addTime(time: number): this {
    this._time += time;
    this.lastTiming = time;
    this._samples++;
    this._checkSampling();

    return this;
  }

  /** Start a timer */
  timeStart(): this {
    this._startTime = getHiResTimestamp();
    this._timerPending = true;

    return this;
  }

  /** End a timer. Adds to time and bumps the timing count. */
  timeEnd(): this {
    if (!this._timerPending) {
      return this;
    }
    this.addTime(getHiResTimestamp() - this._startTime);
    this._timerPending = false;
    this._checkSampling();

    return this;
  }

  getSampleAverageCount(): number {
    return this.sampleSize > 0 ? this.lastSampleCount / this.sampleSize : 0;
  }

  /** Calculate average time / count for the previous window */
  getSampleAverageTime(): number {
    return this.sampleSize > 0 ? this.lastSampleTime / this.sampleSize : 0;
  }

  /** Calculate counts per second for the previous window */
  getSampleHz(): number {
    return this.lastSampleTime > 0 ? this.sampleSize / (this.lastSampleTime / 1000) : 0;
  }

  getAverageCount(): number {
    return this.samples > 0 ? this.count / this.samples : 0;
  }

  /** Calculate average time / count */
  getAverageTime(): number {
    return this.samples > 0 ? this.time / this.samples : 0;
  }

  /** Calculate counts per second */
  getHz(): number {
    return this.time > 0 ? this.samples / (this.time / 1000) : 0;
  }

  _checkSampling(): void {
    if (this._samples === this.sampleSize) {
      this.lastSampleTime = this._time;
      this.lastSampleCount = this._count;
      this.count += this._count;
      this.time += this._time;
      this.samples += this._samples;
      this._time = 0;
      this._count = 0;
      this._samples = 0;
    }
  }
}
