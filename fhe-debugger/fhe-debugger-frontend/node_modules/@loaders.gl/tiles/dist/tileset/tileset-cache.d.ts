import type { Tileset3D } from './tileset-3d';
import type { Tile3D } from './tile-3d';
/**
 * Stores tiles with content loaded.
 * @private
 */
export declare class TilesetCache {
    private _list;
    private _sentinel;
    private _trimTiles;
    constructor();
    reset(): void;
    touch(tile: Tile3D): void;
    add(tileset: Tileset3D, tile: Tile3D, addCallback?: (tileset: Tileset3D, tile: Tile3D) => void): void;
    unloadTile(tileset: Tileset3D, tile: Tile3D, unloadCallback?: (tileset: Tileset3D, tile: Tile3D) => void): void;
    unloadTiles(tileset: any, unloadCallback: any): void;
    trim(): void;
}
//# sourceMappingURL=tileset-cache.d.ts.map