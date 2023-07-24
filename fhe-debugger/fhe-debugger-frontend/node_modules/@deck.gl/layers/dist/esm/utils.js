export function replaceInRange({
  data,
  getIndex,
  dataRange,
  replace
}) {
  const {
    startRow = 0,
    endRow = Infinity
  } = dataRange;
  const count = data.length;
  let replaceStart = count;
  let replaceEnd = count;

  for (let i = 0; i < count; i++) {
    const row = getIndex(data[i]);

    if (replaceStart > i && row >= startRow) {
      replaceStart = i;
    }

    if (row >= endRow) {
      replaceEnd = i;
      break;
    }
  }

  let index = replaceStart;
  const dataLengthChanged = replaceEnd - replaceStart !== replace.length;
  const endChunk = dataLengthChanged ? data.slice(replaceEnd) : undefined;

  for (let i = 0; i < replace.length; i++) {
    data[index++] = replace[i];
  }

  if (endChunk) {
    for (let i = 0; i < endChunk.length; i++) {
      data[index++] = endChunk[i];
    }

    data.length = index;
  }

  return {
    startRow: replaceStart,
    endRow: replaceStart + replace.length
  };
}
//# sourceMappingURL=utils.js.map