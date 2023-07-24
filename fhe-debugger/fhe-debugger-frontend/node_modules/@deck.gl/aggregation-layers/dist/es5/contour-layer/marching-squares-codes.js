"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ISOBANDS_CODE_OFFSET_MAP = exports.ISOLINES_CODE_OFFSET_MAP = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _ISOBANDS_CODE_OFFSET;

var HALF = 0.5;
var ONE6TH = 1 / 6;
var OFFSET = {
  N: [0, HALF],
  E: [HALF, 0],
  S: [0, -HALF],
  W: [-HALF, 0],
  NE: [HALF, HALF],
  NW: [-HALF, HALF],
  SE: [HALF, -HALF],
  SW: [-HALF, -HALF]
};
var SW_TRIANGLE = [OFFSET.W, OFFSET.SW, OFFSET.S];
var SE_TRIANGLE = [OFFSET.S, OFFSET.SE, OFFSET.E];
var NE_TRIANGLE = [OFFSET.E, OFFSET.NE, OFFSET.N];
var NW_TRIANGLE = [OFFSET.NW, OFFSET.W, OFFSET.N];
var SW_TRAPEZOID = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF]];
var SE_TRAPEZOID = [[-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH]];
var NE_TRAPEZOID = [[HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
var NW_TRAPEZOID = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
var S_RECTANGLE = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.E];
var E_RECTANGLE = [OFFSET.S, OFFSET.SE, OFFSET.NE, OFFSET.N];
var N_RECTANGLE = [OFFSET.NW, OFFSET.W, OFFSET.E, OFFSET.NE];
var W_RECTANGLE = [OFFSET.NW, OFFSET.SW, OFFSET.S, OFFSET.N];
var EW_RECTANGEL = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [HALF, -ONE6TH], [HALF, ONE6TH]];
var SN_RECTANGEL = [[-ONE6TH, -HALF], [ONE6TH, -HALF], [ONE6TH, HALF], [-ONE6TH, HALF]];
var SQUARE = [OFFSET.NW, OFFSET.SW, OFFSET.SE, OFFSET.NE];
var SW_PENTAGON = [OFFSET.NW, OFFSET.SW, OFFSET.SE, OFFSET.E, OFFSET.N];
var SE_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.NE, OFFSET.N];
var NE_PENTAGON = [OFFSET.NW, OFFSET.W, OFFSET.S, OFFSET.SE, OFFSET.NE];
var NW_PENTAGON = [OFFSET.NW, OFFSET.SW, OFFSET.S, OFFSET.E, OFFSET.NE];
var NW_N_PENTAGON = [OFFSET.NW, OFFSET.W, [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
var NE_E_PENTAGON = [[-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE, OFFSET.N];
var SE_S_PENTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.E];
var SW_W_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [ONE6TH, HALF], [-ONE6TH, HALF]];
var NW_W_PENTAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.N];
var NE_N_PENTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.E, OFFSET.NE, OFFSET.N];
var SE_E_PENTAGON = [OFFSET.S, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
var SW_S_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH]];
var S_HEXAGON = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
var E_HEXAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.NE, OFFSET.N];
var N_HEXAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE];
var W_HEXAGON = [OFFSET.NW, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
var SW_NE_HEXAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, OFFSET.E, OFFSET.NE, OFFSET.N];
var NW_SE_HEXAGON = [OFFSET.NW, OFFSET.W, OFFSET.S, OFFSET.SE, OFFSET.E, OFFSET.N];
var NE_HEPTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE, OFFSET.N];
var SW_HEPTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
var NW_HEPTAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
var SE_HEPTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
var OCTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
var ISOLINES_CODE_OFFSET_MAP = {
  0: [],
  1: [[OFFSET.W, OFFSET.S]],
  2: [[OFFSET.S, OFFSET.E]],
  3: [[OFFSET.W, OFFSET.E]],
  4: [[OFFSET.N, OFFSET.E]],
  5: {
    0: [[OFFSET.W, OFFSET.S], [OFFSET.N, OFFSET.E]],
    1: [[OFFSET.W, OFFSET.N], [OFFSET.S, OFFSET.E]]
  },
  6: [[OFFSET.N, OFFSET.S]],
  7: [[OFFSET.W, OFFSET.N]],
  8: [[OFFSET.W, OFFSET.N]],
  9: [[OFFSET.N, OFFSET.S]],
  10: {
    0: [[OFFSET.W, OFFSET.N], [OFFSET.S, OFFSET.E]],
    1: [[OFFSET.W, OFFSET.S], [OFFSET.N, OFFSET.E]]
  },
  11: [[OFFSET.N, OFFSET.E]],
  12: [[OFFSET.W, OFFSET.E]],
  13: [[OFFSET.S, OFFSET.E]],
  14: [[OFFSET.W, OFFSET.S]],
  15: []
};
exports.ISOLINES_CODE_OFFSET_MAP = ISOLINES_CODE_OFFSET_MAP;

