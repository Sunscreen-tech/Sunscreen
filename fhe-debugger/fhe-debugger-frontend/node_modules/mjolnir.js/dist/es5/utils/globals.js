"use strict";
// Purpose: include this in your module to avoids adding dependencies on
// micro modules like 'global'
Object.defineProperty(exports, "__esModule", { value: true });
exports.passiveSupported = exports.document = exports.global = exports.window = exports.userAgent = void 0;
/* global window, global, document, navigator */
exports.userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
var window_ = typeof window !== 'undefined' ? window : global;
exports.window = window_;
var global_ = typeof global !== 'undefined' ? global : window;
exports.global = global_;
var document_ = typeof document !== 'undefined' ? document : {};
exports.document = document_;
/*
 * Detect whether passive option is supported by the current browser.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   #Safely_detecting_option_support
 */
var passiveSupported = false;
exports.passiveSupported = passiveSupported;
/* eslint-disable accessor-pairs, no-empty */
try {
    var options = {
        // This function will be called when the browser
        // attempts to access the passive property.
        get passive() {
            exports.passiveSupported = passiveSupported = true;
            return true;
        }
    };
    window_.addEventListener('test', null, options);
    window_.removeEventListener('test', null);
}
catch (err) {
    exports.passiveSupported = passiveSupported = false;
}
//# sourceMappingURL=globals.js.map