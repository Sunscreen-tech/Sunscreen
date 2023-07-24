export function removeNontransferableOptions(object) {
  if (object === null) {
    return {};
  }
  const clone = Object.assign({}, object);
  Object.keys(clone).forEach(key => {
    if (typeof object[key] === 'object' && !ArrayBuffer.isView(object[key])) {
      clone[key] = removeNontransferableOptions(object[key]);
    } else if (typeof clone[key] === 'function' || clone[key] instanceof RegExp) {
      clone[key] = {};
    } else {
      clone[key] = object[key];
    }
  });
  return clone;
}
//# sourceMappingURL=remove-nontransferable-options.js.map