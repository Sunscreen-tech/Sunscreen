import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Texture2D, copyToTexture } from '@luma.gl/core';
import { load } from '@loaders.gl/core';
import { createIterable } from '@deck.gl/core';
const DEFAULT_CANVAS_WIDTH = 1024;
const DEFAULT_BUFFER = 4;

const noop = () => {};

const DEFAULT_TEXTURE_PARAMETERS = {
  [10241]: 9987,
  [10240]: 9729,
  [10242]: 33071,
  [10243]: 33071
};

function nextPowOfTwo(number) {
  return Math.pow(2, Math.ceil(Math.log2(number)));
}

function resizeImage(ctx, imageData, maxWidth, maxHeight) {
  const resizeRatio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
  const width = Math.floor(imageData.width * resizeRatio);
  const height = Math.floor(imageData.height * resizeRatio);

  if (resizeRatio === 1) {
    return {
      data: imageData,
      width,
      height
    };
  }

  ctx.canvas.height = height;
  ctx.canvas.width = width;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(imageData, 0, 0, imageData.width, imageData.height, 0, 0, width, height);
  return {
    data: ctx.canvas,
    width,
    height
  };
}

function getIconId(icon) {
  return icon && (icon.id || icon.url);
}

function resizeTexture(texture, width, height, parameters) {
  const oldWidth = texture.width;
  const oldHeight = texture.height;
  const newTexture = new Texture2D(texture.gl, {
    width,
    height,
    parameters
  });
  copyToTexture(texture, newTexture, {
    targetY: 0,
    width: oldWidth,
    height: oldHeight
  });
  texture.delete();
  return newTexture;
}

function buildRowMapping(mapping, columns, yOffset) {
  for (let i = 0; i < columns.length; i++) {
    const {
      icon,
      xOffset
    } = columns[i];
    const id = getIconId(icon);
    mapping[id] = { ...icon,
      x: xOffset,
      y: yOffset
    };
  }
}

