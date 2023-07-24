const isObject = value => value && typeof value === 'object';
export async function asyncDeepMap(tree, func) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return await mapSubtree(tree, func, options);
}
export async function mapSubtree(object, func, options) {
  if (Array.isArray(object)) {
    return await mapArray(object, func, options);
  }
  if (isObject(object)) {
    return await mapObject(object, func, options);
  }
  const url = object;
  return await func(url, options);
}
async function mapObject(object, func, options) {
  const promises = [];
  const values = {};
  for (const key in object) {
    const url = object[key];
    const promise = mapSubtree(url, func, options).then(value => {
      values[key] = value;
    });
    promises.push(promise);
  }
  await Promise.all(promises);
  return values;
}
async function mapArray(urlArray, func) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const promises = urlArray.map(url => mapSubtree(url, func, options));
  return await Promise.all(promises);
}
//# sourceMappingURL=async-deep-map.js.map