// This forms one slot in the scan segment vector.

import {Point} from '../../math/geometry/point'

import {PointComparer} from './PointComparer'
import {ScanSegment} from './ScanSegment'

export class ScanSegmentVectorItem {
  // The head of the linked list.

  FirstSegment: ScanSegment

  // The current segment of the linked list, used when appending or intersecting.

  CurrentSegment: ScanSegment

  // Perpendicular coordinates that are not in a ScanSegment, due to either not having the ScanSegments created
  // yet or because it will be faster to do a single pass after accumulating them (e.g. for GroupBoundaryCrossings).

  private pendingPerpCoords: Array<number>

  AddPendingPerpendicularCoord(coord: number) {
    if (this.pendingPerpCoords == null) {
      this.pendingPerpCoords = new Array<number>()
    }

    this.pendingPerpCoords.push(coord)
  }

  // Restores state between intersection passes.

  ResetForIntersections() {
    /*Assert.assert(null !=  this.FirstSegment, 'Empty ScanSegmentVectorItem')*/
    this.CurrentSegment = this.FirstSegment
  }

  // Indicates whether ScanSegments in this item are horizontally or vertically oriented.

  get IsHorizontal(): boolean {
    return !this.FirstSegment.IsVertical
  }

  // Returns the constant coordinate of the ScanSegments in this item, i.e. the coordinate
  // that intersects the perpendicular axis.

  Coord: number

  // Ctor, taking the parallel (constant) coordinate.

  // the parallel (constant) coordinate
  constructor(coord: number) {
    this.Coord = coord
  }
  // Move along the linked list until we hit the ScanSegment that contains the point.

  TraverseToSegmentContainingPoint(point: Point): boolean {
    // This is not a simple Next() because scan segments are extended "through" obstacles
    // (intermixing overlapped and non-overlapped) and thus a ScanSegment's Start and End
    // may not be in the vertexPoints collection and the ScanSegment must be skipped.
    if (this.CurrentSegment.ContainsPoint(point)) {
      return true
    }

    const pointCoord = this.IsHorizontal ? point.y : point.x
    if (!PointComparer.Equal(this.Coord, pointCoord)) {
      /*Assert.assert(
        PointComparer.Compare(this.Coord, pointCoord) === -1,
        'point is before current Coord',
      )*/
      while (this.MoveNext()) {
        // Skip to the end of the linked list if this point is not on the same coordinate.
      }

      return false
    }

    for (;;) {
      // In the event of mismatched rounding on horizontal versus vertical intersections
      // with a sloped obstacle side, we may have a point that is just before or just
      // after the current segment.  If the point is in some space that doesn't have a
      // scansegment, and if we are "close enough" to one end or the other of a scansegment,
      // then grow the scansegment enough to include the new point.
      if (
        this.CurrentSegment.NextSegment == null ||
        PointComparer.GetDirections(this.CurrentSegment.End, point) ==
          PointComparer.GetDirections(point, this.CurrentSegment.NextSegment.Start)
      ) {
        if (Point.closeIntersections(this.CurrentSegment.End, point)) {
          this.CurrentSegment.Update(this.CurrentSegment.Start, point)
          return true
        }
      }

      if (!this.MoveNext()) {
        return false
      }

      if (this.CurrentSegment.ContainsPoint(point)) {
        return true
      }

      // This is likely the reverse of the above; the point rounding mismatched to just before
      // rather than just after the current segment.
      if (PointComparer.IsPureLower(point, this.CurrentSegment.Start)) {
        /*Assert.assert(
          Point.closeIntersections(this.CurrentSegment.Start, point),
          'Skipped over the point in the ScanSegment linked list',
        )*/
        this.CurrentSegment.Update(point, this.CurrentSegment.End)
        return true
      }
    }
  }

  MoveNext(): boolean {
    this.CurrentSegment = this.CurrentSegment.NextSegment
    return this.HasCurrent
  }

  get HasCurrent(): boolean {
    return null != this.CurrentSegment
  }

  // Returns true if the point is the end of the current segment and there is an adjoining NextSegment.

  PointIsCurrentEndAndNextStart(point: Point): boolean {
    return (
      point.equal(this.CurrentSegment.End) && null != this.CurrentSegment.NextSegment && point.equal(this.CurrentSegment.NextSegment.Start)
    )
  }

  // Set Current to the ScanSegment containing the perpendicular coordinate, then add that coordinate to its
  // sparse-vector coordinate list.

  AddPerpendicularCoord(perpCoord: number) {
    const point = this.IsHorizontal ? new Point(perpCoord, this.Coord) : new Point(this.Coord, perpCoord)
    this.TraverseToSegmentContainingPoint(point)
    this.CurrentSegment.AddSparseVertexCoord(perpCoord)
  }

  toString(): string {
    if (this.FirstSegment == null) {
      return '-0- ' + this.Coord
    }

    return this.IsHorizontal ? '(H) Y === ' + this.Coord : '(V) X === '
  }

  AppendScanSegment(segment: ScanSegment) {
    if (this.FirstSegment == null) {
      this.FirstSegment = segment
    } else {
      // Note: segment.Start may !== Current.End due to skipping internal ScanSegment creation for non-overlapped obstacles.
      this.CurrentSegment.NextSegment = segment
    }

    this.CurrentSegment = segment
  }

  AddPendingPerpendicularCoordsToScanSegments() {
    if (this.pendingPerpCoords != null) {
      this.ResetForIntersections()
      for (const point of this.pendingPerpCoords) {
        this.AddPerpendicularCoord(point)
      }
    }
  }
}
