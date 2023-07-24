"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeStream = void 0;
const Stream = __importStar(require("stream"));
class _Readable {
}
const Readable = Stream.Readable || _Readable;
/** Builds a node stream from an iterator */
function makeStream(source, options) {
    const iterator = source[Symbol.asyncIterator]
        ? source[Symbol.asyncIterator]()
        : source[Symbol.iterator]();
    return new AsyncIterableReadable(iterator, options);
}
exports.makeStream = makeStream;
class AsyncIterableReadable extends Readable {
    constructor(it, options) {
        super(options);
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
            await this._iterator?.throw?.(error);
        }
        else {
            await this._iterator?.return?.(error);
        }
        cb?.(null);
    }
    // eslint-disable-next-line complexity
    async _pull(size, it) {
        const bm = this._bytesMode;
        let r = null;
        // while (this.readable && !(r = await it.next(bm ? size : null)).done) {
        while (this.readable && !(r = await it.next()).done) {
            if (size !== null) {
                size -= bm && ArrayBuffer.isView(r.value) ? r.value.byteLength : 1;
            }
            if (!this.push(new Uint8Array(r.value)) || size <= 0) {
                break;
            }
        }
        if ((r?.done || !this.readable) && (this.push(null) || true)) {
            it?.return?.();
        }
        return !this.readable;
    }
}
