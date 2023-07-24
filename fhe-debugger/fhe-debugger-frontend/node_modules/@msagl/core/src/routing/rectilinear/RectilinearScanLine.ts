import {Direction} from '../../math/geometry/direction'
import {Point} from '../../math/geometry/point'
import {RBNode} from '../../math/RBTree/rbNode'
import {RBTree} from '../../math/RBTree/rbTree'

import {compareBooleans, compareNumbers} from '../../utils/compare'
import {BasicObstacleSide, LowObstacleSide} from './BasicObstacleSide'
import {ScanDirection} from './ScanDirection'
import {StaticGraphUtility} from './StaticGraphUtility'
import {VisibilityGraphGenerator} from './VisibilityGraphGenerator'

export class RectilinearScanLine {
  scanDirection: ScanDirection

  // This is the data structure that allows fast insert/remove of obstacle edges as well as
  // scanning for next/prev edges along the direction of the scan line.
  SideTree: RBTree<BasicObstacleSide>

  // Because sides may overlap and thus their relative positions change, retain the current
  // position, which is set on insertions by parameter, and by Overlap events via SetLinePosition.
  private linePositionAtLastInsertOrRemove: Point

  constructor(scanDir: ScanDirection, start: Point) {
    this.scanDirection = scanDir
    this.SideTree = new RBTree<BasicObstacleSide>((a, b) => this.Compare(a, b))
    this.linePositionAtLastInsertOrRemove = start
  }
  Insert(side: BasicObstacleSide, scanPos: Point): RBNode<BasicObstacleSide> {
    //        DevTraceInfo(1, "prev LinePos = {0}, new LinePos = {1}, inserting side = {2}", this.linePositionAtLastInsertOrRemove, scanPos, side.ToString());
    // Assert(!scanDirection.IsFlat(side), "Flat sides are not allowed in the scanline");
    // Assert(null == Find(side), "side already exists in the ScanLine");
    this.linePositionAtLastInsertOrRemove = scanPos
    // RBTree's internal operations on insert/remove etc. mean the node can't cache the
    // RBNode returned by insert(); instead we must do find() on each call.  But we can
    // use the returned node to get predecessor/successor.
    const node = this.SideTree.insert(side)
    // DevTraceDump(2);
    return node
  }

  get Count(): number {
    return this.SideTree.count
  }

  Remove(side: BasicObstacleSide, scanPos: Point) {
    /*Assert.assert(
      null !=  this.Find(side),
      'side does not exist in the ScanLine',
    )*/
    this.linePositionAtLastInsertOrRemove = scanPos
    this.SideTree.remove(side)
  }

  Find(side: BasicObstacleSide): RBNode<BasicObstacleSide> {
    // Sides that start after the current position cannot be in the scanline.
    if (-1 === this.scanDirection.ComparePerpCoord(this.linePositionAtLastInsertOrRemove, side.Start)) {
      return null
    }

    return this.SideTree.find(side)
  }

  NextLowB(side: BasicObstacleSide): RBNode<BasicObstacleSide> {
    return this.NextLowR(this.Find(side))
  }

  NextLowR(sideNode: RBNode<BasicObstacleSide>): RBNode<BasicObstacleSide> {
    const pred = this.SideTree.previous(sideNode)
    return pred
  }

  NextHighB(side: BasicObstacleSide): RBNode<BasicObstacleSide> {
    return this.NextHighR(this.Find(side))
  }

  NextHighR(sideNode: RBNode<BasicObstacleSide>): RBNode<BasicObstacleSide> {
    const succ = this.SideTree.next(sideNode)
    return succ
  }

  Next(dir: Direction, sideNode: RBNode<BasicObstacleSide>): RBNode<BasicObstacleSide> {
    const succ = StaticGraphUtility.IsAscending(dir) ? this.SideTree.next(sideNode) : this.SideTree.previous(sideNode)
    return succ
  }

  Lowest(): RBNode<BasicObstacleSide> {
    return this.SideTree.treeMinimum()
  }
  // For ordering lines along the scanline at segment starts/ends.

