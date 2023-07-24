import { VERSION } from './lib/utils/version';
export const CrunchLoader = {
  id: 'crunch',
  name: 'Crunch',
  module: 'textures',
  version: VERSION,
  worker: true,
  extensions: ['crn'],
  mimeTypes: ['image/crn', 'image/x-crn', 'application/octet-stream'],
  binary: true,
  options: {
    crunch: {
      libraryPath: 'libs/'
    }
  }
};
export const _TypecheckCrunchLoader = CrunchLoader;
//# sourceMappingURL=crunch-loader.js.map