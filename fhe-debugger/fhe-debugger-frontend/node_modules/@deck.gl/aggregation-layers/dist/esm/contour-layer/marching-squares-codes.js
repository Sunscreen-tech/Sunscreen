const HALF = 0.5;
const ONE6TH = 1 / 6;
const OFFSET = {
  N: [0, HALF],
  E: [HALF, 0],
  S: [0, -HALF],
  W: [-HALF, 0],
  NE: [HALF, HALF],
  NW: [-HALF, HALF],
  SE: [HALF, -HALF],
  SW: [-HALF, -HALF]
};
const SW_TRIANGLE = [OFFSET.W, OFFSET.SW, OFFSET.S];
const SE_TRIANGLE = [OFFSET.S, OFFSET.SE, OFFSET.E];
const NE_TRIANGLE = [OFFSET.E, OFFSET.NE, OFFSET.N];
const NW_TRIANGLE = [OFFSET.NW, OFFSET.W, OFFSET.N];
const SW_TRAPEZOID = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF]];
const SE_TRAPEZOID = [[-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH]];
const NE_TRAPEZOID = [[HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
const NW_TRAPEZOID = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
const S_RECTANGLE = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.E];
const E_RECTANGLE = [OFFSET.S, OFFSET.SE, OFFSET.NE, OFFSET.N];
const N_RECTANGLE = [OFFSET.NW, OFFSET.W, OFFSET.E, OFFSET.NE];
const W_RECTANGLE = [OFFSET.NW, OFFSET.SW, OFFSET.S, OFFSET.N];
const EW_RECTANGEL = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [HALF, -ONE6TH], [HALF, ONE6TH]];
const SN_RECTANGEL = [[-ONE6TH, -HALF], [ONE6TH, -HALF], [ONE6TH, HALF], [-ONE6TH, HALF]];
const SQUARE = [OFFSET.NW, OFFSET.SW, OFFSET.SE, OFFSET.NE];
const SW_PENTAGON = [OFFSET.NW, OFFSET.SW, OFFSET.SE, OFFSET.E, OFFSET.N];
const SE_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.NE, OFFSET.N];
const NE_PENTAGON = [OFFSET.NW, OFFSET.W, OFFSET.S, OFFSET.SE, OFFSET.NE];
const NW_PENTAGON = [OFFSET.NW, OFFSET.SW, OFFSET.S, OFFSET.E, OFFSET.NE];
const NW_N_PENTAGON = [OFFSET.NW, OFFSET.W, [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
const NE_E_PENTAGON = [[-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE, OFFSET.N];
const SE_S_PENTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.E];
const SW_W_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [ONE6TH, HALF], [-ONE6TH, HALF]];
const NW_W_PENTAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.N];
const NE_N_PENTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.E, OFFSET.NE, OFFSET.N];
const SE_E_PENTAGON = [OFFSET.S, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
const SW_S_PENTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH]];
const S_HEXAGON = [OFFSET.W, OFFSET.SW, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
const E_HEXAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.NE, OFFSET.N];
const N_HEXAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE];
const W_HEXAGON = [OFFSET.NW, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
const SW_NE_HEXAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, OFFSET.E, OFFSET.NE, OFFSET.N];
const NW_SE_HEXAGON = [OFFSET.NW, OFFSET.W, OFFSET.S, OFFSET.SE, OFFSET.E, OFFSET.N];
const NE_HEPTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF], OFFSET.E, OFFSET.NE, OFFSET.N];
const SW_HEPTAGON = [OFFSET.W, OFFSET.SW, OFFSET.S, [HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
const NW_HEPTAGON = [OFFSET.NW, OFFSET.W, [-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH], OFFSET.N];
const SE_HEPTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], OFFSET.S, OFFSET.SE, OFFSET.E, [ONE6TH, HALF], [-ONE6TH, HALF]];
const OCTAGON = [[-HALF, ONE6TH], [-HALF, -ONE6TH], [-ONE6TH, -HALF], [ONE6TH, -HALF], [HALF, -ONE6TH], [HALF, ONE6TH], [ONE6TH, HALF], [-ONE6TH, HALF]];
export const ISOLINES_CODE_OFFSET_MAP = {
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

function ternaryToIndex(ternary) {
  return parseInt(ternary, 4);
}

export const ISOBANDS_CODE_OFFSET_MAP = {
  [ternaryToIndex('0000')]: [],
  [ternaryToIndex('2222')]: [],
  [ternaryToIndex('2221')]: [SW_TRIANGLE],
  [ternaryToIndex('2212')]: [SE_TRIANGLE],
  [ternaryToIndex('2122')]: [NE_TRIANGLE],
  [ternaryToIndex('1222')]: [NW_TRIANGLE],
  [ternaryToIndex('0001')]: [SW_TRIANGLE],
  [ternaryToIndex('0010')]: [SE_TRIANGLE],
  [ternaryToIndex('0100')]: [NE_TRIANGLE],
  [ternaryToIndex('1000')]: [NW_TRIANGLE],
  [ternaryToIndex('2220')]: [SW_TRAPEZOID],
  [ternaryToIndex('2202')]: [SE_TRAPEZOID],
  [ternaryToIndex('2022')]: [NE_TRAPEZOID],
  [ternaryToIndex('0222')]: [NW_TRAPEZOID],
  [ternaryToIndex('0002')]: [SW_TRAPEZOID],
  [ternaryToIndex('0020')]: [SE_TRAPEZOID],
  [ternaryToIndex('0200')]: [NE_TRAPEZOID],
  [ternaryToIndex('2000')]: [NW_TRAPEZOID],
  [ternaryToIndex('0011')]: [S_RECTANGLE],
  [ternaryToIndex('0110')]: [E_RECTANGLE],
  [ternaryToIndex('1100')]: [N_RECTANGLE],
  [ternaryToIndex('1001')]: [W_RECTANGLE],
  [ternaryToIndex('2211')]: [S_RECTANGLE],
  [ternaryToIndex('2112')]: [E_RECTANGLE],
  [ternaryToIndex('1122')]: [N_RECTANGLE],
  [ternaryToIndex('1221')]: [W_RECTANGLE],
  [ternaryToIndex('2200')]: [EW_RECTANGEL],
  [ternaryToIndex('2002')]: [SN_RECTANGEL],
  [ternaryToIndex('0022')]: [EW_RECTANGEL],
  [ternaryToIndex('0220')]: [SN_RECTANGEL],
  [ternaryToIndex('1111')]: [SQUARE],
  [ternaryToIndex('1211')]: [SW_PENTAGON],
  [ternaryToIndex('2111')]: [SE_PENTAGON],
  [ternaryToIndex('1112')]: [NE_PENTAGON],
  [ternaryToIndex('1121')]: [NW_PENTAGON],
  [ternaryToIndex('1011')]: [SW_PENTAGON],
  [ternaryToIndex('0111')]: [SE_PENTAGON],
  [ternaryToIndex('1110')]: [NE_PENTAGON],
  [ternaryToIndex('1101')]: [NW_PENTAGON],
  [ternaryToIndex('1200')]: [NW_N_PENTAGON],
  [ternaryToIndex('0120')]: [NE_E_PENTAGON],
  [ternaryToIndex('0012')]: [SE_S_PENTAGON],
  [ternaryToIndex('2001')]: [SW_W_PENTAGON],
  [ternaryToIndex('1022')]: [NW_N_PENTAGON],
  [ternaryToIndex('2102')]: [NE_E_PENTAGON],
  [ternaryToIndex('2210')]: [SE_S_PENTAGON],
  [ternaryToIndex('0221')]: [SW_W_PENTAGON],
  [ternaryToIndex('1002')]: [NW_W_PENTAGON],
  [ternaryToIndex('2100')]: [NE_N_PENTAGON],
  [ternaryToIndex('0210')]: [SE_E_PENTAGON],
  [ternaryToIndex('0021')]: [SW_S_PENTAGON],
  [ternaryToIndex('1220')]: [NW_W_PENTAGON],
  [ternaryToIndex('0122')]: [NE_N_PENTAGON],
  [ternaryToIndex('2012')]: [SE_E_PENTAGON],
  [ternaryToIndex('2201')]: [SW_S_PENTAGON],
  [ternaryToIndex('0211')]: [S_HEXAGON],
  [ternaryToIndex('2110')]: [E_HEXAGON],
  [ternaryToIndex('1102')]: [N_HEXAGON],
  [ternaryToIndex('1021')]: [W_HEXAGON],
  [ternaryToIndex('2011')]: [S_HEXAGON],
  [ternaryToIndex('0112')]: [E_HEXAGON],
  [ternaryToIndex('1120')]: [N_HEXAGON],
  [ternaryToIndex('1201')]: [W_HEXAGON],
  [ternaryToIndex('2101')]: [SW_NE_HEXAGON],
  [ternaryToIndex('0121')]: [SW_NE_HEXAGON],
  [ternaryToIndex('1012')]: [NW_SE_HEXAGON],
  [ternaryToIndex('1210')]: [NW_SE_HEXAGON],
  [ternaryToIndex('0101')]: {
    0: [SW_TRIANGLE, NE_TRIANGLE],
    1: [SW_NE_HEXAGON],
    2: [SW_NE_HEXAGON]
  },
  [ternaryToIndex('1010')]: {
    0: [NW_TRIANGLE, SE_TRIANGLE],
    1: [NW_SE_HEXAGON],
    2: [NW_SE_HEXAGON]
  },
  [ternaryToIndex('2121')]: {
    0: [SW_NE_HEXAGON],
    1: [SW_NE_HEXAGON],
    2: [SW_TRIANGLE, NE_TRIANGLE]
  },
  [ternaryToIndex('1212')]: {
    0: [NW_SE_HEXAGON],
    1: [NW_SE_HEXAGON],
    2: [NW_TRIANGLE, SE_TRIANGLE]
  },
  [ternaryToIndex('2120')]: {
    0: [NE_HEPTAGON],
    1: [NE_HEPTAGON],
    2: [SW_TRAPEZOID, NE_TRIANGLE]
  },
  [ternaryToIndex('2021')]: {
    0: [SW_HEPTAGON],
    1: [SW_HEPTAGON],
    2: [SW_TRIANGLE, NE_TRAPEZOID]
  },
  [ternaryToIndex('1202')]: {
    0: [NW_HEPTAGON],
    1: [NW_HEPTAGON],
    2: [NW_TRIANGLE, SE_TRAPEZOID]
  },
  [ternaryToIndex('0212')]: {
    0: [SE_HEPTAGON],
    1: [SE_HEPTAGON],
    2: [SE_TRIANGLE, NW_TRAPEZOID]
  },
  [ternaryToIndex('0102')]: {
    0: [SW_TRAPEZOID, NE_TRIANGLE],
    1: [NE_HEPTAGON],
    2: [NE_HEPTAGON]
  },
  [ternaryToIndex('0201')]: {
    0: [SW_TRIANGLE, NE_TRAPEZOID],
    1: [SW_HEPTAGON],
    2: [SW_HEPTAGON]
  },
  [ternaryToIndex('1020')]: {
    0: [NW_TRIANGLE, SE_TRAPEZOID],
    1: [NW_HEPTAGON],
    2: [NW_HEPTAGON]
  },
  [ternaryToIndex('2010')]: {
    0: [SE_TRIANGLE, NW_TRAPEZOID],
    1: [SE_HEPTAGON],
    2: [SE_HEPTAGON]
  },
  [ternaryToIndex('2020')]: {
    0: [NW_TRAPEZOID, SE_TRAPEZOID],
    1: [OCTAGON],
    2: [SW_TRAPEZOID, NE_TRAPEZOID]
  },
  [ternaryToIndex('0202')]: {
    0: [NE_TRAPEZOID, SW_TRAPEZOID],
    1: [OCTAGON],
    2: [NW_TRAPEZOID, SE_TRAPEZOID]
  }
};
//# sourceMappingURL=marching-squares-codes.js.map