import { TILE3D_OPTIMIZATION_HINT, TILE_REFINEMENT } from '../../constants';
import { TilesetTraverser } from '../tileset-traverser';
export class Tileset3DTraverser extends TilesetTraverser {
  compareDistanceToCamera(a, b) {
    return b._distanceToCamera === 0 && a._distanceToCamera === 0 ? b._centerZDepth - a._centerZDepth : b._distanceToCamera - a._distanceToCamera;
  }
  updateTileVisibility(tile, frameState) {
    super.updateTileVisibility(tile, frameState);
    if (!tile.isVisibleAndInRequestVolume) {
      return;
    }
    const hasChildren = tile.children.length > 0;
    if (tile.hasTilesetContent && hasChildren) {
      const firstChild = tile.children[0];
      this.updateTileVisibility(firstChild, frameState);
      tile._visible = firstChild._visible;
      return;
    }
    if (this.meetsScreenSpaceErrorEarly(tile, frameState)) {
      tile._visible = false;
      return;
    }
    const replace = tile.refine === TILE_REFINEMENT.REPLACE;
    const useOptimization = tile._optimChildrenWithinParent === TILE3D_OPTIMIZATION_HINT.USE_OPTIMIZATION;
    if (replace && useOptimization && hasChildren) {
      if (!this.anyChildrenVisible(tile, frameState)) {
        tile._visible = false;
        return;
      }
    }
  }
  meetsScreenSpaceErrorEarly(tile, frameState) {
    const {
      parent
    } = tile;
    if (!parent || parent.hasTilesetContent || parent.refine !== TILE_REFINEMENT.ADD) {
      return false;
    }
    return !this.shouldRefine(tile, frameState, true);
  }
}
//# sourceMappingURL=tileset-3d-traverser.js.map