import {GeomEdge, ICurve, Rectangle} from '..'
import {uniteSets} from '../utils/setOperations'

// this class contains a set of edge geometries, and set of node boundaries, ICurves, that might obstruct the edge routing
export class PreGraph {
  edges: Array<GeomEdge>

  nodeBoundaries: Set<ICurve>

  boundingBox: Rectangle

  static constructorStatic(egs: GeomEdge[], nodeBoundaries: Set<ICurve>) {
    const pg = new PreGraph()
    pg.edges = egs
    pg.nodeBoundaries = nodeBoundaries
    pg.boundingBox = Rectangle.mkEmpty()
    for (const curve of pg.nodeBoundaries) {
      pg.boundingBox = pg.boundingBox.addRec(curve.boundingBox)
    }
    return pg
  }

  AddGraph(a: PreGraph) {
    this.edges = this.edges.concat(a.edges)
    this.nodeBoundaries = uniteSets(this.nodeBoundaries, a.nodeBoundaries)
    this.boundingBox.addRec(a.boundingBox)
  }

  AddNodeBoundary(curve: ICurve) {
    this.nodeBoundaries.add(curve)
    this.boundingBox.addRec(curve.boundingBox)
  }
}
