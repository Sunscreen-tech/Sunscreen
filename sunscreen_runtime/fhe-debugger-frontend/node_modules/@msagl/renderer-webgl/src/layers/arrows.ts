import {load} from '@loaders.gl/core'
import {ImageLoader} from '@loaders.gl/images'
import {Texture2D} from '@luma.gl/webgl'

const iconAtlasRaw =
  `data:image/svg+xml;base64,` +
  `PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGJhc2VQcm9maWxlPSJ0aW55IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNjQgMzIiIG92ZXJmbG93PSJ2aXNpYmxlIiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPGc+IDxyZWN0IGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjE2Ii8+IDxwb2x5Z29uIHBvaW50cz0iMS42NSwxNC4zNSAwLjk0LDEzLjY1IDYuNTksOCAwLjk0LDIuMzUgMS42NSwxLjY1IDgsOCAJIi8+CjwvZz4KPGc+IDxyZWN0IHg9IjgiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPHBvbHlnb24gcG9pbnRzPSIxMi42NSw3LjM1IDExLjk0LDYuNjUgMTQuNTksNCAxMS45NCwxLjM1IDEyLjY1LDAuNjUgMTYsNCAJIi8+CjwvZz4KPGc+IDxyZWN0IHg9IjgiIHk9IjgiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPHBvbHlsaW5lIHBvaW50cz0iMTQuNTksMTIgMTEuOTQsOS4zNSAxMi42NSw4LjY1IDE2LDEyIAkiLz4KPC9nPgo8Zz4gPHJlY3QgeD0iMTYiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPHBvbHlsaW5lIHBvaW50cz0iMjAsMSAyNCw0IDIwLDcgCSIvPgo8L2c+CjxnPiA8cmVjdCB4PSI0OCIgZmlsbD0ibm9uZSIgd2lkdGg9IjgiIGhlaWdodD0iOCIvPiA8cGF0aCBkPSJNNTAsM2MwLjU1LDAsMSwwLjQ1LDEsMXMtMC40NSwxLTEsMXMtMS0wLjQ1LTEtMVM0OS40NSwzLDUwLDMgTTUwLDJjLTEuMSwwLTIsMC45LTIsMnMwLjksMiwyLDJzMi0wLjksMi0yUzUxLjEsMiw1MCwyIEw1MCwyeiIvPgo8L2c+CjxnPiA8cmVjdCB4PSI0OCIgeT0iOCIgZmlsbD0ibm9uZSIgd2lkdGg9IjgiIGhlaWdodD0iOCIvPiA8cGF0aCBkPSJNNTEsMTBjMS4xLDAsMiwwLjksMiwycy0wLjksMi0yLDJzLTItMC45LTItMlM0OS45LDEwLDUxLDEwIE01MSw5Yy0xLjY2LDAtMywxLjM0LTMsM3MxLjM0LDMsMywzczMtMS4zNCwzLTNTNTIuNjYsOSw1MSw5IEw1MSw5eiIvPgo8L2c+CjxnPiA8cmVjdCB4PSIzMiIgZmlsbD0ibm9uZSIgd2lkdGg9IjgiIGhlaWdodD0iMTYiLz4gPHBvbHlsaW5lIHBvaW50cz0iMzYsMyA0MCw4IDM2LDEzIAkiLz4KPC9nPgo8Zz4gPHJlY3QgeD0iMjQiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPHBvbHlsaW5lIHBvaW50cz0iMjYsMiAzMiw0IDI2LDYgCSIvPgo8L2c+CjxnPiA8cmVjdCB4PSIxNiIgeT0iOCIgZmlsbD0ibm9uZSIgd2lkdGg9IjgiIGhlaWdodD0iOCIvPiA8cG9seWxpbmUgcG9pbnRzPSIyMCw5IDI0LDEyIDIwLDEyIAkiLz4KPC9nPgo8Zz4gPHJlY3QgeD0iMjQiIHk9IjgiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPHBvbHlsaW5lIHBvaW50cz0iMjYsMTAgMzIsMTIgMjYsMTIgCSIvPgo8L2c+CjxnPiA8cmVjdCB4PSI1NiIgZmlsbD0ibm9uZSIgd2lkdGg9IjgiIGhlaWdodD0iOCIvPiA8Y2lyY2xlIGN4PSI1OCIgY3k9IjQiIHI9IjIiLz4KPC9nPgo8Zz4gPHJlY3QgeD0iNTYiIHk9IjgiIGZpbGw9Im5vbmUiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiLz4gPGNpcmNsZSBjeD0iNTkiIGN5PSIxMiIgcj0iMyIvPgo8L2c+Cjwvc3ZnPgo=`

