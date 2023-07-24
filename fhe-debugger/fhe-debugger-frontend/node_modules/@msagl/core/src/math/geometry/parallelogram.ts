import {Point} from './point'
import {GeomConstants} from './geomConstants'

export enum VertexId {
  Corner,
  VertexA,
  otherCorner,
  VertexB,
}

type MinMax = {
  minx: number
  miny: number
  maxx: number
  maxy: number
}

export class Parallelogram {
  isSeg: boolean
  corner: Point
  a: Point //a side adjacent to the corner
  b: Point //another side exiting from the corner
  otherCorner: Point
  aPlusCorner: Point
  bPlusCorner: Point
  aRot: Point //a rotated on 90 degrees towards side1
  bRot: Point //b rotated on 90 degrees towards coeff
  abRot: number //a*bRot
  baRot: number //b*aRot;

  // Return true if the parallelogram contains the point
  contains(point: Point): boolean {
    const g = point.sub(this.corner)
    const e = GeomConstants.distanceEpsilon

    const gbRot = g.dot(this.bRot)
    if (gbRot > this.abRot + e || gbRot < -e) return false

    const gaRot = g.dot(this.aRot)
    return gaRot <= this.baRot + e && gaRot >= -e
  }

  get area(): number {
    return Math.abs(this.a.x * this.b.y - this.a.y * this.b.x)
  }

  vertex(vertexPar: VertexId): Point {
    switch (vertexPar) {
      case VertexId.Corner:
        return this.corner
      case VertexId.VertexA:
        return this.aPlusCorner
      case VertexId.otherCorner:
        return this.otherCorner
      case VertexId.VertexB:
        return this.bPlusCorner
      default:
        return undefined
    }
  }

  static parallelogramOfTwo(box0: Parallelogram, box1: Parallelogram): Parallelogram {
    const result = new Parallelogram()
    const v = box0.corner
    const mm = {
      minx: v.x,
      maxx: v.x,
      miny: v.y,
      maxy: v.y,
    }

    Parallelogram.pumpMinMax(mm, box0.aPlusCorner)
    Parallelogram.pumpMinMax(mm, box0.otherCorner)
    Parallelogram.pumpMinMax(mm, box0.bPlusCorner)

    Parallelogram.pumpMinMax(mm, box1.corner)
    Parallelogram.pumpMinMax(mm, box1.aPlusCorner)
    Parallelogram.pumpMinMax(mm, box1.otherCorner)
    Parallelogram.pumpMinMax(mm, box1.bPlusCorner)

    result.corner = new Point(mm.minx, mm.miny)
    result.a = new Point(0, mm.maxy - mm.miny)
    result.b = new Point(mm.maxx - mm.minx, 0)

    result.aPlusCorner = result.a.add(result.corner)
    result.otherCorner = result.b.add(result.aPlusCorner)
    result.bPlusCorner = result.b.add(result.corner)

    result.aRot = new Point(-result.a.y, result.a.x)
    if (result.aRot.length > 0.5) result.aRot = result.aRot.normalize()

    result.bRot = new Point(-result.b.y, result.b.x)
    if (result.bRot.length > 0.5) result.bRot = result.bRot.normalize()

    result.abRot = result.a.dot(result.bRot)
    result.baRot = result.b.dot(result.aRot)

    if (result.abRot < 0) {
      result.abRot = -result.abRot
      result.bRot = result.bRot.neg()
    }

    if (result.baRot < 0) {
      result.baRot = -result.baRot
      result.aRot = result.aRot.neg()
    }

    result.isSeg = result.a.sub(result.b).length < GeomConstants.distanceEpsilon
    return result
  }

  static pumpMinMax(mm: MinMax, p: Point): void {
    if (p.x < mm.minx) {
      mm.minx = p.x
    } else if (p.x > mm.maxx) {
      mm.maxx = p.x
    }
    if (p.y < mm.miny) {
      mm.miny = p.y
    } else if (p.y > mm.maxy) {
      mm.maxy = p.y
    }
  }

  // returns true if parallelograms intersect
  static intersect(parallelogram0: Parallelogram, parallelogram1: Parallelogram): boolean {
    // It can be shown that two parallelograms do not intersect if and only if
    // they are separated with one of the parallelogram sides

    const ret = !(
      Parallelogram.separByA(parallelogram0, parallelogram1) ||
      Parallelogram.separByA(parallelogram1, parallelogram0) ||
      Parallelogram.separByB(parallelogram0, parallelogram1) ||
      Parallelogram.separByB(parallelogram1, parallelogram0)
    )

    if (ret === false) return false

    if (!(parallelogram0.isSeg && parallelogram1.isSeg)) return true

    if (
      !Point.parallelWithinEpsilon(
        parallelogram0.otherCorner.sub(parallelogram0.corner),
        parallelogram1.otherCorner.sub(parallelogram1.corner),
        1.0e-5,
      )
    )
      return true

    //here we know that the segs are parallel
    return Parallelogram.ParallelSegsIntersect(parallelogram1, parallelogram0)
  }

