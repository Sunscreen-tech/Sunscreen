import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { ManagedArray } from '../utils/managed-array';
import { TILE_REFINEMENT } from '../constants';
export const DEFAULT_PROPS = {
  loadSiblings: false,
  skipLevelOfDetail: false,
  maximumScreenSpaceError: 2,
  updateTransforms: true,
  onTraversalEnd: () => {},
  viewportTraversersMap: {},
  basePath: ''
};
export class TilesetTraverser {
  traversalFinished(frameState) {
    return true;
  }
  constructor(options) {
    _defineProperty(this, "options", void 0);
    _defineProperty(this, "root", null);
    _defineProperty(this, "selectedTiles", {});
    _defineProperty(this, "requestedTiles", {});
    _defineProperty(this, "emptyTiles", {});
    _defineProperty(this, "lastUpdate", new Date().getTime());
    _defineProperty(this, "updateDebounceTime", 1000);
    _defineProperty(this, "_traversalStack", new ManagedArray());
    _defineProperty(this, "_emptyTraversalStack", new ManagedArray());
    _defineProperty(this, "_frameNumber", null);
    this.options = {
      ...DEFAULT_PROPS,
      ...options
    };
  }
  traverse(root, frameState, options) {
    this.root = root;
    this.options = {
      ...this.options,
      ...options
    };
    this.reset();
    this.updateTile(root, frameState);
    this._frameNumber = frameState.frameNumber;
    this.executeTraversal(root, frameState);
  }
  reset() {
    this.requestedTiles = {};
    this.selectedTiles = {};
    this.emptyTiles = {};
    this._traversalStack.reset();
    this._emptyTraversalStack.reset();
  }
  executeTraversal(root, frameState) {
    const stack = this._traversalStack;
    root._selectionDepth = 1;
    stack.push(root);
    while (stack.length > 0) {
      const tile = stack.pop();
      let shouldRefine = false;
      if (this.canTraverse(tile, frameState)) {
        this.updateChildTiles(tile, frameState);
        shouldRefine = this.updateAndPushChildren(tile, frameState, stack, tile.hasRenderContent ? tile._selectionDepth + 1 : tile._selectionDepth);
      }
      const parent = tile.parent;
      const parentRefines = Boolean(!parent || parent._shouldRefine);
      const stoppedRefining = !shouldRefine;
      if (!tile.hasRenderContent) {
        this.emptyTiles[tile.id] = tile;
        this.loadTile(tile, frameState);
        if (stoppedRefining) {
          this.selectTile(tile, frameState);
        }
      } else if (tile.refine === TILE_REFINEMENT.ADD) {
        this.loadTile(tile, frameState);
        this.selectTile(tile, frameState);
      } else if (tile.refine === TILE_REFINEMENT.REPLACE) {
        this.loadTile(tile, frameState);
        if (stoppedRefining) {
          this.selectTile(tile, frameState);
        }
      }
      this.touchTile(tile, frameState);
      tile._shouldRefine = shouldRefine && parentRefines;
    }
    const newTime = new Date().getTime();
    if (this.traversalFinished(frameState) || newTime - this.lastUpdate > this.updateDebounceTime) {
      this.lastUpdate = newTime;
      this.options.onTraversalEnd(frameState);
    }
  }
  updateChildTiles(tile, frameState) {
    const children = tile.children;
    for (const child of children) {
      this.updateTile(child, frameState);
    }
  }
  updateAndPushChildren(tile, frameState, stack, depth) {
    const {
      loadSiblings,
      skipLevelOfDetail
    } = this.options;
    const children = tile.children;
    children.sort(this.compareDistanceToCamera.bind(this));
    const checkRefines = tile.refine === TILE_REFINEMENT.REPLACE && tile.hasRenderContent && !skipLevelOfDetail;
    let hasVisibleChild = false;
    let refines = true;
    for (const child of children) {
      child._selectionDepth = depth;
      if (child.isVisibleAndInRequestVolume) {
        if (stack.find(child)) {
          stack.delete(child);
        }
        stack.push(child);
        hasVisibleChild = true;
      } else if (checkRefines || loadSiblings) {
        this.loadTile(child, frameState);
        this.touchTile(child, frameState);
      }
      if (checkRefines) {
        let childRefines;
        if (!child._inRequestVolume) {
          childRefines = false;
        } else if (!child.hasRenderContent) {
          childRefines = this.executeEmptyTraversal(child, frameState);
        } else {
          childRefines = child.contentAvailable;
        }
        refines = refines && childRefines;
        if (!refines) {
          return false;
        }
      }
    }
    if (!hasVisibleChild) {
      refines = false;
    }
    return refines;
  }
  updateTile(tile, frameState) {
    this.updateTileVisibility(tile, frameState);
  }
  selectTile(tile, frameState) {
    if (this.shouldSelectTile(tile)) {
      tile._selectedFrame = frameState.frameNumber;
      this.selectedTiles[tile.id] = tile;
    }
  }
  loadTile(tile, frameState) {
    if (this.shouldLoadTile(tile)) {
      tile._requestedFrame = frameState.frameNumber;
      tile._priority = tile._getPriority();
      this.requestedTiles[tile.id] = tile;
    }
  }
  touchTile(tile, frameState) {
    tile.tileset._cache.touch(tile);
    tile._touchedFrame = frameState.frameNumber;
  }
  canTraverse(tile, frameState) {
    let useParentMetric = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    let ignoreVisibility = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    if (!tile.hasChildren) {
      return false;
    }
    if (tile.hasTilesetContent) {
      return !tile.contentExpired;
    }
    if (!ignoreVisibility && !tile.isVisibleAndInRequestVolume) {
      return false;
    }
    return this.shouldRefine(tile, frameState, useParentMetric);
  }
  shouldLoadTile(tile) {
    return tile.hasUnloadedContent || tile.contentExpired;
  }
  shouldSelectTile(tile) {
    return tile.contentAvailable && !this.options.skipLevelOfDetail;
  }
  shouldRefine(tile, frameState) {
    let useParentMetric = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    let screenSpaceError = tile._screenSpaceError;
    if (useParentMetric) {
      screenSpaceError = tile.getScreenSpaceError(frameState, true);
    }
    return screenSpaceError > this.options.maximumScreenSpaceError;
  }
  updateTileVisibility(tile, frameState) {
    const viewportIds = [];
    if (this.options.viewportTraversersMap) {
      for (const key in this.options.viewportTraversersMap) {
        const value = this.options.viewportTraversersMap[key];
        if (value === frameState.viewport.id) {
          viewportIds.push(key);
        }
      }
    } else {
      viewportIds.push(frameState.viewport.id);
    }
    tile.updateVisibility(frameState, viewportIds);
  }
  compareDistanceToCamera(b, a) {
    return b._distanceToCamera - a._distanceToCamera;
  }
  anyChildrenVisible(tile, frameState) {
    let anyVisible = false;
    for (const child of tile.children) {
      child.updateVisibility(frameState);
      anyVisible = anyVisible || child.isVisibleAndInRequestVolume;
    }
    return anyVisible;
  }
  executeEmptyTraversal(root, frameState) {
    let allDescendantsLoaded = true;
    const stack = this._emptyTraversalStack;
    stack.push(root);
    while (stack.length > 0 && allDescendantsLoaded) {
      const tile = stack.pop();
      this.updateTile(tile, frameState);
      if (!tile.isVisibleAndInRequestVolume) {
        this.loadTile(tile, frameState);
      }
      this.touchTile(tile, frameState);
      const traverse = !tile.hasRenderContent && this.canTraverse(tile, frameState, false, true);
      if (traverse) {
        const children = tile.children;
        for (const child of children) {
          if (stack.find(child)) {
            stack.delete(child);
          }
          stack.push(child);
        }
      } else if (!tile.contentAvailable) {
        allDescendantsLoaded = false;
      }
    }
    return allDescendantsLoaded;
  }
}
//# sourceMappingURL=tileset-traverser.js.map