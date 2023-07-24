import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { assert } from '@loaders.gl/loader-utils';
export class ManagedArray {
  constructor() {
    let length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    _defineProperty(this, "_map", new Map());
    _defineProperty(this, "_array", void 0);
    _defineProperty(this, "_length", void 0);
    this._array = new Array(length);
    this._length = length;
  }
  get length() {
    return this._length;
  }
  set length(length) {
    this._length = length;
    if (length > this._array.length) {
      this._array.length = length;
    }
  }
  get values() {
    return this._array;
  }
  get(index) {
    assert(index < this._array.length);
    return this._array[index];
  }
  set(index, element) {
    assert(index >= 0);
    if (index >= this.length) {
      this.length = index + 1;
    }
    if (this._map.has(this._array[index])) {
      this._map.delete(this._array[index]);
    }
    this._array[index] = element;
    this._map.set(element, index);
  }
  delete(element) {
    const index = this._map.get(element);
    if (index >= 0) {
      this._array.splice(index, 1);
      this._map.delete(element);
      this.length--;
    }
  }
  peek() {
    return this._array[this._length - 1];
  }
  push(element) {
    if (!this._map.has(element)) {
      const index = this.length++;
      this._array[index] = element;
      this._map.set(element, index);
    }
  }
  pop() {
    const element = this._array[--this.length];
    this._map.delete(element);
    return element;
  }
  reserve(length) {
    assert(length >= 0);
    if (length > this._array.length) {
      this._array.length = length;
    }
  }
  resize(length) {
    assert(length >= 0);
    this.length = length;
  }
  trim(length) {
    if (length === null || length === undefined) {
      length = this.length;
    }
    this._array.length = length;
  }
  reset() {
    this._array = [];
    this._map = new Map();
    this._length = 0;
  }
  find(target) {
    return this._map.has(target);
  }
}
//# sourceMappingURL=managed-array.js.map