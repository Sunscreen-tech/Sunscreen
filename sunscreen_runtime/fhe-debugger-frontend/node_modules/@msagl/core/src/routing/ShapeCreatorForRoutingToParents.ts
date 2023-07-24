// written in assumption of a single parent
import {GeomEdge} from '../layout/core/geomEdge'
import {GeomGraph} from '../layout/core/geomGraph'
import {GeomNode} from '../layout/core/geomNode'
import {GeomObject} from '../layout/core/geomObject'
import {RelativeShape} from './RelativeShape'
import {Shape} from './shape'

export class ShapeCreatorForRoutingToParents {
  static GetShapes(inParentEdges: Array<GeomEdge>, outParentEdges: Array<GeomEdge>): Array<Shape> {
    const nodesToShapes = new Map<GeomNode, Shape>()
    for (const edge of inParentEdges) {
      ShapeCreatorForRoutingToParents.ProcessAncestorDescendantCouple(<GeomGraph>edge.target, edge.source, nodesToShapes)
      ShapeCreatorForRoutingToParents.InsertEdgePortsToShapes(nodesToShapes, edge)
    }

    for (const edge of outParentEdges) {
      ShapeCreatorForRoutingToParents.ProcessAncestorDescendantCouple(<GeomGraph>edge.source, edge.target, nodesToShapes)
      ShapeCreatorForRoutingToParents.InsertEdgePortsToShapes(nodesToShapes, edge)
    }

    ShapeCreatorForRoutingToParents.BindShapes(nodesToShapes)
    return Array.from(nodesToShapes.values())
  }
  private static InsertEdgePortsToShapes(nodesToShapes: Map<GeomNode, Shape>, edge: GeomEdge) {
    nodesToShapes.get(edge.target).Ports.add(edge.targetPort)
    nodesToShapes.get(edge.source).Ports.add(edge.sourcePort)
  }

  static BindShapes(nodesToShapes: Map<GeomNode, Shape>) {
    for (const [key, shape] of nodesToShapes) {
      if (!(key instanceof GeomGraph)) {
        continue
      }

      const cluster = <GeomGraph>key

      for (const child of Children(cluster)) {
        const childShape = nodesToShapes.get(child)
        if (childShape) {
          shape.AddChild(childShape)
        }
      }
    }
  }

  static ProcessAncestorDescendantCouple(ancestor: GeomGraph, geomNode: GeomNode, nodesToShapes: Map<GeomNode, Shape>) {
    let parent = Parent(geomNode)
    do {
      for (const n of Children(parent)) ShapeCreatorForRoutingToParents.CreateShapeIfNeeeded(n, nodesToShapes)
      if (parent === ancestor) break
      parent = Parent(parent)
    } while (true)
    ShapeCreatorForRoutingToParents.CreateShapeIfNeeeded(parent, nodesToShapes)
  }

  static CreateShapeIfNeeeded(n: GeomNode, nodesToShapes: Map<GeomNode, Shape>) {
    if (nodesToShapes.has(n)) {
      return
    }

    nodesToShapes.set(n, new RelativeShape(n))
  }

  static NumberOfActiveNodesIsUnderThreshold(inParentEdges: Array<GeomEdge>, outParentEdges: Array<GeomEdge>, threshold: number): boolean {
    const usedNodeSet = new Set<GeomNode>()
    for (const edge of inParentEdges) {
      if (
        ShapeCreatorForRoutingToParents.SetOfActiveNodesIsLargerThanThreshold(<GeomGraph>edge.target, edge.source, usedNodeSet, threshold)
      ) {
        return false
      }
    }

    for (const edge of outParentEdges) {
      if (
        ShapeCreatorForRoutingToParents.SetOfActiveNodesIsLargerThanThreshold(<GeomGraph>edge.source, edge.target, usedNodeSet, threshold)
      ) {
        return false
      }
    }
    return true
  }

  private static SetOfActiveNodesIsLargerThanThreshold(
    ancestor: GeomGraph,
    node: GeomNode,
    usedNodeSet: Set<GeomNode>,
    threshold: number,
  ): boolean {
    let parent: GeomGraph = Parent(node)
    while (true) {
      for (const n of Children(parent)) {
        usedNodeSet.add(n)
        if (usedNodeSet.size > threshold) {
          return true
        }
      }

      if (parent === ancestor) {
        break
      }

      parent = Parent(parent)
    }

    usedNodeSet.add(parent)

    return usedNodeSet.size > threshold
  }
}

function Parent(geomNode: GeomNode): GeomGraph {
  const p = geomNode.node.parent
  return <GeomGraph>GeomObject.getGeom(p)
}

function* Children(gg: GeomGraph): IterableIterator<GeomNode> {
  for (const n of gg.graph.shallowNodes) {
    yield <GeomNode>GeomObject.getGeom(n)
  }
}
