import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { CompositeLayer, createIterable, log } from '@deck.gl/core';
import SolidPolygonLayer from '../solid-polygon-layer/solid-polygon-layer';
import PathLayer from '../path-layer/path-layer';
import * as Polygon from '../solid-polygon-layer/polygon';
import { replaceInRange } from '../utils';
const defaultLineColor = [0, 0, 0, 255];
const defaultFillColor = [0, 0, 0, 255];
const defaultProps = {
  stroked: true,
  filled: true,
  extruded: false,
  elevationScale: 1,
  wireframe: false,
  _normalize: true,
  _windingOrder: 'CW',
  lineWidthUnits: 'meters',
  lineWidthScale: 1,
  lineWidthMinPixels: 0,
  lineWidthMaxPixels: Number.MAX_SAFE_INTEGER,
  lineJointRounded: false,
  lineMiterLimit: 4,
  getPolygon: {
    type: 'accessor',
    value: f => f.polygon
  },
  getFillColor: {
    type: 'accessor',
    value: defaultFillColor
  },
  getLineColor: {
    type: 'accessor',
    value: defaultLineColor
  },
  getLineWidth: {
    type: 'accessor',
    value: 1
  },
  getElevation: {
    type: 'accessor',
    value: 1000
  },
  material: true
};
export default class PolygonLayer extends CompositeLayer {
  initializeState() {
    this.state = {
      paths: []
    };

    if (this.props.getLineDashArray) {
      log.removed('getLineDashArray', 'PathStyleExtension')();
    }
  }

  updateState({
    changeFlags
  }) {
    const geometryChanged = changeFlags.dataChanged || changeFlags.updateTriggersChanged && (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getPolygon);

    if (geometryChanged && Array.isArray(changeFlags.dataChanged)) {
      const paths = this.state.paths.slice();
      const pathsDiff = changeFlags.dataChanged.map(dataRange => replaceInRange({
        data: paths,
        getIndex: p => p.__source.index,
        dataRange,
        replace: this._getPaths(dataRange)
      }));
      this.setState({
        paths,
        pathsDiff
      });
    } else if (geometryChanged) {
      this.setState({
        paths: this._getPaths(),
        pathsDiff: null
      });
    }
  }

  _getPaths(dataRange = {}) {
    const {
      data,
      getPolygon,
      positionFormat,
      _normalize
    } = this.props;
    const paths = [];
    const positionSize = positionFormat === 'XY' ? 2 : 3;
    const {
      startRow,
      endRow
    } = dataRange;
    const {
      iterable,
      objectInfo
    } = createIterable(data, startRow, endRow);

    for (const object of iterable) {
      objectInfo.index++;
      let polygon = getPolygon(object, objectInfo);

      if (_normalize) {
        polygon = Polygon.normalize(polygon, positionSize);
      }

      const {
        holeIndices
      } = polygon;
      const positions = polygon.positions || polygon;

      if (holeIndices) {
        for (let i = 0; i <= holeIndices.length; i++) {
          const path = positions.slice(holeIndices[i - 1] || 0, holeIndices[i] || positions.length);
          paths.push(this.getSubLayerRow({
            path
          }, object, objectInfo.index));
        }
      } else {
        paths.push(this.getSubLayerRow({
          path: positions
        }, object, objectInfo.index));
      }
    }

    return paths;
  }

  renderLayers() {
    const {
      data,
      _dataDiff,
      stroked,
      filled,
      extruded,
      wireframe,
      _normalize,
      _windingOrder,
      elevationScale,
      transitions,
      positionFormat
    } = this.props;
    const {
      lineWidthUnits,
      lineWidthScale,
      lineWidthMinPixels,
      lineWidthMaxPixels,
      lineJointRounded,
      lineMiterLimit,
      lineDashJustified
    } = this.props;
    const {
      getFillColor,
      getLineColor,
      getLineWidth,
      getLineDashArray,
      getElevation,
      getPolygon,
      updateTriggers,
      material
    } = this.props;
    const {
      paths,
      pathsDiff
    } = this.state;
    const FillLayer = this.getSubLayerClass('fill', SolidPolygonLayer);
    const StrokeLayer = this.getSubLayerClass('stroke', PathLayer);
    const polygonLayer = this.shouldRenderSubLayer('fill', paths) && new FillLayer({
      _dataDiff,
      extruded,
      elevationScale,
      filled,
      wireframe,
      _normalize,
      _windingOrder,
      getElevation,
      getFillColor,
      getLineColor: extruded && wireframe ? getLineColor : defaultLineColor,
      material,
      transitions
    }, this.getSubLayerProps({
      id: 'fill',
      updateTriggers: updateTriggers && {
        getPolygon: updateTriggers.getPolygon,
        getElevation: updateTriggers.getElevation,
        getFillColor: updateTriggers.getFillColor,
        lineColors: extruded && wireframe,
        getLineColor: updateTriggers.getLineColor
      }
    }), {
      data,
      positionFormat,
      getPolygon
    });
    const polygonLineLayer = !extruded && stroked && this.shouldRenderSubLayer('stroke', paths) && new StrokeLayer({
      _dataDiff: pathsDiff && (() => pathsDiff),
      widthUnits: lineWidthUnits,
      widthScale: lineWidthScale,
      widthMinPixels: lineWidthMinPixels,
      widthMaxPixels: lineWidthMaxPixels,
      jointRounded: lineJointRounded,
      miterLimit: lineMiterLimit,
      dashJustified: lineDashJustified,
      _pathType: 'loop',
      transitions: transitions && {
        getWidth: transitions.getLineWidth,
        getColor: transitions.getLineColor,
        getPath: transitions.getPolygon
      },
      getColor: this.getSubLayerAccessor(getLineColor),
      getWidth: this.getSubLayerAccessor(getLineWidth),
      getDashArray: this.getSubLayerAccessor(getLineDashArray)
    }, this.getSubLayerProps({
      id: 'stroke',
      updateTriggers: updateTriggers && {
        getWidth: updateTriggers.getLineWidth,
        getColor: updateTriggers.getLineColor,
        getDashArray: updateTriggers.getLineDashArray
      }
    }), {
      data: paths,
      positionFormat,
      getPath: x => x.path
    });
    return [!extruded && polygonLayer, polygonLineLayer, extruded && polygonLayer];
  }

}

_defineProperty(PolygonLayer, "layerName", 'PolygonLayer');

_defineProperty(PolygonLayer, "defaultProps", defaultProps);
//# sourceMappingURL=polygon-layer.js.map