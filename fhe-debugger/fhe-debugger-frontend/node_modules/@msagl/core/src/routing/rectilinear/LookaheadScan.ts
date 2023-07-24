// For lookahead points, we record the point of the intersection on the reflecting side, then
// whenever we load a side, we check for active lookahead lines within this range.  Since we
// are just intersecting rays, we only care about the X (H scan) or Y (V scan) coordinate.

import {Point} from '../../math/geometry/point'
import {RBNode} from '../../math/RBTree/rbNode'
import {RBTree} from '../../math/RBTree/rbTree'

import {BasicReflectionEvent} from './basicReflectionEvent'
import {ScanDirection} from './ScanDirection'

export class LookaheadScan {
  eventTree: RBTree<BasicReflectionEvent>

  findFirstPred: (b: BasicReflectionEvent) => boolean

  scanDirection: ScanDirection

  staleSites: Array<BasicReflectionEvent> = new Array<BasicReflectionEvent>()

  findFirstPoint: Point

  constructor(scanDir: ScanDirection) {
    this.scanDirection = scanDir
    this.eventTree = new RBTree<BasicReflectionEvent>((a, b) => this.CompareBB(a, b))
    this.findFirstPred = (n) => this.CompareToFindFirstPoint(n.Site) >= 0
  }

  Add(initialSite: BasicReflectionEvent) {
    // Assert we can't find it - subsumption should have taken care of that.
    /*Assert.assert(
      this.Find(initialSite.Site) == null ,
      'Should not add the same Lookahead coordinate twice',
    )*/
    this.eventTree.insert(initialSite)
  }

  // Buffer up the events that are known to be stale - that is, will never queued as events because the
  // event-load intersection is the same as the site.
  MarkStaleSite(siteEvent: BasicReflectionEvent) {
    this.staleSites.push(siteEvent)
  }

  RemoveStaleSites() {
    const cSites = this.staleSites.length
    // for (;;) is faster than IEnumerator for Lists
    if (cSites > 0) {
      for (let ii = 0; ii < cSites; ii++) {
        this.RemoveExact(this.staleSites[ii])
      }

      this.staleSites = []
    }
  }
  RemoveSitesForFlatBottom(low: Point, high: Point) {
    for (let node: RBNode<BasicReflectionEvent> = this.FindFirstInRange(low, high); null != node; node = this.FindNextInRange(node, high)) {
      this.MarkStaleSite(node.item)
    }

    this.RemoveStaleSites()
  }

  Find(site: Point): RBNode<BasicReflectionEvent> {
    return this.FindFirstInRange(site, site)
  }

  RemoveExact(initialSite: BasicReflectionEvent): boolean {
    const node: RBNode<BasicReflectionEvent> = this.eventTree.find(initialSite)
    if (null != node) {
      if (node.item.Site === initialSite.Site) {
        this.eventTree.deleteNodeInternal(node)
        return true
      }
    }

    return false
  }

  FindFirstInRange(low: Point, high: Point): RBNode<BasicReflectionEvent> {
    // We only use FindFirstPoint in this routine, to find the first satisfying node,
    // so we don't care that we leave leftovers in it.
    this.findFirstPoint = low
    const nextNode: RBNode<BasicReflectionEvent> = this.eventTree.findFirst(this.findFirstPred)
    if (null != nextNode) {
      // It's >= low; is it <= high?
      if (this.Compare(nextNode.item.Site, high) <= 0) {
        return nextNode
      }
    }

    return null
  }

  CompareToFindFirstPoint(treeItem: Point): number {
    return this.Compare(treeItem, this.findFirstPoint)
  }

  FindNextInRange(prev: RBNode<BasicReflectionEvent>, high: Point): RBNode<BasicReflectionEvent> {
    const nextNode: RBNode<BasicReflectionEvent> = this.eventTree.next(prev)
    if (null != nextNode && this.Compare(nextNode.item.Site, high) <= 0) {
      return nextNode
    }

    return null
  }

  // For ordering Points in the lookahead list.  We just care about the coordinate that changes
  // parallel to the scanline, so for vertical sweep (sweeping up from bottom, scanning
  // horizontally) then order points by X only, else by Y only.

  public CompareBB(lhs: BasicReflectionEvent, rhs: BasicReflectionEvent): number {
    return this.scanDirection.CompareScanCoord(lhs.Site, rhs.Site)
  }

  Compare(lhs: Point, rhs: Point): number {
    return this.scanDirection.CompareScanCoord(lhs, rhs)
  }
}
