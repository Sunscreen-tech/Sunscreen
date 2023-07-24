import {Log} from './log';

// DEFAULT EXPORT IS A LOG INSTANCE
export default new Log({id: '@probe.gl/log'});

// LOGGING
export {Log} from './log';
export {COLOR} from './utils/color';

// UTILITIES
export {addColor} from './utils/color';
export {leftPad, rightPad} from './utils/formatters';
export {autobind} from './utils/autobind';
export {LocalStorage} from './utils/local-storage';
export {getHiResTimestamp} from './utils/hi-res-timestamp';

import './init';
