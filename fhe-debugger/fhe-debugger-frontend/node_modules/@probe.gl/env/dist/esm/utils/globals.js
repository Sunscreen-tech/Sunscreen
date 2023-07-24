import checkIfBrowser from '../lib/is-browser';
export { self, window, global, document, process, console } from '../lib/globals';
export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'untranspiled source';
export const isBrowser = checkIfBrowser();
//# sourceMappingURL=globals.js.map