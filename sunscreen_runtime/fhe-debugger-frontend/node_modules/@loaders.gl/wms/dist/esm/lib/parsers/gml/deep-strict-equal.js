export function deepStrictEqual(actual, expected, strict) {
  if (actual === expected) {
    return true;
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  } else if (actual instanceof RegExp && expected instanceof RegExp) {
    return actual.source === expected.source && actual.global === expected.global && actual.multiline === expected.multiline && actual.lastIndex === expected.lastIndex && actual.ignoreCase === expected.ignoreCase;
  } else if ((actual === null || typeof actual !== 'object') && (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;
  }
  return objEquiv(actual, expected, strict);
}
const pSlice = Array.prototype.slice;
function isPrimitive(arg) {
  return arg === null || typeof arg !== 'object' && typeof arg !== 'function';
}
function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}
function objEquiv(a, b, strict) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (isPrimitive(a) || isPrimitive(b)) return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const aIsArgs = isArguments(a);
  const bIsArgs = isArguments(b);
  if (aIsArgs && !bIsArgs || !aIsArgs && bIsArgs) return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepStrictEqual(a, b, strict);
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  let key;
  let i;
  if (ka.length !== kb.length) return false;
  ka.sort();
  kb.sort();
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i]) return false;
  }
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepStrictEqual(a[key], b[key], strict)) return false;
  }
  return true;
}
//# sourceMappingURL=deep-strict-equal.js.map