import { concatenateArrayBuffersAsync } from '@loaders.gl/loader-utils';
import { isResponse, isReadableStream, isAsyncIterable, isIterable, isIterator, isBlob, isBuffer } from '../../javascript-utils/is-type';
import { makeIterator } from '../../iterators/make-iterator/make-iterator';
import { checkResponse, makeResponse } from '../utils/response-utils';
const ERR_DATA = 'Cannot convert supplied data type';
export function getArrayBufferOrStringFromDataSync(data, loader, options) {
  if (loader.text && typeof data === 'string') {
    return data;
  }
  if (isBuffer(data)) {
    data = data.buffer;
  }
  if (data instanceof ArrayBuffer) {
    const arrayBuffer = data;
    if (loader.text && !loader.binary) {
      const textDecoder = new TextDecoder('utf8');
      return textDecoder.decode(arrayBuffer);
    }
    return arrayBuffer;
  }
  if (ArrayBuffer.isView(data)) {
    if (loader.text && !loader.binary) {
      const textDecoder = new TextDecoder('utf8');
      return textDecoder.decode(data);
    }
    let arrayBuffer = data.buffer;
    const byteLength = data.byteLength || data.length;
    if (data.byteOffset !== 0 || byteLength !== arrayBuffer.byteLength) {
      arrayBuffer = arrayBuffer.slice(data.byteOffset, data.byteOffset + byteLength);
    }
    return arrayBuffer;
  }
  throw new Error(ERR_DATA);
}
export async function getArrayBufferOrStringFromData(data, loader, options) {
  const isArrayBuffer = data instanceof ArrayBuffer || ArrayBuffer.isView(data);
  if (typeof data === 'string' || isArrayBuffer) {
    return getArrayBufferOrStringFromDataSync(data, loader, options);
  }
  if (isBlob(data)) {
    data = await makeResponse(data);
  }
  if (isResponse(data)) {
    const response = data;
    await checkResponse(response);
    return loader.binary ? await response.arrayBuffer() : await response.text();
  }
  if (isReadableStream(data)) {
    data = makeIterator(data, options);
  }
  if (isIterable(data) || isAsyncIterable(data)) {
    return concatenateArrayBuffersAsync(data);
  }
  throw new Error(ERR_DATA);
}
export async function getAsyncIterableFromData(data, options) {
  if (isIterator(data)) {
    return data;
  }
  if (isResponse(data)) {
    const response = data;
    await checkResponse(response);
    const body = await response.body;
    return makeIterator(body, options);
  }
  if (isBlob(data) || isReadableStream(data)) {
    return makeIterator(data, options);
  }
  if (isAsyncIterable(data)) {
    return data[Symbol.asyncIterator]();
  }
  return getIterableFromData(data);
}
export async function getReadableStream(data) {
  if (isReadableStream(data)) {
    return data;
  }
  if (isResponse(data)) {
    return data.body;
  }
  const response = await makeResponse(data);
  return response.body;
}
function getIterableFromData(data) {
  if (ArrayBuffer.isView(data)) {
    return function* oneChunk() {
      yield data.buffer;
    }();
  }
  if (data instanceof ArrayBuffer) {
    return function* oneChunk() {
      yield data;
    }();
  }
  if (isIterator(data)) {
    return data;
  }
  if (isIterable(data)) {
    return data[Symbol.iterator]();
  }
  throw new Error(ERR_DATA);
}
//# sourceMappingURL=get-data.js.map