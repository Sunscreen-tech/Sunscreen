import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
let _Symbol$asyncIterator;
_Symbol$asyncIterator = Symbol.asyncIterator;
export default class AsyncQueue {
  constructor() {
    _defineProperty(this, "_values", void 0);
    _defineProperty(this, "_settlers", void 0);
    _defineProperty(this, "_closed", void 0);
    this._values = [];
    this._settlers = [];
    this._closed = false;
  }
  [_Symbol$asyncIterator]() {
    return this;
  }
  push(value) {
    return this.enqueue(value);
  }
  enqueue(value) {
    if (this._closed) {
      throw new Error('Closed');
    }
    if (this._settlers.length > 0) {
      if (this._values.length > 0) {
        throw new Error('Illegal internal state');
      }
      const settler = this._settlers.shift();
      if (value instanceof Error) {
        settler.reject(value);
      } else {
        settler.resolve({
          value
        });
      }
    } else {
      this._values.push(value);
    }
  }
  close() {
    while (this._settlers.length > 0) {
      const settler = this._settlers.shift();
      settler.resolve({
        done: true
      });
    }
    this._closed = true;
  }
  next() {
    if (this._values.length > 0) {
      const value = this._values.shift();
      if (value instanceof Error) {
        return Promise.reject(value);
      }
      return Promise.resolve({
        done: false,
        value
      });
    }
    if (this._closed) {
      if (this._settlers.length > 0) {
        throw new Error('Illegal internal state');
      }
      return Promise.resolve({
        done: true,
        value: undefined
      });
    }
    return new Promise((resolve, reject) => {
      this._settlers.push({
        resolve,
        reject
      });
    });
  }
}
//# sourceMappingURL=async-queue.js.map