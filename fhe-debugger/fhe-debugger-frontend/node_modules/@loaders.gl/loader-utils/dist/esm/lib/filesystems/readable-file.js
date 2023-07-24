export function makeReadableFile(data) {
  if (data instanceof ArrayBuffer) {
    const arrayBuffer = data;
    return {
      read: async (start, length) => Buffer.from(data, start, length),
      close: async () => {},
      size: arrayBuffer.byteLength
    };
  }
  const blob = data;
  return {
    read: async (start, length) => {
      const arrayBuffer = await blob.slice(start, start + length).arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
    close: async () => {},
    size: blob.size
  };
}
//# sourceMappingURL=readable-file.js.map