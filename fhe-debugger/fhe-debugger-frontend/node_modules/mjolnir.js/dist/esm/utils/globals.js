// Purpose: include this in your module to avoids adding dependencies on
// micro modules like 'global'
/* global window, global, document, navigator */
export const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
const window_ = typeof window !== 'undefined' ? window : global;
const global_ = typeof global !== 'undefined' ? global : window;
const document_ = typeof document !== 'undefined' ? document : {};
export { window_ as window, global_ as global, document_ as document };
/*
 * Detect whether passive option is supported by the current browser.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   #Safely_detecting_option_support
 */
let passiveSupported = false;
/* eslint-disable accessor-pairs, no-empty */
try {
    const options = {
        // This function will be called when the browser
        // attempts to access the passive property.
        get passive() {
            passiveSupported = true;
            return true;
        }
    };
    window_.addEventListener('test', null, options);
    window_.removeEventListener('test', null);
}
catch (err) {
    passiveSupported = false;
}
export { passiveSupported };
//# sourceMappingURL=globals.js.map