//  Wrapper for GeomNode node to add force and velocity vectors

import {Point} from '../../math/geometry'
import {AlgorithmData} from '../../structs/algorithmData'
import {GeomNode} from '../core'

export function getFiNode(filNode: GeomNode): FiNode | null {
  const algData = AlgorithmData.getAlgData(filNode.node)
  if (algData == null) return null
  return <FiNode>algData.data
}

export class FiNode {
  desiredPosition: Point

  force = new Point(0, 0)

  index: number

  geomNode: GeomNode

  previousCenter: Point

  private center: Point

  //  local cache of node center (which in the MSAGL node has to be computed from the bounding box)

  get Center(): Point {
    return this.center
  }
  set Center(value: Point) {
    this.geomNode.center = value
    this.center = value
  }

  //  When mNode's bounds change we need to update our local
  //  previous and current center to MSAGL node center
  //  and update width and height

  ResetBounds() {
    this.previousCenter = this.geomNode.center
    this.center = this.geomNode.center
    this.Width = this.geomNode.width
    this.Height = this.geomNode.height
  }

  stayWeight = 1

  //  We also keep a local copy of Width and Height since it doesn't change and we don't want to keep going back to
  //  mNode.BoundingBox

  Width: number

  Height: number

  public constructor(index: number, mNode: GeomNode) {
    this.index = index
    this.geomNode = mNode
    this.ResetBounds()
  }

  //  Update the current X or Y coordinate of the node center from the result of a solve

  public ToString(): string {
    return 'FINode(' + (this.index + ('):' + this.geomNode))
  }
}
