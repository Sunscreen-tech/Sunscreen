export default function assert(condition: unknown, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
