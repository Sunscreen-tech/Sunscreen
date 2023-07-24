import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import * as Stream from 'stream';
class _Readable {}
const Readable = Stream.Readable || _Readable;
export function makeStream(source, options) {
  const iterator = source[Symbol.asyncIterator] ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
  return new AsyncIterableReadable(iterator, options);
}
class AsyncIterableReadable extends Readable {
  constructor(it, options) {
    super(options);
    _defineProperty(this, "_pulling", void 0);
    _defineProperty(this, "_bytesMode", void 0);
    _defineProperty(this, "_iterator", void 0);
    this._iterator = it;
    this._pulling = false;
    this._bytesMode = !options || !options.objectMode;
  }
  async _read(size) {
    if (!this._pulling) {
      this._pulling = true;
      this._pulling = await this._pull(size, this._iterator);
    }
  }
  async _destroy(error, cb) {
    if (!this._iterator) {
      return;
    }
    if (error) {
      var _this$_iterator, _this$_iterator$throw;
      await ((_this$_iterator = this._iterator) === null || _this$_iterator === void 0 ? void 0 : (_this$_iterator$throw = _this$_iterator.throw) === null || _this$_iterator$throw === void 0 ? void 0 : _this$_iterator$throw.call(_this$_iterator, error));
    } else {
      var _this$_iterator2, _this$_iterator2$retu;
      await ((_this$_iterator2 = this._iterator) === null || _this$_iterator2 === void 0 ? void 0 : (_this$_iterator2$retu = _this$_iterator2.return) === null || _this$_iterator2$retu === void 0 ? void 0 : _this$_iterator2$retu.call(_this$_iterator2, error));
    }
    cb === null || cb === void 0 ? void 0 : cb(null);
  }
  async _pull(size, it) {
    var _r;
    const bm = this._bytesMode;
    let r = null;
    while (this.readable && !(r = await it.next()).done) {
      if (size !== null) {
        size -= bm && ArrayBuffer.isView(r.value) ? r.value.byteLength : 1;
      }
      if (!this.push(new Uint8Array(r.value)) || size <= 0) {
        break;
      }
    }
    if (((_r = r) !== null && _r !== void 0 && _r.done || !this.readable) && (this.push(null) || true)) {
      var _it$return;
      it === null || it === void 0 ? void 0 : (_it$return = it.return) === null || _it$return === void 0 ? void 0 : _it$return.call(it);
    }
    return !this.readable;
  }
}
//# sourceMappingURL=make-node-stream.js.map