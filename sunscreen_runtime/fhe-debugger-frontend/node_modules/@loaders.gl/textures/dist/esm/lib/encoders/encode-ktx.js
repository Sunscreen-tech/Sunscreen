import { read } from 'ktx-parse';
export function encodeKTX(texture) {
  const ktx = read(texture);
  return ktx;
}
//# sourceMappingURL=encode-ktx.js.map