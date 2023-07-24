import { log } from '@deck.gl/core';
import { Geometry, uid } from '@luma.gl/core';
import { modifyPolygonWindingDirection, WINDING } from '@math.gl/polygon';
export default class ColumnGeometry extends Geometry {
  constructor(props) {
    const {
      id = uid('column-geometry')
    } = props;
    const {
      indices,
      attributes
    } = tesselateColumn(props);
    super({ ...props,
      id,
      indices,
      attributes
    });
  }

}

function tesselateColumn(props) {
  const {
    radius,
    height = 1,
    nradial = 10
  } = props;
  let {
    vertices
  } = props;

  if (vertices) {
    log.assert(vertices.length >= nradial);
    vertices = vertices.flatMap(v => [v[0], v[1]]);
    modifyPolygonWindingDirection(vertices, WINDING.COUNTER_CLOCKWISE);
  }

  const isExtruded = height > 0;
  const vertsAroundEdge = nradial + 1;
  const numVertices = isExtruded ? vertsAroundEdge * 3 + 1 : nradial;
  const stepAngle = Math.PI * 2 / nradial;
  const indices = new Uint16Array(isExtruded ? nradial * 3 * 2 : 0);
  const positions = new Float32Array(numVertices * 3);
  const normals = new Float32Array(numVertices * 3);
  let i = 0;

  if (isExtruded) {
    for (let j = 0; j < vertsAroundEdge; j++) {
      const a = j * stepAngle;
      const vertexIndex = j % nradial;
      const sin = Math.sin(a);
      const cos = Math.cos(a);

      for (let k = 0; k < 2; k++) {
        positions[i + 0] = vertices ? vertices[vertexIndex * 2] : cos * radius;
        positions[i + 1] = vertices ? vertices[vertexIndex * 2 + 1] : sin * radius;
        positions[i + 2] = (1 / 2 - k) * height;
        normals[i + 0] = vertices ? vertices[vertexIndex * 2] : cos;
        normals[i + 1] = vertices ? vertices[vertexIndex * 2 + 1] : sin;
        i += 3;
      }
    }

    positions[i + 0] = positions[i - 3];
    positions[i + 1] = positions[i - 2];
    positions[i + 2] = positions[i - 1];
    i += 3;
  }

  for (let j = isExtruded ? 0 : 1; j < vertsAroundEdge; j++) {
    const v = Math.floor(j / 2) * Math.sign(0.5 - j % 2);
    const a = v * stepAngle;
    const vertexIndex = (v + nradial) % nradial;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    positions[i + 0] = vertices ? vertices[vertexIndex * 2] : cos * radius;
    positions[i + 1] = vertices ? vertices[vertexIndex * 2 + 1] : sin * radius;
    positions[i + 2] = height / 2;
    normals[i + 2] = 1;
    i += 3;
  }

  if (isExtruded) {
    let index = 0;

    for (let j = 0; j < nradial; j++) {
      indices[index++] = j * 2 + 0;
      indices[index++] = j * 2 + 2;
      indices[index++] = j * 2 + 0;
      indices[index++] = j * 2 + 1;
      indices[index++] = j * 2 + 1;
      indices[index++] = j * 2 + 3;
    }
  }

  return {
    indices,
    attributes: {
      POSITION: {
        size: 3,
        value: positions
      },
      NORMAL: {
        size: 3,
        value: normals
      }
    }
  };
}
//# sourceMappingURL=column-geometry.js.map