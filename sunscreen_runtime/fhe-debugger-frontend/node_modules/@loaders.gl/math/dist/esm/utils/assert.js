export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '3d-tile loader: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map