export function getTransferList(object) {
  let recursive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  let transfers = arguments.length > 2 ? arguments[2] : undefined;
  const transfersSet = transfers || new Set();
  if (!object) {} else if (isTransferable(object)) {
    transfersSet.add(object);
  } else if (isTransferable(object.buffer)) {
    transfersSet.add(object.buffer);
  } else if (ArrayBuffer.isView(object)) {} else if (recursive && typeof object === 'object') {
    for (const key in object) {
      getTransferList(object[key], recursive, transfersSet);
    }
  }
  return transfers === undefined ? Array.from(transfersSet) : [];
}
function isTransferable(object) {
  if (!object) {
    return false;
  }
  if (object instanceof ArrayBuffer) {
    return true;
  }
  if (typeof MessagePort !== 'undefined' && object instanceof MessagePort) {
    return true;
  }
  if (typeof ImageBitmap !== 'undefined' && object instanceof ImageBitmap) {
    return true;
  }
  if (typeof OffscreenCanvas !== 'undefined' && object instanceof OffscreenCanvas) {
    return true;
  }
  return false;
}
export function getTransferListForWriter(object) {
  if (object === null) {
    return {};
  }
  const clone = Object.assign({}, object);
  Object.keys(clone).forEach(key => {
    if (typeof object[key] === 'object' && !ArrayBuffer.isView(object[key]) && !(object[key] instanceof Array)) {
      clone[key] = getTransferListForWriter(object[key]);
    } else if (typeof clone[key] === 'function' || clone[key] instanceof RegExp) {
      clone[key] = {};
    } else {
      clone[key] = object[key];
    }
  });
  return clone;
}
//# sourceMappingURL=get-transfer-list.js.map