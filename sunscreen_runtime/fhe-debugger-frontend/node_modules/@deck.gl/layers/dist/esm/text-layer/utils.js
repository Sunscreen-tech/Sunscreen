import { log } from '@deck.gl/core';
const MISSING_CHAR_WIDTH = 32;
const SINGLE_LINE = [];
export function nextPowOfTwo(number) {
  return Math.pow(2, Math.ceil(Math.log2(number)));
}
export function buildMapping({
  characterSet,
  getFontWidth,
  fontHeight,
  buffer,
  maxCanvasWidth,
  mapping = {},
  xOffset = 0,
  yOffset = 0
}) {
  let row = 0;
  let x = xOffset;
  const rowHeight = fontHeight + buffer * 2;

  for (const char of characterSet) {
    if (!mapping[char]) {
      const width = getFontWidth(char);

      if (x + width + buffer * 2 > maxCanvasWidth) {
        x = 0;
        row++;
      }

      mapping[char] = {
        x: x + buffer,
        y: yOffset + row * rowHeight + buffer,
        width,
        height: rowHeight,
        layoutWidth: width,
        layoutHeight: fontHeight
      };
      x += width + buffer * 2;
    }
  }

  return {
    mapping,
    xOffset: x,
    yOffset: yOffset + row * rowHeight,
    canvasHeight: nextPowOfTwo(yOffset + (row + 1) * rowHeight)
  };
}

function getTextWidth(text, startIndex, endIndex, mapping) {
  let width = 0;

  for (let i = startIndex; i < endIndex; i++) {
    var _mapping$character;

    const character = text[i];
    width += ((_mapping$character = mapping[character]) === null || _mapping$character === void 0 ? void 0 : _mapping$character.layoutWidth) || 0;
  }

  return width;
}