export function buildMapping({
  icons,
  buffer,
  mapping = {},
  xOffset = 0,
  yOffset = 0,
  rowHeight = 0,
  canvasWidth
}) {
  let columns = [];

  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    const id = getIconId(icon);

    if (!mapping[id]) {
      const {
        height,
        width
      } = icon;

      if (xOffset + width + buffer > canvasWidth) {
        buildRowMapping(mapping, columns, yOffset);
        xOffset = 0;
        yOffset = rowHeight + yOffset + buffer;
        rowHeight = 0;
        columns = [];
      }

      columns.push({
        icon,
        xOffset
      });
      xOffset = xOffset + width + buffer;
      rowHeight = Math.max(rowHeight, height);
    }
  }

  if (columns.length > 0) {
    buildRowMapping(mapping, columns, yOffset);
  }

  return {
    mapping,
    rowHeight,
    xOffset,
    yOffset,
    canvasWidth,
    canvasHeight: nextPowOfTwo(rowHeight + yOffset + buffer)
  };
}
export function getDiffIcons(data, getIcon, cachedIcons) {
  if (!data || !getIcon) {
    return null;
  }

  cachedIcons = cachedIcons || {};
  const icons = {};
  const {
    iterable,
    objectInfo
  } = createIterable(data);

  for (const object of iterable) {
    objectInfo.index++;
    const icon = getIcon(object, objectInfo);
    const id = getIconId(icon);

    if (!icon) {
      throw new Error('Icon is missing.');
    }

    if (!icon.url) {
      throw new Error('Icon url is missing.');
    }

    if (!icons[id] && (!cachedIcons[id] || icon.url !== cachedIcons[id].url)) {
      icons[id] = { ...icon,
        source: object,
        sourceIndex: objectInfo.index
      };
    }
  }

  return icons;
}
export default class IconManager {
  constructor(gl, {
    onUpdate = noop,
    onError = noop
  }) {
    _defineProperty(this, "gl", void 0);

    _defineProperty(this, "onUpdate", void 0);

    _defineProperty(this, "onError", void 0);

    _defineProperty(this, "_loadOptions", null);

    _defineProperty(this, "_texture", null);

    _defineProperty(this, "_externalTexture", null);

    _defineProperty(this, "_mapping", {});

    _defineProperty(this, "_textureParameters", null);

    _defineProperty(this, "_pendingCount", 0);

    _defineProperty(this, "_autoPacking", false);

    _defineProperty(this, "_xOffset", 0);

    _defineProperty(this, "_yOffset", 0);

    _defineProperty(this, "_rowHeight", 0);

    _defineProperty(this, "_buffer", DEFAULT_BUFFER);

    _defineProperty(this, "_canvasWidth", DEFAULT_CANVAS_WIDTH);

    _defineProperty(this, "_canvasHeight", 0);

    _defineProperty(this, "_canvas", null);

    this.gl = gl;
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  finalize() {
    var _this$_texture;

    (_this$_texture = this._texture) === null || _this$_texture === void 0 ? void 0 : _this$_texture.delete();
  }

  getTexture() {
    return this._texture || this._externalTexture;
  }

  getIconMapping(icon) {
    const id = this._autoPacking ? getIconId(icon) : icon;
    return this._mapping[id] || {};
  }

  setProps({
    loadOptions,
    autoPacking,
    iconAtlas,
    iconMapping,
    textureParameters
  }) {
    if (loadOptions) {
      this._loadOptions = loadOptions;
    }

    if (autoPacking !== undefined) {
      this._autoPacking = autoPacking;
    }

    if (iconMapping) {
      this._mapping = iconMapping;
    }

    if (iconAtlas) {
      var _this$_texture2;

      (_this$_texture2 = this._texture) === null || _this$_texture2 === void 0 ? void 0 : _this$_texture2.delete();
      this._texture = null;
      this._externalTexture = iconAtlas;
    }

    if (textureParameters) {
      this._textureParameters = textureParameters;
    }
  }

  get isLoaded() {
    return this._pendingCount === 0;
  }

  packIcons(data, getIcon) {
    if (!this._autoPacking || typeof document === 'undefined') {
      return;
    }

    const icons = Object.values(getDiffIcons(data, getIcon, this._mapping) || {});

    if (icons.length > 0) {
      const {
        mapping,
        xOffset,
        yOffset,
        rowHeight,
        canvasHeight
      } = buildMapping({
        icons,
        buffer: this._buffer,
        canvasWidth: this._canvasWidth,
        mapping: this._mapping,
        rowHeight: this._rowHeight,
        xOffset: this._xOffset,
        yOffset: this._yOffset
      });
      this._rowHeight = rowHeight;
      this._mapping = mapping;
      this._xOffset = xOffset;
      this._yOffset = yOffset;
      this._canvasHeight = canvasHeight;

      if (!this._texture) {
        this._texture = new Texture2D(this.gl, {
          width: this._canvasWidth,
          height: this._canvasHeight,
          parameters: this._textureParameters || DEFAULT_TEXTURE_PARAMETERS
        });
      }

      if (this._texture.height !== this._canvasHeight) {
        this._texture = resizeTexture(this._texture, this._canvasWidth, this._canvasHeight, this._textureParameters || DEFAULT_TEXTURE_PARAMETERS);
      }

      this.onUpdate();
      this._canvas = this._canvas || document.createElement('canvas');

      this._loadIcons(icons);
    }
  }

  _loadIcons(icons) {
    const ctx = this._canvas.getContext('2d', {
      willReadFrequently: true
    });

    for (const icon of icons) {
      this._pendingCount++;
      load(icon.url, this._loadOptions).then(imageData => {
        const id = getIconId(icon);
        const iconDef = this._mapping[id];
        const {
          x,
          y,
          width: maxWidth,
          height: maxHeight
        } = iconDef;
        const {
          data,
          width,
          height
        } = resizeImage(ctx, imageData, maxWidth, maxHeight);

        this._texture.setSubImageData({
          data,
          x: x + (maxWidth - width) / 2,
          y: y + (maxHeight - height) / 2,
          width,
          height
        });

        iconDef.width = width;
        iconDef.height = height;

        this._texture.generateMipmap();

        this.onUpdate();
      }).catch(error => {
        this.onError({
          url: icon.url,
          source: icon.source,
          sourceIndex: icon.sourceIndex,
          loadOptions: this._loadOptions,
          error
        });
      }).finally(() => {
        this._pendingCount--;
      });
    }
  }

}
//# sourceMappingURL=icon-manager.js.map