import { loadLibrary } from '@loaders.gl/worker-utils';
export async function loadCrunchModule(options) {
  const modules = options.modules || {};
  if (modules.crunch) {
    return modules.crunch;
  }
  return loadCrunch(options);
}
let crunchModule;
async function loadCrunch(options) {
  if (crunchModule) {
    return crunchModule;
  }
  let loadCrunchDecoder = await loadLibrary('crunch.js', 'textures', options);
  loadCrunchDecoder = loadCrunchDecoder || globalThis.LoadCrunchDecoder;
  crunchModule = loadCrunchDecoder();
  return crunchModule;
}
//# sourceMappingURL=crunch-module-loader.js.map