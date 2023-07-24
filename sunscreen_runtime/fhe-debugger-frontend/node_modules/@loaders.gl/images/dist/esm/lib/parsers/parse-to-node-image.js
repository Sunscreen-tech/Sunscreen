import { assert } from '@loaders.gl/loader-utils';
import { getBinaryImageMetadata } from '../category-api/binary-image-api';
export default async function parseToNodeImage(arrayBuffer, options) {
  const {
    mimeType
  } = getBinaryImageMetadata(arrayBuffer) || {};
  const _parseImageNode = globalThis._parseImageNode;
  assert(_parseImageNode);
  return await _parseImageNode(arrayBuffer, mimeType);
}
//# sourceMappingURL=parse-to-node-image.js.map