export function uncapitalize(str) {
  return typeof str === 'string' ? str.charAt(0).toLowerCase() + str.slice(1) : str;
}
export function uncapitalizeKeys(object) {
  if (Array.isArray(object)) {
    return object.map(element => uncapitalizeKeys(element));
  }
  if (object && typeof object === 'object') {
    const newObject = {};
    for (const [key, value] of Object.entries(object)) {
      newObject[uncapitalize(key)] = uncapitalizeKeys(value);
    }
    return newObject;
  }
  return object;
}
//# sourceMappingURL=uncapitalize.js.map