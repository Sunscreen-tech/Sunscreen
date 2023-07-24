"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _solidPolygonLayerVertexMain = _interopRequireDefault(require("./solid-polygon-layer-vertex-main.glsl"));

var _default = "#define SHADER_NAME solid-polygon-layer-vertex-shader-side\n#define IS_SIDE_VERTEX\n\n\nattribute vec3 instancePositions;\nattribute vec3 nextPositions;\nattribute vec3 instancePositions64Low;\nattribute vec3 nextPositions64Low;\nattribute float instanceElevations;\nattribute vec4 instanceFillColors;\nattribute vec4 instanceLineColors;\nattribute vec3 instancePickingColors;\n\n".concat(_solidPolygonLayerVertexMain.default, "\n\nvoid main(void) {\n  PolygonProps props;\n\n  #if RING_WINDING_ORDER_CW == 1\n    props.positions = instancePositions;\n    props.positions64Low = instancePositions64Low;\n    props.nextPositions = nextPositions;\n    props.nextPositions64Low = nextPositions64Low;\n  #else\n    props.positions = nextPositions;\n    props.positions64Low = nextPositions64Low;\n    props.nextPositions = instancePositions;\n    props.nextPositions64Low = instancePositions64Low;\n  #endif\n  props.elevations = instanceElevations;\n  props.fillColors = instanceFillColors;\n  props.lineColors = instanceLineColors;\n  props.pickingColors = instancePickingColors;\n\n  calculatePosition(props);\n}\n");

exports.default = _default;
//# sourceMappingURL=solid-polygon-layer-vertex-side.glsl.js.map