function ternaryToIndex(ternary) {
  return parseInt(ternary, 4);
}

var ISOBANDS_CODE_OFFSET_MAP = (_ISOBANDS_CODE_OFFSET = {}, (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0000'), []), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2222'), []), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2221'), [SW_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2212'), [SE_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2122'), [NE_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1222'), [NW_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0001'), [SW_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0010'), [SE_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0100'), [NE_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1000'), [NW_TRIANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2220'), [SW_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2202'), [SE_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2022'), [NE_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0222'), [NW_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0002'), [SW_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0020'), [SE_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0200'), [NE_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2000'), [NW_TRAPEZOID]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0011'), [S_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0110'), [E_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1100'), [N_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1001'), [W_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2211'), [S_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2112'), [E_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1122'), [N_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1221'), [W_RECTANGLE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2200'), [EW_RECTANGEL]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2002'), [SN_RECTANGEL]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0022'), [EW_RECTANGEL]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0220'), [SN_RECTANGEL]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1111'), [SQUARE]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1211'), [SW_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2111'), [SE_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1112'), [NE_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1121'), [NW_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1011'), [SW_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0111'), [SE_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1110'), [NE_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1101'), [NW_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1200'), [NW_N_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0120'), [NE_E_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0012'), [SE_S_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2001'), [SW_W_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1022'), [NW_N_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2102'), [NE_E_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2210'), [SE_S_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0221'), [SW_W_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1002'), [NW_W_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2100'), [NE_N_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0210'), [SE_E_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0021'), [SW_S_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1220'), [NW_W_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0122'), [NE_N_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2012'), [SE_E_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2201'), [SW_S_PENTAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0211'), [S_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2110'), [E_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1102'), [N_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1021'), [W_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2011'), [S_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0112'), [E_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1120'), [N_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1201'), [W_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2101'), [SW_NE_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0121'), [SW_NE_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1012'), [NW_SE_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1210'), [NW_SE_HEXAGON]), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0101'), {
  0: [SW_TRIANGLE, NE_TRIANGLE],
  1: [SW_NE_HEXAGON],
  2: [SW_NE_HEXAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1010'), {
  0: [NW_TRIANGLE, SE_TRIANGLE],
  1: [NW_SE_HEXAGON],
  2: [NW_SE_HEXAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2121'), {
  0: [SW_NE_HEXAGON],
  1: [SW_NE_HEXAGON],
  2: [SW_TRIANGLE, NE_TRIANGLE]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1212'), {
  0: [NW_SE_HEXAGON],
  1: [NW_SE_HEXAGON],
  2: [NW_TRIANGLE, SE_TRIANGLE]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2120'), {
  0: [NE_HEPTAGON],
  1: [NE_HEPTAGON],
  2: [SW_TRAPEZOID, NE_TRIANGLE]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2021'), {
  0: [SW_HEPTAGON],
  1: [SW_HEPTAGON],
  2: [SW_TRIANGLE, NE_TRAPEZOID]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1202'), {
  0: [NW_HEPTAGON],
  1: [NW_HEPTAGON],
  2: [NW_TRIANGLE, SE_TRAPEZOID]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0212'), {
  0: [SE_HEPTAGON],
  1: [SE_HEPTAGON],
  2: [SE_TRIANGLE, NW_TRAPEZOID]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0102'), {
  0: [SW_TRAPEZOID, NE_TRIANGLE],
  1: [NE_HEPTAGON],
  2: [NE_HEPTAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0201'), {
  0: [SW_TRIANGLE, NE_TRAPEZOID],
  1: [SW_HEPTAGON],
  2: [SW_HEPTAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('1020'), {
  0: [NW_TRIANGLE, SE_TRAPEZOID],
  1: [NW_HEPTAGON],
  2: [NW_HEPTAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2010'), {
  0: [SE_TRIANGLE, NW_TRAPEZOID],
  1: [SE_HEPTAGON],
  2: [SE_HEPTAGON]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('2020'), {
  0: [NW_TRAPEZOID, SE_TRAPEZOID],
  1: [OCTAGON],
  2: [SW_TRAPEZOID, NE_TRAPEZOID]
}), (0, _defineProperty2.default)(_ISOBANDS_CODE_OFFSET, ternaryToIndex('0202'), {
  0: [NE_TRAPEZOID, SW_TRAPEZOID],
  1: [OCTAGON],
  2: [NW_TRAPEZOID, SE_TRAPEZOID]
}), _ISOBANDS_CODE_OFFSET);
exports.ISOBANDS_CODE_OFFSET_MAP = ISOBANDS_CODE_OFFSET_MAP;
//# sourceMappingURL=marching-squares-codes.js.map