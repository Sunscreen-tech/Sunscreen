"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nextPowOfTwo = nextPowOfTwo;
exports.buildMapping = buildMapping;
exports.autoWrapping = autoWrapping;
exports.transformParagraph = transformParagraph;
exports.getTextFromBuffer = getTextFromBuffer;

var _core = require("@deck.gl/core");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var MISSING_CHAR_WIDTH = 32;
var SINGLE_LINE = [];

function nextPowOfTwo(number) {
  return Math.pow(2, Math.ceil(Math.log2(number)));
}

function buildMapping(_ref) {
  var characterSet = _ref.characterSet,
      getFontWidth = _ref.getFontWidth,
      fontHeight = _ref.fontHeight,
      buffer = _ref.buffer,
      maxCanvasWidth = _ref.maxCanvasWidth,
      _ref$mapping = _ref.mapping,
      mapping = _ref$mapping === void 0 ? {} : _ref$mapping,
      _ref$xOffset = _ref.xOffset,
      xOffset = _ref$xOffset === void 0 ? 0 : _ref$xOffset,
      _ref$yOffset = _ref.yOffset,
      yOffset = _ref$yOffset === void 0 ? 0 : _ref$yOffset;
  var row = 0;
  var x = xOffset;
  var rowHeight = fontHeight + buffer * 2;

  var _iterator = _createForOfIteratorHelper(characterSet),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _char = _step.value;

      if (!mapping[_char]) {
        var width = getFontWidth(_char);

        if (x + width + buffer * 2 > maxCanvasWidth) {
          x = 0;
          row++;
        }

        mapping[_char] = {
          x: x + buffer,
          y: yOffset + row * rowHeight + buffer,
          width: width,
          height: rowHeight,
          layoutWidth: width,
          layoutHeight: fontHeight
        };
        x += width + buffer * 2;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return {
    mapping: mapping,
    xOffset: x,
    yOffset: yOffset + row * rowHeight,
    canvasHeight: nextPowOfTwo(yOffset + (row + 1) * rowHeight)
  };
}

function getTextWidth(text, startIndex, endIndex, mapping) {
  var width = 0;

  for (var i = startIndex; i < endIndex; i++) {
    var _mapping$character;

    var character = text[i];
    width += ((_mapping$character = mapping[character]) === null || _mapping$character === void 0 ? void 0 : _mapping$character.layoutWidth) || 0;
  }

  return width;
}

function breakAll(text, startIndex, endIndex, maxWidth, iconMapping, target) {
  var rowStartCharIndex = startIndex;
  var rowOffsetLeft = 0;

  for (var i = startIndex; i < endIndex; i++) {
    var textWidth = getTextWidth(text, i, i + 1, iconMapping);

    if (rowOffsetLeft + textWidth > maxWidth) {
      if (rowStartCharIndex < i) {
        target.push(i);
      }

      rowStartCharIndex = i;
      rowOffsetLeft = 0;
    }

    rowOffsetLeft += textWidth;
  }

  return rowOffsetLeft;
}

function breakWord(text, startIndex, endIndex, maxWidth, iconMapping, target) {
  var rowStartCharIndex = startIndex;
  var groupStartCharIndex = startIndex;
  var groupEndCharIndex = startIndex;
  var rowOffsetLeft = 0;

  for (var i = startIndex; i < endIndex; i++) {
    if (text[i] === ' ') {
      groupEndCharIndex = i + 1;
    } else if (text[i + 1] === ' ' || i + 1 === endIndex) {
      groupEndCharIndex = i + 1;
    }

    if (groupEndCharIndex > groupStartCharIndex) {
      var groupWidth = getTextWidth(text, groupStartCharIndex, groupEndCharIndex, iconMapping);

      if (rowOffsetLeft + groupWidth > maxWidth) {
        if (rowStartCharIndex < groupStartCharIndex) {
          target.push(groupStartCharIndex);
          rowStartCharIndex = groupStartCharIndex;
          rowOffsetLeft = 0;
        }

        if (groupWidth > maxWidth) {
          groupWidth = breakAll(text, groupStartCharIndex, groupEndCharIndex, maxWidth, iconMapping, target);
          rowStartCharIndex = target[target.length - 1];
        }
      }

      groupStartCharIndex = groupEndCharIndex;
      rowOffsetLeft += groupWidth;
    }
  }

  return rowOffsetLeft;
}

function autoWrapping(text, wordBreak, maxWidth, iconMapping) {
  var startIndex = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0;
  var endIndex = arguments.length > 5 ? arguments[5] : undefined;

  if (endIndex === undefined) {
    endIndex = text.length;
  }

  var result = [];

  if (wordBreak === 'break-all') {
    breakAll(text, startIndex, endIndex, maxWidth, iconMapping, result);
  } else {
    breakWord(text, startIndex, endIndex, maxWidth, iconMapping, result);
  }

  return result;
}

function transformRow(line, startIndex, endIndex, iconMapping, leftOffsets, rowSize) {
  var x = 0;
  var rowHeight = 0;

  for (var i = startIndex; i < endIndex; i++) {
    var character = line[i];
    var frame = iconMapping[character];

    if (frame) {
      if (!rowHeight) {
        rowHeight = frame.layoutHeight;
      }

      leftOffsets[i] = x + frame.layoutWidth / 2;
      x += frame.layoutWidth;
    } else {
      _core.log.warn("Missing character: ".concat(character, " (").concat(character.codePointAt(0), ")"))();

      leftOffsets[i] = x;
      x += MISSING_CHAR_WIDTH;
    }
  }

  rowSize[0] = x;
  rowSize[1] = rowHeight;
}

function transformParagraph(paragraph, lineHeight, wordBreak, maxWidth, iconMapping) {
  var characters = Array.from(paragraph);
  var numCharacters = characters.length;
  var x = new Array(numCharacters);
  var y = new Array(numCharacters);
  var rowWidth = new Array(numCharacters);
  var autoWrappingEnabled = (wordBreak === 'break-word' || wordBreak === 'break-all') && isFinite(maxWidth) && maxWidth > 0;
  var size = [0, 0];
  var rowSize = [0, 0];
  var rowOffsetTop = 0;
  var lineStartIndex = 0;
  var lineEndIndex = 0;

  for (var i = 0; i <= numCharacters; i++) {
    var _char2 = characters[i];

    if (_char2 === '\n' || i === numCharacters) {
      lineEndIndex = i;
    }

    if (lineEndIndex > lineStartIndex) {
      var rows = autoWrappingEnabled ? autoWrapping(characters, wordBreak, maxWidth, iconMapping, lineStartIndex, lineEndIndex) : SINGLE_LINE;

      for (var rowIndex = 0; rowIndex <= rows.length; rowIndex++) {
        var rowStart = rowIndex === 0 ? lineStartIndex : rows[rowIndex - 1];
        var rowEnd = rowIndex < rows.length ? rows[rowIndex] : lineEndIndex;
        transformRow(characters, rowStart, rowEnd, iconMapping, x, rowSize);

        for (var j = rowStart; j < rowEnd; j++) {
          var _iconMapping$_char;

          var _char3 = characters[j];
          var layoutOffsetY = ((_iconMapping$_char = iconMapping[_char3]) === null || _iconMapping$_char === void 0 ? void 0 : _iconMapping$_char.layoutOffsetY) || 0;
          y[j] = rowOffsetTop + rowSize[1] / 2 + layoutOffsetY;
          rowWidth[j] = rowSize[0];
        }

        rowOffsetTop = rowOffsetTop + rowSize[1] * lineHeight;
        size[0] = Math.max(size[0], rowSize[0]);
      }

      lineStartIndex = lineEndIndex;
    }

    if (_char2 === '\n') {
      x[lineStartIndex] = 0;
      y[lineStartIndex] = 0;
      rowWidth[lineStartIndex] = 0;
      lineStartIndex++;
    }
  }

  size[1] = rowOffsetTop;
  return {
    x: x,
    y: y,
    rowWidth: rowWidth,
    size: size
  };
}

function getTextFromBuffer(_ref2) {
  var value = _ref2.value,
      length = _ref2.length,
      stride = _ref2.stride,
      offset = _ref2.offset,
      startIndices = _ref2.startIndices,
      characterSet = _ref2.characterSet;
  var bytesPerElement = value.BYTES_PER_ELEMENT;
  var elementStride = stride ? stride / bytesPerElement : 1;
  var elementOffset = offset ? offset / bytesPerElement : 0;
  var characterCount = startIndices[length] || Math.ceil((value.length - elementOffset) / elementStride);
  var autoCharacterSet = characterSet && new Set();
  var texts = new Array(length);
  var codes = value;

  if (elementStride > 1 || elementOffset > 0) {
    var ArrayType = value.constructor;
    codes = new ArrayType(characterCount);

    for (var i = 0; i < characterCount; i++) {
      codes[i] = value[i * elementStride + elementOffset];
    }
  }

  for (var index = 0; index < length; index++) {
    var startIndex = startIndices[index];
    var endIndex = startIndices[index + 1] || characterCount;
    var codesAtIndex = codes.subarray(startIndex, endIndex);
    texts[index] = String.fromCodePoint.apply(null, codesAtIndex);

    if (autoCharacterSet) {
      codesAtIndex.forEach(autoCharacterSet.add, autoCharacterSet);
    }
  }

  if (autoCharacterSet) {
    var _iterator2 = _createForOfIteratorHelper(autoCharacterSet),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var charCode = _step2.value;
        characterSet.add(String.fromCodePoint(charCode));
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }

  return {
    texts: texts,
    characterCount: characterCount
  };
}
//# sourceMappingURL=utils.js.map