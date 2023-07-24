const SUBTREE_FILE_MAGIC = 0x74627573;
const SUBTREE_FILE_VERSION = 1;
export default async function parse3DTilesSubtree(data, options, context) {
  const magic = new Uint32Array(data.slice(0, 4));
  if (magic[0] !== SUBTREE_FILE_MAGIC) {
    throw new Error('Wrong subtree file magic number');
  }
  const version = new Uint32Array(data.slice(4, 8));
  if (version[0] !== SUBTREE_FILE_VERSION) {
    throw new Error('Wrong subtree file verson, must be 1');
  }
  const jsonByteLength = parseUint64Value(data.slice(8, 16));
  const stringAttribute = new Uint8Array(data, 24, jsonByteLength);
  const textDecoder = new TextDecoder('utf8');
  const string = textDecoder.decode(stringAttribute);
  const subtree = JSON.parse(string);
  const binaryByteLength = parseUint64Value(data.slice(16, 24));
  let internalBinaryBuffer = new ArrayBuffer(0);
  if (binaryByteLength) {
    internalBinaryBuffer = data.slice(24 + jsonByteLength);
  }
  if ('bufferView' in subtree.tileAvailability) {
    subtree.tileAvailability.explicitBitstream = await getExplicitBitstream(subtree, 'tileAvailability', internalBinaryBuffer, context);
  }
  if ('bufferView' in subtree.contentAvailability) {
    subtree.contentAvailability.explicitBitstream = await getExplicitBitstream(subtree, 'contentAvailability', internalBinaryBuffer, context);
  }
  if ('bufferView' in subtree.childSubtreeAvailability) {
    subtree.childSubtreeAvailability.explicitBitstream = await getExplicitBitstream(subtree, 'childSubtreeAvailability', internalBinaryBuffer, context);
  }
  return subtree;
}
function resolveBufferUri(bitstreamRelativeUri, basePath) {
  const hasProtocol = basePath.startsWith('http');
  if (hasProtocol) {
    const resolvedUri = new URL(bitstreamRelativeUri, basePath);
    return decodeURI(resolvedUri.toString());
  }
  const basePathWithProtocol = "http://".concat(basePath);
  const resolvedUri = new URL(bitstreamRelativeUri, basePathWithProtocol);
  return "/".concat(resolvedUri.host).concat(resolvedUri.pathname);
}
async function getExplicitBitstream(subtree, name, internalBinaryBuffer, context) {
  const bufferViewIndex = subtree[name].bufferView;
  const bufferView = subtree.bufferViews[bufferViewIndex];
  const buffer = subtree.buffers[bufferView.buffer];
  if (!(context !== null && context !== void 0 && context.url) || !context.fetch) {
    throw new Error('Url is not provided');
  }
  if (!context.fetch) {
    throw new Error('fetch is not provided');
  }
  if (buffer.uri) {
    const bufferUri = resolveBufferUri(buffer.uri, context === null || context === void 0 ? void 0 : context.url);
    const response = await context.fetch(bufferUri);
    const data = await response.arrayBuffer();
    return new Uint8Array(data, bufferView.byteOffset, bufferView.byteLength);
  }
  return new Uint8Array(internalBinaryBuffer, bufferView.byteOffset, bufferView.byteLength);
}
function parseUint64Value(buffer) {
  const dataView = new DataView(buffer);
  const left = dataView.getUint32(0, true);
  const right = dataView.getUint32(4, true);
  return left + 2 ** 32 * right;
}
//# sourceMappingURL=parse-3d-tile-subtree.js.map