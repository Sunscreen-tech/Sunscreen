import { canEncodeWithWorker } from '@loaders.gl/loader-utils';
import { processOnWorker } from '@loaders.gl/worker-utils';
import { concatenateArrayBuffers, resolvePath } from '@loaders.gl/loader-utils';
import { isBrowser } from '@loaders.gl/loader-utils';
import { writeFile } from '../fetch/write-file';
import { fetchFile } from '../fetch/fetch-file';
import { getLoaderOptions } from './loader-options';
export async function encode(data, writer, options) {
  const globalOptions = getLoaderOptions();
  options = {
    ...globalOptions,
    ...options
  };
  if (canEncodeWithWorker(writer, options)) {
    return await processOnWorker(writer, data, options);
  }
  if (writer.encode) {
    return await writer.encode(data, options);
  }
  if (writer.encodeSync) {
    return writer.encodeSync(data, options);
  }
  if (writer.encodeText) {
    return new TextEncoder().encode(await writer.encodeText(data, options));
  }
  if (writer.encodeInBatches) {
    const batches = encodeInBatches(data, writer, options);
    const chunks = [];
    for await (const batch of batches) {
      chunks.push(batch);
    }
    return concatenateArrayBuffers(...chunks);
  }
  if (!isBrowser && writer.encodeURLtoURL) {
    const tmpInputFilename = getTemporaryFilename('input');
    await writeFile(tmpInputFilename, data);
    const tmpOutputFilename = getTemporaryFilename('output');
    const outputFilename = await encodeURLtoURL(tmpInputFilename, tmpOutputFilename, writer, options);
    const response = await fetchFile(outputFilename);
    return response.arrayBuffer();
  }
  throw new Error('Writer could not encode data');
}
export function encodeSync(data, writer, options) {
  if (writer.encodeSync) {
    return writer.encodeSync(data, options);
  }
  throw new Error('Writer could not synchronously encode data');
}
export async function encodeText(data, writer, options) {
  if (writer.text && writer.encodeText) {
    return await writer.encodeText(data, options);
  }
  if (writer.text && (writer.encode || writer.encodeInBatches)) {
    const arrayBuffer = await encode(data, writer, options);
    return new TextDecoder().decode(arrayBuffer);
  }
  throw new Error('Writer could not encode data as text');
}
export function encodeInBatches(data, writer, options) {
  if (writer.encodeInBatches) {
    const dataIterator = getIterator(data);
    return writer.encodeInBatches(dataIterator, options);
  }
  throw new Error('Writer could not encode data in batches');
}
export async function encodeURLtoURL(inputUrl, outputUrl, writer, options) {
  inputUrl = resolvePath(inputUrl);
  outputUrl = resolvePath(outputUrl);
  if (isBrowser || !writer.encodeURLtoURL) {
    throw new Error();
  }
  const outputFilename = await writer.encodeURLtoURL(inputUrl, outputUrl, options);
  return outputFilename;
}
function getIterator(data) {
  const dataIterator = [{
    table: data,
    start: 0,
    end: data.length
  }];
  return dataIterator;
}
function getTemporaryFilename(filename) {
  return "/tmp/".concat(filename);
}
//# sourceMappingURL=encode.js.map