  public Compare(first: BasicObstacleSide, second: BasicObstacleSide): number {
    // If these are two sides of the same obstacle then the ordering is obvious.
    if (first.Obstacle === second.Obstacle) {
      if (first === second) {
        return 0
      }

      return first instanceof LowObstacleSide ? -1 : 1
    }

    // RectilinearScanLine.Debug_VerifySidesDoNotIntersect(first, second)
    // Other than intersecting sides at vertices of the same obstacle, there should be no interior intersections...
    const firstIntersect: Point = VisibilityGraphGenerator.ScanLineIntersectSidePBS(
      this.linePositionAtLastInsertOrRemove,
      first,
      this.scanDirection,
    )
    const secondIntersect: Point = VisibilityGraphGenerator.ScanLineIntersectSidePBS(
      this.linePositionAtLastInsertOrRemove,
      second,
      this.scanDirection,
    )
    let cmp = firstIntersect.compareTo(secondIntersect)
    // ... but we may still have rectangular sides that coincide, or angled sides that are close enough here but
    // are not detected by the convex-hull overlap calculations.  In those cases, we refine the comparison by side
    // type, with High coming before Low, and then by obstacle ordinal if needed. Because there are no interior
    // intersections, this ordering will remain valid as long as the side(s) are in the scanline.
    if (0 === cmp) {
      const firstIsLow: boolean = first instanceof LowObstacleSide
      const secondIsLow: boolean = second instanceof LowObstacleSide
      cmp = compareBooleans(firstIsLow, secondIsLow)
      if (0 === cmp) {
        cmp = compareNumbers(first.Obstacle.Ordinal, second.Obstacle.Ordinal)
      }
    }

    return cmp
  }

  // static Debug_VerifySidesDoNotIntersect(
  //  side1: BasicObstacleSide,
  //  side2: BasicObstacleSide,
  // ) {
  //  let intersect: Point
  //  if (
  //    !Point.lineLineIntersection(
  //      side1.Start,
  //      side1.End,
  //      side2.Start,
  //      side2.End,
  //      /* out */ intersect,
  //    )
  //  ) {
  //    return
  //  }

  //  //  The test for being within the interval is just multiplying to ensure that both subtractions
  //  //  return same-signed results (including endpoints).
  //  const isInterior =
  //    side1.Start.sub(intersect).dot(intersect.sub(side1.End)) >=
  //      -GeomConstants.distanceEpsilon &&
  //    side2.Start.sub(intersect).dot(intersect.sub(side2.End)) >=
  //      -GeomConstants.distanceEpsilon
  //  Assert.assert(
  //    !isInterior,
  //    "Shouldn't have interior intersections except sides of the same obstacle",
  //  )
  // }
  // toString(): string {
  //  return this.linePositionAtLastInsertOrRemove + (' ' + this.scanDirection)
  // }

  /*
        Test_GetScanLineDebugCurves(): Array<DebugCurve> {
            // ReSharper restore InconsistentNaming
            //          var debugCurves = new Array<DebugCurve>();
            // Alternate the colors between green and blue, so that any inconsistency will stand out.
            // Use red to highlight that.
            let colors: string[] = [
                    "green",
                    "blue"];
            let index: number = 0;
            let bbox = Rectangle.mkEmpty();
            let prevSide: BasicObstacleSide = null;
            for (let currentSide of this.SideTree) {
                let color: string = colors[index];
                let =: index;
                1;
                if ((prevSide == null )) {
                    // Create this the first time through; adding to an empty rectangle leaves 0,0.
                    bbox = new Rectangle(currentSide.Start, currentSide.End);
                }
                else {
                    if ((-1 !== this.Compare(prevSide, currentSide))) {
                        // Note: we toggled the index, so the red replaces the colour whose turn it is now
                        // and will leave the red line bracketed by two sides of the same colour.
                        color = "red";
                    }
                    
                    bbox.add(currentSide.Start);
                    bbox.add(currentSide.End);
                }
                
                debugCurves.Add(new DebugCurve(0.1, color, new LineSegment(currentSide.Start, currentSide.End)));
                prevSide = currentSide;
            }
            
            // Add the sweep line.
            let start: Point = StaticGraphUtility.RectangleBorderIntersect(bbox, this.linePositionAtLastInsertOrRemove, this.scanDirection.OppositeDirection);
            let end: Point = StaticGraphUtility.RectangleBorderIntersect(bbox, this.linePositionAtLastInsertOrRemove, this.scanDirection.Direction);
            debugCurves.Add(new DebugCurve(0.025, "black", new LineSegment(start, end)));
            return debugCurves;
        }*/
}
