import { VERSION } from './lib/utils/version';
import { parseCompressedTexture } from './lib/parsers/parse-compressed-texture';
import parseBasis from './lib/parsers/parse-basis';
const DEFAULT_TEXTURE_LOADER_OPTIONS = {
  'compressed-texture': {
    libraryPath: 'libs/',
    useBasis: false
  }
};
export const CompressedTextureWorkerLoader = {
  name: 'Texture Containers',
  id: 'compressed-texture',
  module: 'textures',
  version: VERSION,
  worker: true,
  extensions: ['ktx', 'ktx2', 'dds', 'pvr'],
  mimeTypes: ['image/ktx2', 'image/ktx', 'image/vnd-ms.dds', 'image/x-dds', 'application/octet-stream'],
  binary: true,
  options: DEFAULT_TEXTURE_LOADER_OPTIONS
};
export const CompressedTextureLoader = {
  ...CompressedTextureWorkerLoader,
  parse: async (arrayBuffer, options) => {
    if (options['compressed-texture'].useBasis) {
      options.basis = {
        format: {
          alpha: 'BC3',
          noAlpha: 'BC1'
        },
        ...options.basis,
        containerFormat: 'ktx2',
        module: 'encoder'
      };
      return (await parseBasis(arrayBuffer, options))[0];
    }
    return parseCompressedTexture(arrayBuffer);
  }
};
export const _TypecheckCompressedTextureWorkerLoader = CompressedTextureWorkerLoader;
export const _TypecheckCompressedTextureLoader = CompressedTextureLoader;
//# sourceMappingURL=compressed-texture-loader.js.map