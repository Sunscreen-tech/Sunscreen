"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
var hammerjs = require("hammerjs");
var hammer_overrides_1 = require("./hammer-overrides");
(0, hammer_overrides_1.enhancePointerEventInput)(hammerjs.PointerEventInput);
(0, hammer_overrides_1.enhanceMouseInput)(hammerjs.MouseInput);
exports.Manager = hammerjs.Manager;
exports.default = hammerjs;
//# sourceMappingURL=hammer.browser.js.map