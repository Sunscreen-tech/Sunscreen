"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._TypecheckCrunchLoader = exports.CrunchLoader = void 0;
const version_1 = require("./lib/utils/version");
/**
 * Worker loader for the Crunch compressed texture container format
 */
exports.CrunchLoader = {
    id: 'crunch',
    name: 'Crunch',
    module: 'textures',
    version: version_1.VERSION,
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
// We avoid bundling crunch - rare format, only offer worker loader
// TYPE TESTS - TODO find a better way than exporting junk
exports._TypecheckCrunchLoader = exports.CrunchLoader;
