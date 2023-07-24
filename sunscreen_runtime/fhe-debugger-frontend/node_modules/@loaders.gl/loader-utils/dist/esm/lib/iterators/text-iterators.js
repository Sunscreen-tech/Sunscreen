export function makeTextDecoderIterator(arrayBufferIterator) {
  try {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    return async function* () {
      const textDecoder = new TextDecoder(undefined, options);
      for await (const arrayBuffer of arrayBufferIterator) {
        yield typeof arrayBuffer === 'string' ? arrayBuffer : textDecoder.decode(arrayBuffer, {
          stream: true
        });
      }
    }();
  } catch (e) {
    return Promise.reject(e);
  }
}
export async function* makeTextEncoderIterator(textIterator) {
  const textEncoder = new TextEncoder();
  for await (const text of textIterator) {
    yield typeof text === 'string' ? textEncoder.encode(text) : text;
  }
}
export async function* makeLineIterator(textIterator) {
  let previous = '';
  for await (const textChunk of textIterator) {
    previous += textChunk;
    let eolIndex;
    while ((eolIndex = previous.indexOf('\n')) >= 0) {
      const line = previous.slice(0, eolIndex + 1);
      previous = previous.slice(eolIndex + 1);
      yield line;
    }
  }
  if (previous.length > 0) {
    yield previous;
  }
}
export async function* makeNumberedLineIterator(lineIterator) {
  let counter = 1;
  for await (const line of lineIterator) {
    yield {
      counter,
      line
    };
    counter++;
  }
}
//# sourceMappingURL=text-iterators.js.map