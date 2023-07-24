export async function readArrayBuffer(file, start, length) {
  if (file instanceof Blob) {
    const slice = file.slice(start, start + length);
    return await slice.arrayBuffer();
  }
  return await file.read(start, start + length);
}
//# sourceMappingURL=read-array-buffer.js.map