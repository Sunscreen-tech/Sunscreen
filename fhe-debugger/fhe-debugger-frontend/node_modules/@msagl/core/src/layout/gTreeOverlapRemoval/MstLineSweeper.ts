import {Interval} from '../../math/geometry/Interval'
import {Point} from '../../math/geometry/point'
import {Size} from '../../math/geometry/rectangle'
import {RTree, mkRTree} from '../../math/geometry/RTree/rTree'
import {BinaryHeapPriorityQueue} from '../../structs/BinaryHeapPriorityQueue'

import {GTreeOverlapRemoval} from './gTreeOverlapRemoval'
import {MstEdge} from './MstOnDelaunayTriangulation'

export class MstLineSweeper {
  _proximityEdges: Array<MstEdge>
  _nodeSizes: Size[]
  _nodePositions: Point[]
  _forLayers: boolean
  _intervalTree: RTree<number, number>
  _q: BinaryHeapPriorityQueue
  _numberOfOverlaps = 0

  public constructor(proximityEdges: Array<MstEdge>, nodeSizes: Size[], nodePositions: Point[], forLayers: boolean) {
    this._proximityEdges = proximityEdges
    this._nodeSizes = nodeSizes
    this._nodePositions = nodePositions
    this._forLayers = forLayers
    /*Assert.assert(nodePositions.length === nodeSizes.length)*/
    this._q = new BinaryHeapPriorityQueue(nodeSizes.length * 2)
  }

  public Run(): number {
    this.InitQueue()
    this.FindOverlaps()
    return this._numberOfOverlaps
  }

  FindOverlaps() {
    while (this._q.Count > 0) {
      let i: number = this._q.Dequeue()
      if (i < this._nodePositions.length) {
        this.FindOverlapsWithInterval(i)
        this.AddIntervalToTree(i)
      } else {
        i -= this._nodePositions.length
        this.RemoveIntervalFromTree(i)
      }
    }
  }

  RemoveIntervalFromTree(i: number) {
    this._intervalTree.Remove(this.GetInterval(i), i)
  }

  AddIntervalToTree(i: number) {
    const interval: Interval = this.GetInterval(i)
    if (this._intervalTree == null) {
      this._intervalTree = mkRTree<number, number>([])
    }

    this._intervalTree.Add(interval, i)
  }

  FindOverlapsWithInterval(i: number) {
    if (this._intervalTree == null) {
      return
    }

    const interval = this.GetInterval(i)
    for (const j of this._intervalTree.GetAllIntersecting(interval)) {
      const edge = GTreeOverlapRemoval.GetIdealEdge(i, j, this._nodePositions[i], this._nodePositions[j], this._nodeSizes)
      if (edge.overlapFactor <= 1) {
        return
      }

      this._proximityEdges.push(edge)
      this._numberOfOverlaps++
    }
  }

  GetInterval(i: number): Interval {
    const w = this._nodeSizes[i].width / 2
    const nodeCenterX = this._nodePositions[i].x
    return new Interval(nodeCenterX - w, nodeCenterX + w)
  }

  InitQueue() {
    for (let i = 0; i < this._nodeSizes.length; i++) {
      const h = this._nodeSizes[i].height / 2
      const nodeCenterY = this._nodePositions[i].y
      this._q.Enqueue(i, nodeCenterY - h)
      // enqueue the bottom event
      this._q.Enqueue(this._nodeSizes.length + i, nodeCenterY + h)
      // enqueue the top event
    }
  }
}
