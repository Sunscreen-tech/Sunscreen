import { VERSION } from './lib/utils/version';
import { encodeGLTFSync } from './lib/encoders/encode-gltf';
export const GLTFWriter = {
  name: 'glTF',
  id: 'gltf',
  module: 'gltf',
  version: VERSION,
  extensions: ['glb'],
  mimeTypes: ['model/gltf-binary'],
  binary: true,
  encodeSync,
  options: {
    gltf: {}
  }
};
function encodeSync(gltf) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const {
    byteOffset = 0
  } = options;
  const byteLength = encodeGLTFSync(gltf, null, byteOffset, options);
  const arrayBuffer = new ArrayBuffer(byteLength);
  const dataView = new DataView(arrayBuffer);
  encodeGLTFSync(gltf, dataView, byteOffset, options);
  return arrayBuffer;
}
export const _TypecheckGLBLoader = GLTFWriter;
//# sourceMappingURL=gltf-writer.js.map