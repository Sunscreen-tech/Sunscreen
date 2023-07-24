import { TILE3D_TYPE } from '../constants';
import { getMagicString } from './helpers/parse-utils';
import { parsePointCloud3DTile } from './parse-3d-tile-point-cloud';
import { parseBatchedModel3DTile } from './parse-3d-tile-batched-model';
import { parseInstancedModel3DTile } from './parse-3d-tile-instanced-model';
import { parseComposite3DTile } from './parse-3d-tile-composite';
import { parseGltf3DTile } from './parse-3d-tile-gltf';
export async function parse3DTile(arrayBuffer) {
  let byteOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  let options = arguments.length > 2 ? arguments[2] : undefined;
  let context = arguments.length > 3 ? arguments[3] : undefined;
  let tile = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  tile.byteOffset = byteOffset;
  tile.type = getMagicString(arrayBuffer, byteOffset);
  switch (tile.type) {
    case TILE3D_TYPE.COMPOSITE:
      return await parseComposite3DTile(tile, arrayBuffer, byteOffset, options, context, parse3DTile);
    case TILE3D_TYPE.BATCHED_3D_MODEL:
      return await parseBatchedModel3DTile(tile, arrayBuffer, byteOffset, options, context);
    case TILE3D_TYPE.GLTF:
      return await parseGltf3DTile(tile, arrayBuffer, options, context);
    case TILE3D_TYPE.INSTANCED_3D_MODEL:
      return await parseInstancedModel3DTile(tile, arrayBuffer, byteOffset, options, context);
    case TILE3D_TYPE.POINT_CLOUD:
      return await parsePointCloud3DTile(tile, arrayBuffer, byteOffset, options, context);
    default:
      throw new Error("3DTileLoader: unknown type ".concat(tile.type));
  }
}
//# sourceMappingURL=parse-3d-tile.js.map