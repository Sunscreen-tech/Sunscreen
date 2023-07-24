import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { DoublyLinkedList } from '../utils/doubly-linked-list';
export class TilesetCache {
  constructor() {
    _defineProperty(this, "_list", void 0);
    _defineProperty(this, "_sentinel", void 0);
    _defineProperty(this, "_trimTiles", void 0);
    this._list = new DoublyLinkedList();
    this._sentinel = this._list.add('sentinel');
    this._trimTiles = false;
  }
  reset() {
    this._list.splice(this._list.tail, this._sentinel);
  }
  touch(tile) {
    const node = tile._cacheNode;
    if (node) {
      this._list.splice(this._sentinel, node);
    }
  }
  add(tileset, tile, addCallback) {
    if (!tile._cacheNode) {
      tile._cacheNode = this._list.add(tile);
      if (addCallback) {
        addCallback(tileset, tile);
      }
    }
  }
  unloadTile(tileset, tile, unloadCallback) {
    const node = tile._cacheNode;
    if (!node) {
      return;
    }
    this._list.remove(node);
    tile._cacheNode = null;
    if (unloadCallback) {
      unloadCallback(tileset, tile);
    }
  }
  unloadTiles(tileset, unloadCallback) {
    const trimTiles = this._trimTiles;
    this._trimTiles = false;
    const list = this._list;
    const maximumMemoryUsageInBytes = tileset.maximumMemoryUsage * 1024 * 1024;
    const sentinel = this._sentinel;
    let node = list.head;
    while (node !== sentinel && (tileset.gpuMemoryUsageInBytes > maximumMemoryUsageInBytes || trimTiles)) {
      const tile = node.item;
      node = node.next;
      this.unloadTile(tileset, tile, unloadCallback);
    }
  }
  trim() {
    this._trimTiles = true;
  }
}
//# sourceMappingURL=tileset-cache.js.map