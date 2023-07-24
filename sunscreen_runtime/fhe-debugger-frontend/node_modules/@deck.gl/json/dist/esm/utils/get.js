export function get(container, compositeKey) {
  const keyList = getKeys(compositeKey);
  let value = container;

  for (const key of keyList) {
    value = isObject(value) ? value[key] : undefined;
  }

  return value;
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

const keyMap = {};

function getKeys(compositeKey) {
  if (typeof compositeKey === 'string') {
    let keyList = keyMap[compositeKey];

    if (!keyList) {
      keyList = compositeKey.split('.');
      keyMap[compositeKey] = keyList;
    }

    return keyList;
  }

  return Array.isArray(compositeKey) ? compositeKey : [compositeKey];
}
//# sourceMappingURL=get.js.map