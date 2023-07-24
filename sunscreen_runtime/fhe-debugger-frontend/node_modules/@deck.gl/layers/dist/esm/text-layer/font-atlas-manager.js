import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import TinySDF from '@mapbox/tiny-sdf';
import { log } from '@deck.gl/core';
import { buildMapping } from './utils';
import LRUCache from './lru-cache';

function getDefaultCharacterSet() {
  const charSet = [];

  for (let i = 32; i < 128; i++) {
    charSet.push(String.fromCharCode(i));
  }

  return charSet;
}

export const DEFAULT_FONT_SETTINGS = {
  fontFamily: 'Monaco, monospace',
  fontWeight: 'normal',
  characterSet: getDefaultCharacterSet(),
  fontSize: 64,
  buffer: 4,
  sdf: false,
  cutoff: 0.25,
  radius: 12,
  smoothing: 0.1
};
const MAX_CANVAS_WIDTH = 1024;
const BASELINE_SCALE = 0.9;
const HEIGHT_SCALE = 1.2;
const CACHE_LIMIT = 3;
let cache = new LRUCache(CACHE_LIMIT);

function getNewChars(cacheKey, characterSet) {
  let newCharSet;

  if (typeof characterSet === 'string') {
    newCharSet = new Set(Array.from(characterSet));
  } else {
    newCharSet = new Set(characterSet);
  }

  const cachedFontAtlas = cache.get(cacheKey);

  if (!cachedFontAtlas) {
    return newCharSet;
  }

  for (const char in cachedFontAtlas.mapping) {
    if (newCharSet.has(char)) {
      newCharSet.delete(char);
    }
  }

  return newCharSet;
}

function populateAlphaChannel(alphaChannel, imageData) {
  for (let i = 0; i < alphaChannel.length; i++) {
    imageData.data[4 * i + 3] = alphaChannel[i];
  }
}

function setTextStyle(ctx, fontFamily, fontSize, fontWeight) {
  ctx.font = "".concat(fontWeight, " ").concat(fontSize, "px ").concat(fontFamily);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

export function setFontAtlasCacheLimit(limit) {
  log.assert(Number.isFinite(limit) && limit >= CACHE_LIMIT, 'Invalid cache limit');
  cache = new LRUCache(limit);
}
export default class FontAtlasManager {
  constructor() {
    _defineProperty(this, "props", { ...DEFAULT_FONT_SETTINGS
    });

    _defineProperty(this, "_key", void 0);

    _defineProperty(this, "_atlas", void 0);
  }

  get texture() {
    return this._atlas;
  }

  get mapping() {
    return this._atlas && this._atlas.mapping;
  }

  get scale() {
    const {
      fontSize,
      buffer
    } = this.props;
    return (fontSize * HEIGHT_SCALE + buffer * 2) / fontSize;
  }

  setProps(props = {}) {
    Object.assign(this.props, props);
    this._key = this._getKey();
    const charSet = getNewChars(this._key, this.props.characterSet);
    const cachedFontAtlas = cache.get(this._key);

    if (cachedFontAtlas && charSet.size === 0) {
      if (this._atlas !== cachedFontAtlas) {
        this._atlas = cachedFontAtlas;
      }

      return;
    }

    const fontAtlas = this._generateFontAtlas(charSet, cachedFontAtlas);

    this._atlas = fontAtlas;
    cache.set(this._key, fontAtlas);
  }

  _generateFontAtlas(characterSet, cachedFontAtlas) {
    const {
      fontFamily,
      fontWeight,
      fontSize,
      buffer,
      sdf,
      radius,
      cutoff
    } = this.props;
    let canvas = cachedFontAtlas && cachedFontAtlas.data;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = MAX_CANVAS_WIDTH;
    }

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true
    });
    setTextStyle(ctx, fontFamily, fontSize, fontWeight);
    const {
      mapping,
      canvasHeight,
      xOffset,
      yOffset
    } = buildMapping({
      getFontWidth: char => ctx.measureText(char).width,
      fontHeight: fontSize * HEIGHT_SCALE,
      buffer,
      characterSet,
      maxCanvasWidth: MAX_CANVAS_WIDTH,
      ...(cachedFontAtlas && {
        mapping: cachedFontAtlas.mapping,
        xOffset: cachedFontAtlas.xOffset,
        yOffset: cachedFontAtlas.yOffset
      })
    });

    if (canvas.height !== canvasHeight) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.height = canvasHeight;
      ctx.putImageData(imageData, 0, 0);
    }

    setTextStyle(ctx, fontFamily, fontSize, fontWeight);

    if (sdf) {
      const tinySDF = new TinySDF({
        fontSize,
        buffer,
        radius,
        cutoff,
        fontFamily,
        fontWeight: "".concat(fontWeight)
      });

      for (const char of characterSet) {
        const {
          data,
          width,
          height,
          glyphTop
        } = tinySDF.draw(char);
        mapping[char].width = width;
        mapping[char].layoutOffsetY = fontSize * BASELINE_SCALE - glyphTop;
        const imageData = ctx.createImageData(width, height);
        populateAlphaChannel(data, imageData);
        ctx.putImageData(imageData, mapping[char].x, mapping[char].y);
      }
    } else {
      for (const char of characterSet) {
        ctx.fillText(char, mapping[char].x, mapping[char].y + buffer + fontSize * BASELINE_SCALE);
      }
    }

    return {
      xOffset,
      yOffset,
      mapping,
      data: canvas,
      width: canvas.width,
      height: canvas.height
    };
  }

  _getKey() {
    const {
      fontFamily,
      fontWeight,
      fontSize,
      buffer,
      sdf,
      radius,
      cutoff
    } = this.props;

    if (sdf) {
      return "".concat(fontFamily, " ").concat(fontWeight, " ").concat(fontSize, " ").concat(buffer, " ").concat(radius, " ").concat(cutoff);
    }

    return "".concat(fontFamily, " ").concat(fontWeight, " ").concat(fontSize, " ").concat(buffer);
  }

}
//# sourceMappingURL=font-atlas-manager.js.map