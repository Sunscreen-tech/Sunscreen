export function makeStream(source, options) {
  const iterator = source[Symbol.asyncIterator] ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
  return new ReadableStream({
    type: 'bytes',
    async pull(controller) {
      try {
        const {
          done,
          value
        } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(new Uint8Array(value));
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      var _iterator$return;
      await (iterator === null || iterator === void 0 ? void 0 : (_iterator$return = iterator.return) === null || _iterator$return === void 0 ? void 0 : _iterator$return.call(iterator));
    }
  }, {
    highWaterMark: 2 ** 24,
    ...options
  });
}
//# sourceMappingURL=make-dom-stream.js.map