function breakAll(text, startIndex, endIndex, maxWidth, iconMapping, target) {
  let rowStartCharIndex = startIndex;
  let rowOffsetLeft = 0;

  for (let i = startIndex; i < endIndex; i++) {
    const textWidth = getTextWidth(text, i, i + 1, iconMapping);

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
  let rowStartCharIndex = startIndex;
  let groupStartCharIndex = startIndex;
  let groupEndCharIndex = startIndex;
  let rowOffsetLeft = 0;

  for (let i = startIndex; i < endIndex; i++) {
    if (text[i] === ' ') {
      groupEndCharIndex = i + 1;
    } else if (text[i + 1] === ' ' || i + 1 === endIndex) {
      groupEndCharIndex = i + 1;
    }

    if (groupEndCharIndex > groupStartCharIndex) {
      let groupWidth = getTextWidth(text, groupStartCharIndex, groupEndCharIndex, iconMapping);

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

export function autoWrapping(text, wordBreak, maxWidth, iconMapping, startIndex = 0, endIndex) {
  if (endIndex === undefined) {
    endIndex = text.length;
  }

  const result = [];

  if (wordBreak === 'break-all') {
    breakAll(text, startIndex, endIndex, maxWidth, iconMapping, result);
  } else {
    breakWord(text, startIndex, endIndex, maxWidth, iconMapping, result);
  }

  return result;
}

function transformRow(line, startIndex, endIndex, iconMapping, leftOffsets, rowSize) {
  let x = 0;
  let rowHeight = 0;

  for (let i = startIndex; i < endIndex; i++) {
    const character = line[i];
    const frame = iconMapping[character];

    if (frame) {
      if (!rowHeight) {
        rowHeight = frame.layoutHeight;
      }

      leftOffsets[i] = x + frame.layoutWidth / 2;
      x += frame.layoutWidth;
    } else {
      log.warn("Missing character: ".concat(character, " (").concat(character.codePointAt(0), ")"))();
      leftOffsets[i] = x;
      x += MISSING_CHAR_WIDTH;
    }
  }

  rowSize[0] = x;
  rowSize[1] = rowHeight;
}

export function transformParagraph(paragraph, lineHeight, wordBreak, maxWidth, iconMapping) {
  const characters = Array.from(paragraph);
  const numCharacters = characters.length;
  const x = new Array(numCharacters);
  const y = new Array(numCharacters);
  const rowWidth = new Array(numCharacters);
  const autoWrappingEnabled = (wordBreak === 'break-word' || wordBreak === 'break-all') && isFinite(maxWidth) && maxWidth > 0;
  const size = [0, 0];
  const rowSize = [0, 0];
  let rowOffsetTop = 0;
  let lineStartIndex = 0;
  let lineEndIndex = 0;

  for (let i = 0; i <= numCharacters; i++) {
    const char = characters[i];

    if (char === '\n' || i === numCharacters) {
      lineEndIndex = i;
    }

    if (lineEndIndex > lineStartIndex) {
      const rows = autoWrappingEnabled ? autoWrapping(characters, wordBreak, maxWidth, iconMapping, lineStartIndex, lineEndIndex) : SINGLE_LINE;

      for (let rowIndex = 0; rowIndex <= rows.length; rowIndex++) {
        const rowStart = rowIndex === 0 ? lineStartIndex : rows[rowIndex - 1];
        const rowEnd = rowIndex < rows.length ? rows[rowIndex] : lineEndIndex;
        transformRow(characters, rowStart, rowEnd, iconMapping, x, rowSize);

        for (let j = rowStart; j < rowEnd; j++) {
          var _iconMapping$char;

          const char = characters[j];
          const layoutOffsetY = ((_iconMapping$char = iconMapping[char]) === null || _iconMapping$char === void 0 ? void 0 : _iconMapping$char.layoutOffsetY) || 0;
          y[j] = rowOffsetTop + rowSize[1] / 2 + layoutOffsetY;
          rowWidth[j] = rowSize[0];
        }

        rowOffsetTop = rowOffsetTop + rowSize[1] * lineHeight;
        size[0] = Math.max(size[0], rowSize[0]);
      }

      lineStartIndex = lineEndIndex;
    }

    if (char === '\n') {
      x[lineStartIndex] = 0;
      y[lineStartIndex] = 0;
      rowWidth[lineStartIndex] = 0;
      lineStartIndex++;
    }
  }

  size[1] = rowOffsetTop;
  return {
    x,
    y,
    rowWidth,
    size
  };
}
export function getTextFromBuffer({
  value,
  length,
  stride,
  offset,
  startIndices,
  characterSet
}) {
  const bytesPerElement = value.BYTES_PER_ELEMENT;
  const elementStride = stride ? stride / bytesPerElement : 1;
  const elementOffset = offset ? offset / bytesPerElement : 0;
  const characterCount = startIndices[length] || Math.ceil((value.length - elementOffset) / elementStride);
  const autoCharacterSet = characterSet && new Set();
  const texts = new Array(length);
  let codes = value;

  if (elementStride > 1 || elementOffset > 0) {
    const ArrayType = value.constructor;
    codes = new ArrayType(characterCount);

    for (let i = 0; i < characterCount; i++) {
      codes[i] = value[i * elementStride + elementOffset];
    }
  }

  for (let index = 0; index < length; index++) {
    const startIndex = startIndices[index];
    const endIndex = startIndices[index + 1] || characterCount;
    const codesAtIndex = codes.subarray(startIndex, endIndex);
    texts[index] = String.fromCodePoint.apply(null, codesAtIndex);

    if (autoCharacterSet) {
      codesAtIndex.forEach(autoCharacterSet.add, autoCharacterSet);
    }
  }

  if (autoCharacterSet) {
    for (const charCode of autoCharacterSet) {
      characterSet.add(String.fromCodePoint(charCode));
    }
  }

  return {
    texts,
    characterCount
  };
}
//# sourceMappingURL=utils.js.map