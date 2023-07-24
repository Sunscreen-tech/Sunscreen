"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoaderOptions = exports.setLoaderOptions = void 0;
var option_utils_1 = require("../loader-utils/option-utils");
Object.defineProperty(exports, "setLoaderOptions", { enumerable: true, get: function () { return option_utils_1.setGlobalOptions; } });
var option_utils_2 = require("../loader-utils/option-utils");
Object.defineProperty(exports, "getLoaderOptions", { enumerable: true, get: function () { return option_utils_2.getGlobalLoaderOptions; } });
