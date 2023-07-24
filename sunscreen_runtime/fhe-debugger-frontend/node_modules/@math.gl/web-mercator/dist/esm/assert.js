export default function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '@math.gl/web-mercator: assertion failed.');
  }
}
//# sourceMappingURL=assert.js.map