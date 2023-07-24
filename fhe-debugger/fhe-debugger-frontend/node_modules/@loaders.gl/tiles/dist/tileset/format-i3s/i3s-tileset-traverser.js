"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I3STilesetTraverser = void 0;
const core_1 = require("@loaders.gl/core");
const tileset_traverser_1 = require("../tileset-traverser");
const i3s_lod_1 = require("../helpers/i3s-lod");
const tile_3d_1 = require("../tile-3d");
const i3s_tile_manager_1 = require("./i3s-tile-manager");
class I3STilesetTraverser extends tileset_traverser_1.TilesetTraverser {
    constructor(options) {
        super(options);
        this._tileManager = new i3s_tile_manager_1.I3STileManager();
    }
    /**
     * Check if there are no penging tile header requests,
     * that means the traversal is finished and we can call
     * following-up callbacks.
     */
    traversalFinished(frameState) {
        return !this._tileManager.hasPendingTiles(frameState.viewport.id, this._frameNumber || 0);
    }
    shouldRefine(tile, frameState) {
        tile._lodJudge = (0, i3s_lod_1.getLodStatus)(tile, frameState);
        return tile._lodJudge === 'DIG';
    }
    updateChildTiles(tile, frameState) {
        const children = tile.header.children || [];
        // children which are already fetched and constructed as Tile3D instances
        const childTiles = tile.children;
        const tileset = tile.tileset;
        for (const child of children) {
            const extendedId = `${child.id}-${frameState.viewport.id}`;
            // if child tile is not fetched
            const childTile = childTiles && childTiles.find((t) => t.id === extendedId);
            if (!childTile) {
                let request = () => this._loadTile(child.id, tileset);
                const cachedRequest = this._tileManager.find(extendedId);
                if (!cachedRequest) {
                    // eslint-disable-next-line max-depth
                    if (tileset.tileset.nodePages) {
                        request = () => tileset.tileset.nodePagesTile.formTileFromNodePages(child.id);
                    }
                    this._tileManager.add(request, extendedId, (header) => this._onTileLoad(header, tile, extendedId), frameState);
                }
                else {
                    // update frameNumber since it is still needed in current frame
                    this._tileManager.update(extendedId, frameState);
                }
            }
            else if (childTile) {
                // if child tile is fetched and available
                this.updateTile(childTile, frameState);
            }
        }
        return false;
    }
    async _loadTile(nodeId, tileset) {
        const { loader } = tileset;
        const nodeUrl = tileset.getTileUrl(`${tileset.url}/nodes/${nodeId}`);
        // load metadata
        const options = {
            ...tileset.loadOptions,
            i3s: {
                ...tileset.loadOptions.i3s,
                isTileHeader: true
            }
        };
        return await (0, core_1.load)(nodeUrl, loader, options);
    }
    /**
     * The callback to init Tile3D instance after loading the tile JSON
     * @param {Object} header - the tile JSON from a dataset
     * @param {Tile3D} tile - the parent Tile3D instance
     * @param {string} extendedId - optional ID to separate copies of a tile for different viewports.
     *                              const extendedId = `${tile.id}-${frameState.viewport.id}`;
     * @return {void}
     */
    _onTileLoad(header, tile, extendedId) {
        // after child tile is fetched
        const childTile = new tile_3d_1.Tile3D(tile.tileset, header, tile, extendedId);
        tile.children.push(childTile);
        const frameState = this._tileManager.find(childTile.id).frameState;
        this.updateTile(childTile, frameState);
        // after tile fetched, resume traversal if still in current update/traversal frame
        if (this._frameNumber === frameState.frameNumber &&
            (this.traversalFinished(frameState) ||
                new Date().getTime() - this.lastUpdate > this.updateDebounceTime)) {
            this.executeTraversal(childTile, frameState);
        }
    }
}
exports.I3STilesetTraverser = I3STilesetTraverser;
