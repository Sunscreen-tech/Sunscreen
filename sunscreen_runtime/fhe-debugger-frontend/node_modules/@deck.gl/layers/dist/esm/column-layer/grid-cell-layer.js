import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { CubeGeometry } from '@luma.gl/core';
import { UNIT } from '@deck.gl/core';
import ColumnLayer from './column-layer';
const defaultProps = {
  cellSize: {
    type: 'number',
    min: 0,
    value: 1000
  },
  offset: {
    type: 'array',
    value: [1, 1]
  }
};
export default class GridCellLayer extends ColumnLayer {
  getGeometry(diskResolution) {
    return new CubeGeometry();
  }

  draw({
    uniforms
  }) {
    const {
      elevationScale,
      extruded,
      offset,
      coverage,
      cellSize,
      angle,
      radiusUnits
    } = this.props;
    this.state.model.setUniforms(uniforms).setUniforms({
      radius: cellSize / 2,
      radiusUnits: UNIT[radiusUnits],
      angle,
      offset,
      extruded,
      coverage,
      elevationScale,
      edgeDistance: 1,
      isWireframe: false
    }).draw();
  }

}

_defineProperty(GridCellLayer, "layerName", 'GridCellLayer');

_defineProperty(GridCellLayer, "defaultProps", defaultProps);
//# sourceMappingURL=grid-cell-layer.js.map