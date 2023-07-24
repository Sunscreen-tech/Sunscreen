import { loadLibrary } from '@loaders.gl/worker-utils';
const DRACO_DECODER_VERSION = '1.5.5';
const DRACO_ENCODER_VERSION = '1.4.1';
const STATIC_DECODER_URL = "https://www.gstatic.com/draco/versioned/decoders/".concat(DRACO_DECODER_VERSION);
const DRACO_JS_DECODER_URL = "".concat(STATIC_DECODER_URL, "/draco_decoder.js");
const DRACO_WASM_WRAPPER_URL = "".concat(STATIC_DECODER_URL, "/draco_wasm_wrapper.js");
const DRACO_WASM_DECODER_URL = "".concat(STATIC_DECODER_URL, "/draco_decoder.wasm");
const DRACO_ENCODER_URL = "https://raw.githubusercontent.com/google/draco/".concat(DRACO_ENCODER_VERSION, "/javascript/draco_encoder.js");
let loadDecoderPromise;
let loadEncoderPromise;
export async function loadDracoDecoderModule(options) {
  const modules = options.modules || {};
  if (modules.draco3d) {
    loadDecoderPromise = loadDecoderPromise || modules.draco3d.createDecoderModule({}).then(draco => {
      return {
        draco
      };
    });
  } else {
    loadDecoderPromise = loadDecoderPromise || loadDracoDecoder(options);
  }
  return await loadDecoderPromise;
}
export async function loadDracoEncoderModule(options) {
  const modules = options.modules || {};
  if (modules.draco3d) {
    loadEncoderPromise = loadEncoderPromise || modules.draco3d.createEncoderModule({}).then(draco => {
      return {
        draco
      };
    });
  } else {
    loadEncoderPromise = loadEncoderPromise || loadDracoEncoder(options);
  }
  return await loadEncoderPromise;
}
async function loadDracoDecoder(options) {
  let DracoDecoderModule;
  let wasmBinary;
  switch (options.draco && options.draco.decoderType) {
    case 'js':
      DracoDecoderModule = await loadLibrary(DRACO_JS_DECODER_URL, 'draco', options);
      break;
    case 'wasm':
    default:
      [DracoDecoderModule, wasmBinary] = await Promise.all([await loadLibrary(DRACO_WASM_WRAPPER_URL, 'draco', options), await loadLibrary(DRACO_WASM_DECODER_URL, 'draco', options)]);
  }
  DracoDecoderModule = DracoDecoderModule || globalThis.DracoDecoderModule;
  return await initializeDracoDecoder(DracoDecoderModule, wasmBinary);
}
function initializeDracoDecoder(DracoDecoderModule, wasmBinary) {
  const options = {};
  if (wasmBinary) {
    options.wasmBinary = wasmBinary;
  }
  return new Promise(resolve => {
    DracoDecoderModule({
      ...options,
      onModuleLoaded: draco => resolve({
        draco
      })
    });
  });
}
async function loadDracoEncoder(options) {
  let DracoEncoderModule = await loadLibrary(DRACO_ENCODER_URL, 'draco', options);
  DracoEncoderModule = DracoEncoderModule || globalThis.DracoEncoderModule;
  return new Promise(resolve => {
    DracoEncoderModule({
      onModuleLoaded: draco => resolve({
        draco
      })
    });
  });
}
//# sourceMappingURL=draco-module-loader.js.map