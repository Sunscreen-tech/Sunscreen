import {tiles} from '@mapbox/tile-cover';

const B = [
  0x5555555555555555n,
  0x3333333333333333n,
  0x0f0f0f0f0f0f0f0fn,
  0x00ff00ff00ff00ffn,
  0x0000ffff0000ffffn,
  0x00000000ffffffffn
];
const S = [0n, 1n, 2n, 4n, 8n, 16n];

type Quadbin = bigint;
type Tile = {x: number; y: number; z: number};

export function hexToBigInt(hex: string): bigint {
  return BigInt(`0x${hex}`);
}

export function bigIntToHex(index: bigint): string {
  return index.toString(16);
}

export function tileToCell(tile: Tile): Quadbin {
  if (tile.z < 0 || tile.z > 26) {
    throw new Error('Wrong zoom');
  }
  const z = BigInt(tile.z);
  let x = BigInt(tile.x) << (32n - z);
  let y = BigInt(tile.y) << (32n - z);

  for (let i = 0; i < 5; i++) {
    const s = S[5 - i];
    const b = B[4 - i];
    x = (x | (x << s)) & b;
    y = (y | (y << s)) & b;
  }

  const quadbin =
    0x4000000000000000n |
    (1n << 59n) | // | (mode << 59) | (mode_dep << 57)
    (z << 52n) |
    ((x | (y << 1n)) >> 12n) |
    (0xfffffffffffffn >> (z * 2n));
  return quadbin;
}

export function cellToTile(quadbin: Quadbin): Tile {
  const mode = (quadbin >> 59n) & 7n;
  const modeDep = (quadbin >> 57n) & 3n;
  const z = (quadbin >> 52n) & 0x1fn;
  const q = (quadbin & 0xfffffffffffffn) << 12n;

  if (mode !== 1n && modeDep !== 0n) {
    throw new Error('Wrong mode');
  }

  let x = q;
  let y = q >> 1n;

  for (let i = 0; i < 6; i++) {
    const s = S[i];
    const b = B[i];
    x = (x | (x >> s)) & b;
    y = (y | (y >> s)) & b;
  }

  x = x >> (32n - z);
  y = y >> (32n - z);

  return {z: Number(z), x: Number(x), y: Number(y)};
}

export function getResolution(quadbin: Quadbin): bigint {
  return (quadbin >> 52n) & 0x1fn;
}

export function cellToParent(quadbin: Quadbin): Quadbin {
  const zparent = getResolution(quadbin) - 1n;
  const parent =
    (quadbin & ~(0x1fn << 52n)) | (zparent << 52n) | (0xfffffffffffffn >> (zparent * 2n));
  return parent;
}

export function geometryToCells(geometry, resolution: bigint): Quadbin[] {
  const zoom = Number(resolution);
  return tiles(geometry, {
    min_zoom: zoom,
    max_zoom: zoom
  }).map(([x, y, z]) => tileToCell({x, y, z}));
}
