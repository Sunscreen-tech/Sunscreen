"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefaultProps = getDefaultProps;
exports.forwardProps = forwardProps;
exports.POLYGON_LAYER = exports.LINE_LAYER = exports.POINT_LAYER = void 0;

var _iconLayer = _interopRequireDefault(require("../icon-layer/icon-layer"));

var _scatterplotLayer = _interopRequireDefault(require("../scatterplot-layer/scatterplot-layer"));

var _textLayer = _interopRequireDefault(require("../text-layer/text-layer"));

var _pathLayer = _interopRequireDefault(require("../path-layer/path-layer"));

var _solidPolygonLayer = _interopRequireDefault(require("../solid-polygon-layer/solid-polygon-layer"));

var POINT_LAYER = {
  circle: {
    type: _scatterplotLayer.default,
    props: {
      filled: 'filled',
      stroked: 'stroked',
      lineWidthMaxPixels: 'lineWidthMaxPixels',
      lineWidthMinPixels: 'lineWidthMinPixels',
      lineWidthScale: 'lineWidthScale',
      lineWidthUnits: 'lineWidthUnits',
      pointRadiusMaxPixels: 'radiusMaxPixels',
      pointRadiusMinPixels: 'radiusMinPixels',
      pointRadiusScale: 'radiusScale',
      pointRadiusUnits: 'radiusUnits',
      pointAntialiasing: 'antialiasing',
      pointBillboard: 'billboard',
      getFillColor: 'getFillColor',
      getLineColor: 'getLineColor',
      getLineWidth: 'getLineWidth',
      getPointRadius: 'getRadius'
    }
  },
  icon: {
    type: _iconLayer.default,
    props: {
      iconAtlas: 'iconAtlas',
      iconMapping: 'iconMapping',
      iconSizeMaxPixels: 'sizeMaxPixels',
      iconSizeMinPixels: 'sizeMinPixels',
      iconSizeScale: 'sizeScale',
      iconSizeUnits: 'sizeUnits',
      iconAlphaCutoff: 'alphaCutoff',
      iconBillboard: 'billboard',
      getIcon: 'getIcon',
      getIconAngle: 'getAngle',
      getIconColor: 'getColor',
      getIconPixelOffset: 'getPixelOffset',
      getIconSize: 'getSize'
    }
  },
  text: {
    type: _textLayer.default,
    props: {
      textSizeMaxPixels: 'sizeMaxPixels',
      textSizeMinPixels: 'sizeMinPixels',
      textSizeScale: 'sizeScale',
      textSizeUnits: 'sizeUnits',
      textBackground: 'background',
      textBackgroundPadding: 'backgroundPadding',
      textFontFamily: 'fontFamily',
      textFontWeight: 'fontWeight',
      textLineHeight: 'lineHeight',
      textMaxWidth: 'maxWidth',
      textOutlineColor: 'outlineColor',
      textOutlineWidth: 'outlineWidth',
      textWordBreak: 'wordBreak',
      textCharacterSet: 'characterSet',
      textBillboard: 'billboard',
      textFontSettings: 'fontSettings',
      getText: 'getText',
      getTextAngle: 'getAngle',
      getTextColor: 'getColor',
      getTextPixelOffset: 'getPixelOffset',
      getTextSize: 'getSize',
      getTextAnchor: 'getTextAnchor',
      getTextAlignmentBaseline: 'getAlignmentBaseline',
      getTextBackgroundColor: 'getBackgroundColor',
      getTextBorderColor: 'getBorderColor',
      getTextBorderWidth: 'getBorderWidth'
    }
  }
};
exports.POINT_LAYER = POINT_LAYER;
var LINE_LAYER = {
  type: _pathLayer.default,
  props: {
    lineWidthUnits: 'widthUnits',
    lineWidthScale: 'widthScale',
    lineWidthMinPixels: 'widthMinPixels',
    lineWidthMaxPixels: 'widthMaxPixels',
    lineJointRounded: 'jointRounded',
    lineCapRounded: 'capRounded',
    lineMiterLimit: 'miterLimit',
    lineBillboard: 'billboard',
    getLineColor: 'getColor',
    getLineWidth: 'getWidth'
  }
};
exports.LINE_LAYER = LINE_LAYER;
var POLYGON_LAYER = {
  type: _solidPolygonLayer.default,
  props: {
    extruded: 'extruded',
    filled: 'filled',
    wireframe: 'wireframe',
    elevationScale: 'elevationScale',
    material: 'material',
    _full3d: '_full3d',
    getElevation: 'getElevation',
    getFillColor: 'getFillColor',
    getLineColor: 'getLineColor'
  }
};
exports.POLYGON_LAYER = POLYGON_LAYER;

function getDefaultProps(_ref) {
  var type = _ref.type,
      props = _ref.props;
  var result = {};

  for (var key in props) {
    result[key] = type.defaultProps[props[key]];
  }

  return result;
}

function forwardProps(layer, mapping) {
  var _layer$props = layer.props,
      transitions = _layer$props.transitions,
      updateTriggers = _layer$props.updateTriggers;
  var result = {
    updateTriggers: {},
    transitions: transitions && {
      getPosition: transitions.geometry
    }
  };

  for (var sourceKey in mapping) {
    var targetKey = mapping[sourceKey];
    var value = layer.props[sourceKey];

    if (sourceKey.startsWith('get')) {
      value = layer.getSubLayerAccessor(value);
      result.updateTriggers[targetKey] = updateTriggers[sourceKey];

      if (transitions) {
        result.transitions[targetKey] = transitions[sourceKey];
      }
    }

    result[targetKey] = value;
  }

  return result;
}
//# sourceMappingURL=sub-layer-map.js.map