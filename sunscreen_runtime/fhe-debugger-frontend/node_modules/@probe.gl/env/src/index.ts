export {VERSION} from './utils/globals';

// ENVIRONMENT
export {self, window, global, document, process, console} from './lib/globals';
export {default as isBrowser, isBrowserMainThread} from './lib/is-browser';
export {default as getBrowser, isMobile} from './lib/get-browser';
export {default as isElectron} from './lib/is-electron';

// ENVIRONMENT'S ASSERT IS 5-15KB, SO WE PROVIDE OUR OWN
export {default as assert} from './utils/assert';
