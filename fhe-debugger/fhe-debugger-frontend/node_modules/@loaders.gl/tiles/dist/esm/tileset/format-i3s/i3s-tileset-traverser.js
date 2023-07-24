import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { load } from '@loaders.gl/core';
import { TilesetTraverser } from '../tileset-traverser';
import { getLodStatus } from '../helpers/i3s-lod';
import { Tile3D } from '../tile-3d';
import { I3STileManager } from './i3s-tile-manager';
export class I3STilesetTraverser extends TilesetTraverser {
  constructor(options) {
    super(options);
    _defineProperty(this, "_tileManager", void 0);
    this._tileManager = new I3STileManager();
  }
  traversalFinished(frameState) {
    return !this._tileManager.hasPendingTiles(frameState.viewport.id, this._frameNumber || 0);
  }
  shouldRefine(tile, frameState) {
    tile._lodJudge = getLodStatus(tile, frameState);
    return tile._lodJudge === 'DIG';
  }
  updateChildTiles(tile, frameState) {
    const children = tile.header.children || [];
    const childTiles = tile.children;
    const tileset = tile.tileset;
    for (const child of children) {
      const extendedId = "".concat(child.id, "-").concat(frameState.viewport.id);
      const childTile = childTiles && childTiles.find(t => t.id === extendedId);
      if (!childTile) {
        let request = () => this._loadTile(child.id, tileset);
        const cachedRequest = this._tileManager.find(extendedId);
        if (!cachedRequest) {
          if (tileset.tileset.nodePages) {
            request = () => tileset.tileset.nodePagesTile.formTileFromNodePages(child.id);
          }
          this._tileManager.add(request, extendedId, header => this._onTileLoad(header, tile, extendedId), frameState);
        } else {
          this._tileManager.update(extendedId, frameState);
        }
      } else if (childTile) {
        this.updateTile(childTile, frameState);
      }
    }
    return false;
  }
  async _loadTile(nodeId, tileset) {
    const {
      loader
    } = tileset;
    const nodeUrl = tileset.getTileUrl("".concat(tileset.url, "/nodes/").concat(nodeId));
    const options = {
      ...tileset.loadOptions,
      i3s: {
        ...tileset.loadOptions.i3s,
        isTileHeader: true
      }
    };
    return await load(nodeUrl, loader, options);
  }
  _onTileLoad(header, tile, extendedId) {
    const childTile = new Tile3D(tile.tileset, header, tile, extendedId);
    tile.children.push(childTile);
    const frameState = this._tileManager.find(childTile.id).frameState;
    this.updateTile(childTile, frameState);
    if (this._frameNumber === frameState.frameNumber && (this.traversalFinished(frameState) || new Date().getTime() - this.lastUpdate > this.updateDebounceTime)) {
      this.executeTraversal(childTile, frameState);
    }
  }
}
//# sourceMappingURL=i3s-tileset-traverser.js.map