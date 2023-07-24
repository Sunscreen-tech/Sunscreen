import { VERSION } from './lib/utils/version';
import { encodeKTX2BasisTexture } from './lib/encoders/encode-ktx2-basis-texture';
export const KTX2BasisWriter = {
  name: 'Basis Universal Supercompressed GPU Texture',
  id: 'ktx2-basis-writer',
  module: 'textures',
  version: VERSION,
  extensions: ['ktx2'],
  options: {
    useSRGB: false,
    qualityLevel: 10,
    encodeUASTC: false,
    mipmaps: false
  },
  encode: encodeKTX2BasisTexture
};
export const _TypecheckKTX2TextureWriter = KTX2BasisWriter;
//# sourceMappingURL=ktx2-basis-writer.js.map