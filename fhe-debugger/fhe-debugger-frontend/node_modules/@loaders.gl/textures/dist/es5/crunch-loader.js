"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._TypecheckCrunchLoader = exports.CrunchLoader = void 0;
var _version = require("./lib/utils/version");
var CrunchLoader = {
  id: 'crunch',
  name: 'Crunch',
  module: 'textures',
  version: _version.VERSION,
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
exports.CrunchLoader = CrunchLoader;
var _TypecheckCrunchLoader = CrunchLoader;
exports._TypecheckCrunchLoader = _TypecheckCrunchLoader;
//# sourceMappingURL=crunch-loader.js.map