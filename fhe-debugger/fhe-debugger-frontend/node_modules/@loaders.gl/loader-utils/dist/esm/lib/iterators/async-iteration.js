import { concatenateArrayBuffers } from '../binary-utils/array-buffer-utils';
export async function forEach(iterator, visitor) {
  while (true) {
    const {
      done,
      value
    } = await iterator.next();
    if (done) {
      iterator.return();
      return;
    }
    const cancel = visitor(value);
    if (cancel) {
      return;
    }
  }
}
export async function concatenateArrayBuffersAsync(asyncIterator) {
  const arrayBuffers = [];
  for await (const chunk of asyncIterator) {
    arrayBuffers.push(chunk);
  }
  return concatenateArrayBuffers(...arrayBuffers);
}
export async function concatenateStringsAsync(asyncIterator) {
  const strings = [];
  for await (const chunk of asyncIterator) {
    strings.push(chunk);
  }
  return strings.join('');
}
//# sourceMappingURL=async-iteration.js.map