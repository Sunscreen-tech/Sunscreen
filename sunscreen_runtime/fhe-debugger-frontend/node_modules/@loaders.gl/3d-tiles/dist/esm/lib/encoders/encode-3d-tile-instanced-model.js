import { copyStringToDataView } from '@loaders.gl/loader-utils';
import { MAGIC_ARRAY } from '../constants';
import { encode3DTileHeader, encode3DTileByteLength } from './helpers/encode-3d-tile-header';
export function encodeInstancedModel3DTile(tile, dataView, byteOffset, options) {
  const {
    featuresLength = 1,
    gltfFormat = 1,
    gltfUri = ''
  } = tile;
  const gltfUriByteLength = gltfUri.length;
  const featureTableJson = {
    INSTANCES_LENGTH: featuresLength,
    POSITION: new Array(featuresLength * 3).fill(0)
  };
  const featureTableJsonString = JSON.stringify(featureTableJson);
  const featureTableJsonByteLength = featureTableJsonString.length;
  tile = {
    magic: MAGIC_ARRAY.INSTANCED_MODEL,
    ...tile
  };
  const byteOffsetStart = byteOffset;
  byteOffset = encode3DTileHeader(tile, dataView, 0);
  if (dataView) {
    dataView.setUint32(12, featureTableJsonByteLength, true);
    dataView.setUint32(16, 0, true);
    dataView.setUint32(20, 0, true);
    dataView.setUint32(24, 0, true);
    dataView.setUint32(28, gltfFormat, true);
  }
  byteOffset += 20;
  byteOffset += copyStringToDataView(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
  byteOffset += copyStringToDataView(dataView, byteOffset, gltfUri, gltfUriByteLength);
  encode3DTileByteLength(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-instanced-model.js.map