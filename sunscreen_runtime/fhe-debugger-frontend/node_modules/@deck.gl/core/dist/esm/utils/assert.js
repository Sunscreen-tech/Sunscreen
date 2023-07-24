export default function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'deck.gl: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map