import { getTransferList } from '../worker-utils/get-transfer-list';
function getParentPort() {
  let parentPort;
  try {
    eval('globalThis.parentPort = require(\'worker_threads\').parentPort');
    parentPort = globalThis.parentPort;
  } catch {}
  return parentPort;
}
const onMessageWrapperMap = new Map();
export default class WorkerBody {
  static inWorkerThread() {
    return typeof self !== 'undefined' || Boolean(getParentPort());
  }
  static set onmessage(onMessage) {
    function handleMessage(message) {
      const parentPort = getParentPort();
      const {
        type,
        payload
      } = parentPort ? message : message.data;
      onMessage(type, payload);
    }
    const parentPort = getParentPort();
    if (parentPort) {
      parentPort.on('message', handleMessage);
      parentPort.on('exit', () => console.debug('Node worker closing'));
    } else {
      globalThis.onmessage = handleMessage;
    }
  }
  static addEventListener(onMessage) {
    let onMessageWrapper = onMessageWrapperMap.get(onMessage);
    if (!onMessageWrapper) {
      onMessageWrapper = message => {
        if (!isKnownMessage(message)) {
          return;
        }
        const parentPort = getParentPort();
        const {
          type,
          payload
        } = parentPort ? message : message.data;
        onMessage(type, payload);
      };
    }
    const parentPort = getParentPort();
    if (parentPort) {
      console.error('not implemented');
    } else {
      globalThis.addEventListener('message', onMessageWrapper);
    }
  }
  static removeEventListener(onMessage) {
    const onMessageWrapper = onMessageWrapperMap.get(onMessage);
    onMessageWrapperMap.delete(onMessage);
    const parentPort = getParentPort();
    if (parentPort) {
      console.error('not implemented');
    } else {
      globalThis.removeEventListener('message', onMessageWrapper);
    }
  }
  static postMessage(type, payload) {
    const data = {
      source: 'loaders.gl',
      type,
      payload
    };
    const transferList = getTransferList(payload);
    const parentPort = getParentPort();
    if (parentPort) {
      parentPort.postMessage(data, transferList);
    } else {
      globalThis.postMessage(data, transferList);
    }
  }
}
function isKnownMessage(message) {
  const {
    type,
    data
  } = message;
  return type === 'message' && data && typeof data.source === 'string' && data.source.startsWith('loaders.gl');
}
//# sourceMappingURL=worker-body.js.map