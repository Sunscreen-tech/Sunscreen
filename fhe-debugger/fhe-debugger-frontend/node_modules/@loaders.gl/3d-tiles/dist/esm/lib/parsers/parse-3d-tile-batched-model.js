import { GL } from '@loaders.gl/math';
import Tile3DFeatureTable from '../classes/tile-3d-feature-table';
import { parse3DTileHeaderSync } from './helpers/parse-3d-tile-header';
import { parse3DTileTablesHeaderSync, parse3DTileTablesSync } from './helpers/parse-3d-tile-tables';
import { parse3DTileGLTFViewSync, extractGLTF, GLTF_FORMAT } from './helpers/parse-3d-tile-gltf-view';
export async function parseBatchedModel3DTile(tile, arrayBuffer, byteOffset, options, context) {
  var _tile$gltf;
  byteOffset = parseBatchedModel(tile, arrayBuffer, byteOffset, options, context);
  await extractGLTF(tile, GLTF_FORMAT.EMBEDDED, options, context);
  const extensions = tile === null || tile === void 0 ? void 0 : (_tile$gltf = tile.gltf) === null || _tile$gltf === void 0 ? void 0 : _tile$gltf.extensions;
  if (extensions && extensions.CESIUM_RTC) {
    tile.rtcCenter = extensions.CESIUM_RTC.center;
  }
  return byteOffset;
}
function parseBatchedModel(tile, arrayBuffer, byteOffset, options, context) {
  byteOffset = parse3DTileHeaderSync(tile, arrayBuffer, byteOffset);
  byteOffset = parse3DTileTablesHeaderSync(tile, arrayBuffer, byteOffset);
  byteOffset = parse3DTileTablesSync(tile, arrayBuffer, byteOffset, options);
  byteOffset = parse3DTileGLTFViewSync(tile, arrayBuffer, byteOffset, options);
  const featureTable = new Tile3DFeatureTable(tile.featureTableJson, tile.featureTableBinary);
  tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', GL.FLOAT, 3);
  return byteOffset;
}
//# sourceMappingURL=parse-3d-tile-batched-model.js.map