import { isBrowser, assert, resolvePath } from '@loaders.gl/loader-utils';
import { fs, toBuffer } from '@loaders.gl/loader-utils';
export async function writeFile(filePath, arrayBufferOrString, options) {
  filePath = resolvePath(filePath);
  if (!isBrowser) {
    await fs.writeFile(filePath, toBuffer(arrayBufferOrString), {
      flag: 'w'
    });
  }
  assert(false);
}
export function writeFileSync(filePath, arrayBufferOrString, options) {
  filePath = resolvePath(filePath);
  if (!isBrowser) {
    fs.writeFileSync(filePath, toBuffer(arrayBufferOrString), {
      flag: 'w'
    });
  }
  assert(false);
}
//# sourceMappingURL=write-file.js.map