"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replaceInRange = replaceInRange;

function replaceInRange(_ref) {
  var data = _ref.data,
      getIndex = _ref.getIndex,
      dataRange = _ref.dataRange,
      replace = _ref.replace;
  var _dataRange$startRow = dataRange.startRow,
      startRow = _dataRange$startRow === void 0 ? 0 : _dataRange$startRow,
      _dataRange$endRow = dataRange.endRow,
      endRow = _dataRange$endRow === void 0 ? Infinity : _dataRange$endRow;
  var count = data.length;
  var replaceStart = count;
  var replaceEnd = count;

  for (var i = 0; i < count; i++) {
    var row = getIndex(data[i]);

    if (replaceStart > i && row >= startRow) {
      replaceStart = i;
    }

    if (row >= endRow) {
      replaceEnd = i;
      break;
    }
  }

  var index = replaceStart;
  var dataLengthChanged = replaceEnd - replaceStart !== replace.length;
  var endChunk = dataLengthChanged ? data.slice(replaceEnd) : undefined;

  for (var _i = 0; _i < replace.length; _i++) {
    data[index++] = replace[_i];
  }

  if (endChunk) {
    for (var _i2 = 0; _i2 < endChunk.length; _i2++) {
      data[index++] = endChunk[_i2];
    }

    data.length = index;
  }

  return {
    startRow: replaceStart,
    endRow: replaceStart + replace.length
  };
}
//# sourceMappingURL=utils.js.map