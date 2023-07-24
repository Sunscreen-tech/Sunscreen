import { isBrowser, toArrayBuffer } from '@loaders.gl/loader-utils';
export function makeStreamIterator(stream, options) {
  return isBrowser ? makeBrowserStreamIterator(stream, options) : makeNodeStreamIterator(stream, options);
}
async function* makeBrowserStreamIterator(stream, options) {
  const reader = stream.getReader();
  let nextBatchPromise;
  try {
    while (true) {
      const currentBatchPromise = nextBatchPromise || reader.read();
      if (options !== null && options !== void 0 && options._streamReadAhead) {
        nextBatchPromise = reader.read();
      }
      const {
        done,
        value
      } = await currentBatchPromise;
      if (done) {
        return;
      }
      yield toArrayBuffer(value);
    }
  } catch (error) {
    reader.releaseLock();
  }
}
async function* makeNodeStreamIterator(stream, options) {
  for await (const chunk of stream) {
    yield toArrayBuffer(chunk);
  }
}
//# sourceMappingURL=make-stream-iterator.js.map