const imageScale = 4

let iconAtlas: Promise<Texture2D> | Texture2D

export function getIconAtlas(gl: WebGLRenderingContext): Promise<Texture2D> | Texture2D {
  if (!iconAtlas) {
    iconAtlas =
      typeof Image !== 'undefined' &&
      load(iconAtlasRaw, ImageLoader, {
        imagebitmap: {
          resizeWidth: 256 * imageScale,
          resizeHeight: 128 * imageScale,
        },
      }).then((data) => {
        const texture = new Texture2D(gl, {
          data,
          parameters: {
            [gl.TEXTURE_MIN_FILTER]: gl.LINEAR_MIPMAP_LINEAR,
            [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
            [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
            [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
          },
        })
        iconAtlas = texture
        return texture
      })
  }

  return iconAtlas
}

export const iconMapping = scale(
  {
    caret: {
      mask: true,
      x: 32,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 32,
    },
    'half-caret': {
      mask: true,
      x: 32,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 32,
    },
    'caret-lg': {
      mask: true,
      x: 0,
      y: 0,
      width: 32,
      height: 64,
      anchorX: 32,
    },
    triangle: {
      mask: true,
      x: 64,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 32,
    },
    'triangle-ex': {
      mask: true,
      x: 64,
      y: 0,
      width: 32,
      height: 32,
    },
    'half-triangle': {
      mask: true,
      x: 64,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 32,
    },
    'half-triangle-ex': {
      mask: true,
      x: 64,
      y: 32,
      width: 32,
      height: 32,
    },
    'triangle-n': {
      mask: true,
      x: 104,
      y: 4,
      width: 24,
      height: 24,
      anchorX: 24,
    },
    'triangle-n-ex': {
      mask: true,
      x: 96,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 8,
    },
    'half-triangle-n': {
      mask: true,
      x: 96,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 32,
    },
    'half-triangle-n-ex': {
      mask: true,
      x: 96,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 8,
    },
    'triangle-w': {
      mask: true,
      x: 128,
      y: 0,
      width: 32,
      height: 64,
      anchorX: 32,
    },
    'triangle-w-ex': {
      mask: true,
      x: 128,
      y: 0,
      width: 32,
      height: 64,
    },
    'circle-ex': {
      mask: true,
      x: 192,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 0,
    },
    'circle-lg-ex': {
      mask: true,
      x: 192,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 0,
    },
    dot: {
      mask: true,
      x: 224,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 8,
    },
    'dot-ex': {
      mask: true,
      x: 224,
      y: 0,
      width: 32,
      height: 32,
      anchorX: 0,
    },
    'dot-lg': {
      mask: true,
      x: 224,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 12,
    },
    'dot-lg-ex': {
      mask: true,
      x: 224,
      y: 32,
      width: 32,
      height: 32,
      anchorX: 0,
    },
  },
  imageScale,
)

type IconMapping = {
  [key: string]: {
    mask: boolean
    x: number
    y: number
    width: number
    height: number
    anchorX?: number
    anchorY?: number
  }
}

function scale(mapping: IconMapping, s: number): IconMapping {
  for (const key in mapping) {
    const m = mapping[key]
    m.x *= s
    m.y *= s
    m.width *= s
    m.height *= s
    if (m.anchorX) m.anchorX *= s
    if (m.anchorY) m.anchorY *= s
  }
  return mapping
}
