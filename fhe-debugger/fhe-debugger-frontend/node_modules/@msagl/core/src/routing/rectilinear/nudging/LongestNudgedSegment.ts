import {Point} from '../../../math/geometry/point'
import {CompassVector} from '../../../math/geometry/compassVector'
import {Direction} from '../../../math/geometry/direction'
import {SegmentBase} from '../../visibility/SegmentBase'
import {PathEdge} from './PathEdge'

// Represent a maximal straight segment of a path
export class LongestNudgedSegment extends SegmentBase {
  constructor(variable: number) {
    super()
    this.Id = variable
  }

  // has to be North or East

  CompassDirection: Direction = Direction.None

  // the segment can go only North or East independently of the edge directions
  edges: Array<PathEdge> = new Array<PathEdge>()

  start: Point

  end: Point

  get Start(): Point {
    return this.start
  }

  get End(): Point {
    return this.end
  }

  // the list of edges holding the same offset and direction

  get Edges(): Array<PathEdge> {
    return this.edges
  }

  AddEdge(edge: PathEdge) {
    if (this.Edges.length === 0) {
      let dir = CompassVector.VectorDirectionPP(edge.Source, edge.Target)
      switch (dir) {
        case Direction.South:
          dir = Direction.North
          break
        case Direction.West:
          dir = Direction.East
          break
      }

      this.CompassDirection = dir
      this.start = edge.Source
      this.end = edge.Source
      // does not matter; it will be fixed immediately
    }

    switch (this.CompassDirection) {
      case Direction.North:
        this.TryPointForStartAndEndNorth(edge.Source)
        this.TryPointForStartAndEndNorth(edge.Target)
        break
      case Direction.East:
        this.TryPointForStartAndEndEast(edge.Source)
        this.TryPointForStartAndEndEast(edge.Target)
        break
    }

    this.Edges.push(edge)
  }

  TryPointForStartAndEndNorth(p: Point) {
    if (p.y < this.start.y) {
      this.start = p
    } else if (p.y > this.end.y) {
      this.end = p
    }
  }

  TryPointForStartAndEndEast(p: Point) {
    if (p.x < this.start.x) {
      this.start = p
    } else if (p.x > this.end.x) {
      this.end = p
    }
  }

  _isFixed = false

  // the segments constraining "this" from the right

  get IsFixed(): boolean {
    return this._isFixed
  }
  set IsFixed(value: boolean) {
    this._isFixed = value
  }

  Id = -1

  // the maximal width of the edges

  public get Width(): number {
    let w = 0
    for (const e of this.edges) {
      w = Math.max(w, e.Width)
    }
    return w
  }

  GetLeftBound(): number {
    if (!this.IsFixed) {
      let lb = Number.NEGATIVE_INFINITY
      for (const edge of this.edges) {
        lb = Math.max(lb, edge.AxisEdge.LeftBound)
      }
      return lb
    }

    return this.CompassDirection === Direction.North ? this.Edges[0].Source.x : -this.Edges[0].Source.y
  }

  GetRightBound(): number {
    if (!this.IsFixed) {
      let rb = Number.POSITIVE_INFINITY
      for (const edge of this.edges) {
        rb = Math.min(rb, edge.AxisEdge.RightBound)
      }
      return rb
    }

    return this.Position()
  }

  Position(): number {
    return this.CompassDirection === Direction.North ? this.Edges[0].Source.x : -this.Edges[0].Source.y
  }

  IdealPosition = 0
}
