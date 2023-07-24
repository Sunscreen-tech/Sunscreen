export const EMPTY = [];
export const FULL = [[0, Infinity]];
export function add(rangeList, range) {
  if (rangeList === FULL) {
    return rangeList;
  }

  if (range[0] < 0) {
    range[0] = 0;
  }

  if (range[0] >= range[1]) {
    return rangeList;
  }

  const newRangeList = [];
  const len = rangeList.length;
  let insertPosition = 0;

  for (let i = 0; i < len; i++) {
    const range0 = rangeList[i];

    if (range0[1] < range[0]) {
      newRangeList.push(range0);
      insertPosition = i + 1;
    } else if (range0[0] > range[1]) {
      newRangeList.push(range0);
    } else {
      range = [Math.min(range0[0], range[0]), Math.max(range0[1], range[1])];
    }
  }

  newRangeList.splice(insertPosition, 0, range);
  return newRangeList;
}
//# sourceMappingURL=range.js.map