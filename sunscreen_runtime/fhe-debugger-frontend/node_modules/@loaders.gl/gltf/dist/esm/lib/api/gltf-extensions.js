import * as EXT_meshopt_compression from '../extensions/EXT_meshopt_compression';
import * as EXT_texture_webp from '../extensions/EXT_texture_webp';
import * as KHR_texture_basisu from '../extensions/KHR_texture_basisu';
import * as KHR_draco_mesh_compression from '../extensions/KHR_draco_mesh_compression';
import * as KHR_texture_transform from '../extensions/KHR_texture_transform';
import * as KHR_lights_punctual from '../extensions/deprecated/KHR_lights_punctual';
import * as KHR_materials_unlit from '../extensions/deprecated/KHR_materials_unlit';
import * as KHR_techniques_webgl from '../extensions/deprecated/KHR_techniques_webgl';
import * as EXT_feature_metadata from '../extensions/deprecated/EXT_feature_metadata';
export const EXTENSIONS = [EXT_meshopt_compression, EXT_texture_webp, KHR_texture_basisu, KHR_draco_mesh_compression, KHR_lights_punctual, KHR_materials_unlit, KHR_techniques_webgl, KHR_texture_transform, EXT_feature_metadata];
export function preprocessExtensions(gltf) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let context = arguments.length > 2 ? arguments[2] : undefined;
  const extensions = EXTENSIONS.filter(extension => useExtension(extension.name, options));
  for (const extension of extensions) {
    var _extension$preprocess;
    (_extension$preprocess = extension.preprocess) === null || _extension$preprocess === void 0 ? void 0 : _extension$preprocess.call(extension, gltf, options, context);
  }
}
export async function decodeExtensions(gltf) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let context = arguments.length > 2 ? arguments[2] : undefined;
  const extensions = EXTENSIONS.filter(extension => useExtension(extension.name, options));
  for (const extension of extensions) {
    var _extension$decode;
    await ((_extension$decode = extension.decode) === null || _extension$decode === void 0 ? void 0 : _extension$decode.call(extension, gltf, options, context));
  }
}
function useExtension(extensionName, options) {
  var _options$gltf;
  const excludes = (options === null || options === void 0 ? void 0 : (_options$gltf = options.gltf) === null || _options$gltf === void 0 ? void 0 : _options$gltf.excludeExtensions) || {};
  const exclude = extensionName in excludes && !excludes[extensionName];
  return !exclude;
}
//# sourceMappingURL=gltf-extensions.js.map