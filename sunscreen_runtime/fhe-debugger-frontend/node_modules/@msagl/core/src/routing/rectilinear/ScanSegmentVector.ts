// This forms the vector of ScanSegments for the sparse VisibilityGraph.

import {Point} from '../../math/geometry/point'

import {VisibilityGraph} from '../visibility/VisibilityGraph'
import {PointAndCrossingsList} from './PointAndCrossingsList'
import {ScanSegment} from './ScanSegment'
import {ScanSegmentVectorItem} from './ScanSegmentVectorItem'

export class ScanSegmentVector {
  private vector: ScanSegmentVectorItem[]

  constructor(coordMap: Set<number>, isHorizontal: boolean) {
    this.vector = []
    this.IsHorizontal = isHorizontal
    const coords = Array.from(coordMap).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
    for (const c of coords) {
      this.vector.push(new ScanSegmentVectorItem(c))
    }
  }

  // The index of the scan segment vector we're appending to on the ScanSegment-generation sweep.

  CurrentSlotIndex = 0

  get Length(): number {
    return this.vector.length
  }

  // The item at the index of the scan segment vector we're appending to on the ScanSegment-generation sweep.

  get CurrentSlot(): ScanSegmentVectorItem {
    return this.vector[this.CurrentSlotIndex]
  }

  // The indexed item in the vector.

  Item(slot: number): ScanSegmentVectorItem {
    return this.vector[slot]
  }

  // Appends a ScanSegment to the linked list in the "Current" slot.

  CreateScanSegment(start: Point, end: Point, weight: number, gbcList: PointAndCrossingsList) {
    this.CurrentSlot.AppendScanSegment(new ScanSegment(start, end, weight, gbcList))
  }

  ScanSegmentsCompleteForCurrentSlot() {
    this.CurrentSlotIndex++
  }

  ScanSegmentsComplete() {
    for (const item of this.vector) {
      item.AddPendingPerpendicularCoordsToScanSegments()
    }
  }

  // Returns an enumeration of the vector of ScanSegmentVectorItems.

  Items(): ScanSegmentVectorItem[] {
    return this.vector
  }

  // Reset vector state between passes.

  ResetForIntersections() {
    for (const t of this.vector) {
      t.ResetForIntersections()
    }
  }

  // Indicates if this contains horizontal or vertical ScanSegments.

  IsHorizontal: boolean

  // Search the vector for the nearest slot in the specified direction.

  FindNearest(coord: number, directionIfMiss: number): number {
    // Array.BinarySearch doesn't allow mapping from ScanSegmentVectorItem to its Coord.
    let low = 0
    let high: number = this.vector.length - 1
    if (coord <= this.vector[low].Coord) {
      return low
    }

    if (coord >= this.vector[high].Coord) {
      return high
    }

    while (high - low > 2) {
      const mid = low + ((high - low) >> 1)
      const item = this.vector[mid]
      if (coord < item.Coord) {
        high = mid
        continue
      }

      if (coord > item.Coord) {
        low = mid
        continue
      }

      // TODOsparse - profile - see if I really need the perpCoordMap
      /*Assert.assert(false, 'Should not be here if coord is in the vector')*/
      return mid
    }

    // We know the value is between low and high, non-inclusive.
    for (low++; low <= high; low++) {
      const item = this.vector[low]
      if (coord < item.Coord) {
        return directionIfMiss > 0 ? low : low - 1
      }

      if (coord === item.Coord) {
        break
      }
    }

    // TODOsparse - profile - see if I really need the perpCoordMap
    /*Assert.assert(false, 'Should not be here if coord is in the vector')*/
    return low
  }

  CreateSparseVerticesAndEdges(vg: VisibilityGraph) {
    for (const item of this.vector) {
      item.ResetForIntersections()
      for (let segment = item.FirstSegment; segment != null; segment = segment.NextSegment) {
        segment.CreateSparseVerticesAndEdges(vg)
      }
    }
  }

  // Get the coordinate that remains constant along a segment in this vector.
  GetParallelCoord(site: Point): number {
    return this.IsHorizontal ? site.y : site.x
  }

  // Get the coordinate that changes along a segment in this vector (and is thus the parallel
  // coord of an intersecting segment).
  GetPerpendicularCoord(site: Point): number {
    return this.IsHorizontal ? site.x : site.y
  }

  ConnectAdjoiningSegmentEndpoints() {
    // Make sure that any series of segments (of different overlappedness) that have points in the
    // graph are connected at adjoining starts/ends and ends/starts (these adjoining points may not be
    // Steiner points in the graph if they are on indirect segments.
    for (const item of this.vector) {
      item.ResetForIntersections()
      let prevSegment = item.FirstSegment
      for (let segment = prevSegment.NextSegment; segment != null; segment = segment.NextSegment) {
        if (segment.HasSparsePerpendicularCoords && prevSegment.HasSparsePerpendicularCoords) {
          if (segment.Start === prevSegment.End) {
            const perpCoord: number = this.GetPerpendicularCoord(segment.Start)
            prevSegment.AddSparseEndpoint(perpCoord)
            segment.AddSparseEndpoint(perpCoord)
          }
        }

        prevSegment = segment
      }
    }
  }

  toString(): string {
    return (this.IsHorizontal ? '(H) count' : '(V) count === ') + this.vector.length
  }
}
