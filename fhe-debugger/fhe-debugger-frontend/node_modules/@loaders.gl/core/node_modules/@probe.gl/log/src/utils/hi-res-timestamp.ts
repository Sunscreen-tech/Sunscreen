// probe.gl, MIT license

import {window, process, isBrowser} from '@probe.gl/env';

/** Get best timer available. */
export function getHiResTimestamp() {
  let timestamp;
  if (isBrowser() && window.performance) {
    timestamp = window?.performance?.now?.();
  } else if ('hrtime' in process) {
    // @ts-ignore
    const timeParts = process?.hrtime?.();
    timestamp = timeParts[0] * 1000 + timeParts[1] / 1e6;
  } else {
    timestamp = Date.now();
  }

  return timestamp;
}