  static ParallelSegsIntersect(p0: Parallelogram, p1: Parallelogram): boolean {
    const v0 = p0.corner
    const v1 = p0.otherCorner

    const v2 = p1.corner
    const v3 = p1.otherCorner

    const d = v1.sub(v0)

    //const us imagine that v0 is at zero
    const r0 = 0 // position of v0
    const r1 = d.dot(d) //offset of v1

    //offset of v2
    let r2 = v2.sub(v0).dot(d)

    //offset of v3
    let r3 = v3.sub(v0).dot(d)

    // we need to check if [r0,r1] intersects [r2,r3]

    if (r2 > r3) {
      const t = r2
      r2 = r3
      r3 = t
    }

    return !(r3 < r0 - GeomConstants.distanceEpsilon || r2 > r1 + GeomConstants.distanceEpsilon)
  }

  static separByB(p0: Parallelogram, p1: Parallelogram): boolean {
    const eps = GeomConstants.distanceEpsilon
    const p1a = p1.vertex(0).sub(p0.corner).dot(p0.bRot)
    const list = [VertexId.VertexA, VertexId.otherCorner, VertexId.VertexB]
    if (p1a > p0.abRot + eps) {
      for (const i of list) {
        if (p1.vertex(i).sub(p0.corner).dot(p0.bRot) <= p0.abRot + eps) return false
      }

      return true
    } else if (p1a < -eps) {
      for (const i of list) {
        if (p1.vertex(i).sub(p0.corner).dot(p0.bRot) >= -eps) return false
      }
      return true
    }
    return false
  }

  static separByA(p0: Parallelogram, p1: Parallelogram): boolean {
    const eps = GeomConstants.distanceEpsilon

    let t = p1.corner.sub(p0.corner)
    const p1a = Point.dot(t, p0.aRot)

    if (p1a > p0.baRot + eps) {
      t = p1.aPlusCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) <= p0.baRot + eps) return false

      t = p1.bPlusCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) <= p0.baRot + eps) return false

      t = p1.otherCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) <= p0.baRot + eps) return false

      return true
    } else if (p1a < -eps) {
      t = p1.aPlusCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) >= -eps) return false

      t = p1.bPlusCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) >= -eps) return false

      t = p1.otherCorner.sub(p0.corner)
      if (Point.dot(t, p0.aRot) >= -eps) return false

      return true
    }

    return false
  }

  static parallelogramByCornerSideSide(corner: Point, sideA: Point, sideB: Point): Parallelogram {
    const result = new Parallelogram()

    result.corner = corner
    result.a = sideA
    result.b = sideB

    result.aRot = new Point(-sideA.y, sideA.x)
    if (result.aRot.length > 0.5) result.aRot = result.aRot.normalize()

    result.bRot = new Point(-sideB.y, sideB.x)
    if (result.bRot.length > 0.5) result.bRot = result.bRot.normalize()

    result.abRot = result.bRot.dot(sideA)

    result.baRot = sideB.dot(result.aRot)

    if (result.abRot < 0) {
      result.abRot = -result.abRot
      result.bRot = result.bRot.neg()
    }

    if (result.baRot < 0) {
      result.baRot = -result.baRot
      result.aRot = result.aRot.neg()
    }

    result.isSeg = sideA.sub(sideB).length < GeomConstants.distanceEpsilon

    result.aPlusCorner = sideA.add(corner)
    result.otherCorner = sideB.add(result.aPlusCorner)
    result.bPlusCorner = sideB.add(corner)

    return result
  }

  static getParallelogramOfAGroup(boxes: Parallelogram[]) {
    let minx = 0,
      maxx = 0,
      miny = 0,
      maxy = 0
    let firstTime = true
    for (const b of boxes) {
      const verts = allVerticesOfParall(b)
      for (const v of verts) {
        const x = v.x
        const y = v.y
        if (firstTime) {
          firstTime = false
          minx = maxx = x
          miny = maxy = y
        } else {
          if (x < minx) {
            minx = x
          } else if (x > maxx) {
            maxx = x
          }
          if (y < miny) {
            miny = y
          } else if (y > maxy) {
            maxy = y
          }
        }
      }
    }

    return Parallelogram.parallelogramByCornerSideSide(new Point(minx, miny), new Point(0, maxy - miny), new Point(maxx - minx, 0))
  }
}

export function* allVerticesOfParall(p: Parallelogram) {
  yield p.corner
  yield p.aPlusCorner
  yield p.otherCorner
  yield p.bPlusCorner
}
