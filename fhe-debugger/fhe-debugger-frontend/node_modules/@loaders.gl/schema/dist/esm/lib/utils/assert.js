export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'loader assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map