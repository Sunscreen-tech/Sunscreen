export function tileToQuadkey(tile) {
  let index = '';
  for (let z = tile.z; z > 0; z--) {
    let b = 0;
    const mask = 1 << (z - 1);
    if ((tile.x & mask) !== 0) b++;
    if ((tile.y & mask) !== 0) b += 2;
    index += b.toString();
  }
  return index;
}

function quadkeyToTile(quadkey) {
  const tile = {x: 0, y: 0, z: quadkey.length};

  for (let i = tile.z; i > 0; i--) {
    const mask = 1 << (i - 1);
    const q = Number(quadkey[tile.z - i]);
    if (q === 1) tile.x |= mask;
    if (q === 2) tile.y |= mask;
    if (q === 3) {
      tile.x |= mask;
      tile.y |= mask;
    }
  }
  return tile;
}
