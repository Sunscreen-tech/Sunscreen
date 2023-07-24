export default function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'shadertools: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map