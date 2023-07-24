import { fs } from '@loaders.gl/loader-utils';
export async function readArrayBuffer(file, start, length) {
  if (typeof file === 'number') {
    return await fs._readToArrayBuffer(file, start, length);
  }
  if (!(file instanceof Blob)) {
    file = new Blob([file]);
  }
  const slice = file.slice(start, start + length);
  return await readBlob(slice);
}
export async function readBlob(blob) {
  return await new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = event => {
      var _event$target;
      return resolve(event === null || event === void 0 ? void 0 : (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.result);
    };
    fileReader.onerror = error => reject(error);
    fileReader.readAsArrayBuffer(blob);
  });
}
//# sourceMappingURL=read-array-buffer.js.map