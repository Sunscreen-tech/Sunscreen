import fs from 'fs';
import { toArrayBuffer } from './buffer';
import { promisify2, promisify3 } from './promisify';
export let readdir;
export let stat;
export let readFile;
export let readFileSync;
export let writeFile;
export let writeFileSync;
export let open;
export let close;
export let read;
export let fstat;
export let createWriteStream;
export let isSupported = Boolean(fs);
try {
  readdir = promisify2(fs.readdir);
  stat = promisify2(fs.stat);
  readFile = fs.readFile;
  readFileSync = fs.readFileSync;
  writeFile = promisify3(fs.writeFile);
  writeFileSync = fs.writeFileSync;
  open = fs.open;
  close = fd => new Promise((resolve, reject) => fs.close(fd, err => err ? reject(err) : resolve()));
  read = fs.read;
  fstat = fs.fstat;
  createWriteStream = fs.createWriteStream;
  isSupported = Boolean(fs);
} catch {}
export async function _readToArrayBuffer(fd, start, length) {
  const buffer = Buffer.alloc(length);
  const {
    bytesRead
  } = await read(fd, buffer, 0, length, start);
  if (bytesRead !== length) {
    throw new Error('fs.read failed');
  }
  return toArrayBuffer(buffer);
}
//# sourceMappingURL=fs.js.map