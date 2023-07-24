import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
let _Symbol$asyncIterator;
class ArrayQueue extends Array {
  enqueue(value) {
    return this.push(value);
  }
  dequeue() {
    return this.shift();
  }
}
_Symbol$asyncIterator = Symbol.asyncIterator;
export default class AsyncQueue {
  constructor() {
    _defineProperty(this, "_values", void 0);
    _defineProperty(this, "_settlers", void 0);
    _defineProperty(this, "_closed", void 0);
    this._values = new ArrayQueue();
    this._settlers = new ArrayQueue();
    this._closed = false;
  }
  close() {
    while (this._settlers.length > 0) {
      this._settlers.dequeue().resolve({
        done: true
      });
    }
    this._closed = true;
  }
  [_Symbol$asyncIterator]() {
    return this;
  }
  enqueue(value) {
    if (this._closed) {
      throw new Error('Closed');
    }
    if (this._settlers.length > 0) {
      if (this._values.length > 0) {
        throw new Error('Illegal internal state');
      }
      const settler = this._settlers.dequeue();
      if (value instanceof Error) {
        settler.reject(value);
      } else {
        settler.resolve({
          value
        });
      }
    } else {
      this._values.enqueue(value);
    }
  }
  next() {
    if (this._values.length > 0) {
      const value = this._values.dequeue();
      if (value instanceof Error) {
        return Promise.reject(value);
      }
      return Promise.resolve({
        value
      });
    }
    if (this._closed) {
      if (this._settlers.length > 0) {
        throw new Error('Illegal internal state');
      }
      return Promise.resolve({
        done: true
      });
    }
    return new Promise((resolve, reject) => {
      this._settlers.enqueue({
        resolve,
        reject
      });
    });
  }
}
export async function takeAsync(asyncIterable) {
  let count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Infinity;
  const result = [];
  const iterator = asyncIterable[Symbol.asyncIterator]();
  while (result.length < count) {
    const {
      value,
      done
    } = await iterator.next();
    if (done) {
      break;
    }
    result.push(value);
  }
  return result;
}
//# sourceMappingURL=async-queue.js.map