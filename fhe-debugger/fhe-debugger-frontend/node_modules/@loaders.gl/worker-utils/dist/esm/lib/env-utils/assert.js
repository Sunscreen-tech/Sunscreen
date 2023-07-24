export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'loaders.gl assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map