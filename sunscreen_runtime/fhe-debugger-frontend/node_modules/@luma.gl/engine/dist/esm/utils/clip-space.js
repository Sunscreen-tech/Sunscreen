import Model from '../lib/model';
import Geometry from '../geometry/geometry';
const CLIPSPACE_VERTEX_SHADER = "attribute vec2 aClipSpacePosition;\nattribute vec2 aTexCoord;\nattribute vec2 aCoordinate;\n\nvarying vec2 position;\nvarying vec2 coordinate;\nvarying vec2 uv;\n\nvoid main(void) {\n  gl_Position = vec4(aClipSpacePosition, 0., 1.);\n  position = aClipSpacePosition;\n  coordinate = aCoordinate;\n  uv = aTexCoord;\n}\n";
const POSITIONS = [-1, -1, 1, -1, -1, 1, 1, 1];
export default class ClipSpace extends Model {
  constructor(gl, opts) {
    const TEX_COORDS = POSITIONS.map(coord => coord === -1 ? 0 : coord);
    super(gl, Object.assign({}, opts, {
      vs: CLIPSPACE_VERTEX_SHADER,
      geometry: new Geometry({
        drawMode: 5,
        vertexCount: 4,
        attributes: {
          aClipSpacePosition: {
            size: 2,
            value: new Float32Array(POSITIONS)
          },
          aTexCoord: {
            size: 2,
            value: new Float32Array(TEX_COORDS)
          },
          aCoordinate: {
            size: 2,
            value: new Float32Array(TEX_COORDS)
          }
        }
      })
    }));
    this.setVertexCount(4);
  }

}
//# sourceMappingURL=clip-space.js.map