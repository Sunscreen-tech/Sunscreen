import {Direction} from '../../math/geometry/direction'
import {RBNode} from '../../math/RBTree/rbNode'
import {BasicObstacleSide} from './BasicObstacleSide'
import {StaticGraphUtility} from './StaticGraphUtility'

export class NeighborSides {
  // The HighObstacleSide of the low neighbor.

  LowNeighbor: RBNode<BasicObstacleSide>

  // Dereferences the node if non-null to return the side Item.

  get LowNeighborSide(): BasicObstacleSide {
    return this.LowNeighbor == null ? null : this.LowNeighbor.item
  }

  // A LowObstacleSide that we pass through in the low direction into open space.

  LowOverlapEnd: RBNode<BasicObstacleSide>

  // A group that we pass through toward the low neighbor.  Avoids reflections going through group boundaries.

  GroupSideInterveningBeforeLowNeighbor: BasicObstacleSide

  // The LowObstacleSide of the high neighbor.

  HighNeighbor: RBNode<BasicObstacleSide>

  // Dereferences the node if non-null to return the side Item.

  get HighNeighborSide(): BasicObstacleSide {
    return this.HighNeighbor == null ? null : this.HighNeighbor.item
  }

  // A HighObstacleSide that we pass through in the high direction into open space.

  HighOverlapEnd: RBNode<BasicObstacleSide>

  // A group that we pass through toward the high neighbor.  Avoids reflections going through group boundaries.

  GroupSideInterveningBeforeHighNeighbor: BasicObstacleSide

  Clear() {
    this.LowNeighbor = null
    this.LowOverlapEnd = null
    this.GroupSideInterveningBeforeLowNeighbor = null
    this.HighNeighbor = null
    this.HighOverlapEnd = null
    this.GroupSideInterveningBeforeHighNeighbor = null
  }

  SetSides(
    dir: Direction,
    neighborNode: RBNode<BasicObstacleSide>,
    overlapEndNode: RBNode<BasicObstacleSide>,
    interveningGroupSide: BasicObstacleSide,
  ) {
    if (StaticGraphUtility.IsAscending(dir)) {
      this.HighNeighbor = neighborNode
      this.HighOverlapEnd = overlapEndNode
      this.GroupSideInterveningBeforeHighNeighbor = interveningGroupSide
      return
    }

    this.LowNeighbor = neighborNode
    this.LowOverlapEnd = overlapEndNode
    this.GroupSideInterveningBeforeLowNeighbor = interveningGroupSide
  }
}
