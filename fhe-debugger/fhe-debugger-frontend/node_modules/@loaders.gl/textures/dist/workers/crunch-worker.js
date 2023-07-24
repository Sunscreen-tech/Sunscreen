"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrunchLoaderWithParser = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const crunch_loader_1 = require("../crunch-loader");
const parse_crunch_1 = require("../lib/parsers/parse-crunch");
/**
 * Loader for the Crunch compressed texture container format
 */
exports.CrunchLoaderWithParser = {
    ...crunch_loader_1.CrunchLoader,
    parse: parse_crunch_1.parseCrunch
};
(0, loader_utils_1.createLoaderWorker)(exports.CrunchLoaderWithParser);
