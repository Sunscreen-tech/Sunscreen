import checkIfBrowser from '../lib/is-browser';
export { self, window, global, document, process, console } from '../lib/globals';
// Extract injected version from package.json (injected by babel plugin)
// @ts-expect-error
export const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'untranspiled source';
export const isBrowser = checkIfBrowser();
