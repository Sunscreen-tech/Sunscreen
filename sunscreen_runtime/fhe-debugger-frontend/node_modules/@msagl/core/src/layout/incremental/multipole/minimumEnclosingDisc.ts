//  implementation of the "MoveToFront" method for computing the minimum enclosing disc of a collection of points.
//  Runs in time linear in the number of points.  After Welzl'1991.

import {LinkedList, LinkedListNode} from '@esfx/collections'
import {Point} from '../../../math/geometry'
import {Assert} from '../../../utils/assert'
import {Disc} from './disc'
class MinDisc {
  public disc: Disc

  public boundary: Array<number>

  public constructor(ps: Point[], b: Array<number>) {
    this.boundary = b
    Assert.assert(b.length <= 3)
    switch (b.length) {
      case 0:
        this.disc = null
        break
      case 1:
        this.disc = Disc.constructorP(ps[b[0]])
        break
      case 2:
        this.disc = Disc.constructorPP(ps[b[0]], ps[b[1]])
        break
      case 3:
        this.disc = Disc.constructorPPP(ps[b[0]], ps[b[1]], ps[b[2]])
        break
    }
  }

  public contains(p: Point): boolean {
    if (this.disc == null) {
      return false
    }

    return this.disc.Contains(p)
  }
}

export class MoveToFront {
  L: LinkedList<number>

  ps: Point[]

  //  minimum enclosing disc

  public disc: Disc

  //  list of 2 or 3 points lying on the boundary

  public boundary: Array<number>

  //  Constructs the minimum enclosing disc for the specified points

  public constructor(ps: Point[]) {
    this.ps = ps
    this.L = new LinkedList<number>()
    for (let i = 0; i < this.ps.length; i++) {
      this.L.push(i)
    }

    const md: MinDisc = this.mtf_md(null, new Array<number>())
    this.disc = md.disc
    this.boundary = md.boundary
  }
  collinear3(b: Array<number>): boolean {
    if (b.length == 3) {
      return Disc.Collinear(this.ps[b[0]], this.ps[b[1]], this.ps[b[2]])
    }

    return false
  }

  mtf_md(lPtr: LinkedListNode<number>, b: Array<number>): MinDisc {
    Assert.assert(b.length <= 3)
    let md: MinDisc = new MinDisc(this.ps, b)
    if (b.length == 3) {
      return md
    }

    let lnode: LinkedListNode<number> = this.L.first
    while (lnode != null && lnode != lPtr) {
      const lnext: LinkedListNode<number> = lnode.next
      const p: number = lnode.value
      if (!md.contains(this.ps[p])) {
        const _b: Array<number> = Array.from(b)
        _b.push(p)
        Assert.assert(!this.collinear3(_b), 'Collinear points on boundary of minimal enclosing disc')
        md = this.mtf_md(lnode, _b)
        this.L.deleteNode(lnode)
        this.L.insertNodeBefore(null, lnode)
      }

      lnode = lnext
    }

    return md
  }
}

/** static methods for obtaining a minimum enclosing disc of a collection of points */

export class MinimumEnclosingDisc {
  //  linear-time computation using the move-to-front heuristic by Welzl

  //  <returns>Smallest disc that encloses all the points</returns>
  public static LinearComputation(points: Point[]): Disc {
    const m: MoveToFront = new MoveToFront(points)
    return m.disc
  }

  //  Computing the minimum enclosing disc the slow stupid way.  Just for testing purposes.

  //  <returns>Smallest disc that encloses all the points</returns>
  public static SlowComputation(points: Point[]): Disc {
    const n: number = points.length
    let mc: Disc = null
    let b: number[] = null
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i != j) {
          const c: Disc = Disc.constructorPP(points[i], points[j])
          if (c.ContainsPN(points, [i, j])) {
            if (mc == null || mc.Radius > c.Radius) {
              mc = c
              b = [i, j]
            }
          }
        }

        for (let k = 0; k < n; k++) {
          if (k != i && k != j && !Disc.Collinear(points[i], points[j], points[k])) {
            const c3: Disc = Disc.constructorPPP(points[i], points[j], points[k])
            if (c3.ContainsPN(points, [i, j, k])) {
              if (mc == null || mc.Radius > c3.Radius) {
                mc = c3
                b = [i, j, k]
              }
            }
          }
        }
      }
    }

    Assert.assert(b != null)
    return mc
  }
}
