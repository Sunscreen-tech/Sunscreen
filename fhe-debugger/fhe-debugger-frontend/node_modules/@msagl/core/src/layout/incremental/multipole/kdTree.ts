import {Queue} from 'queue-typescript'
import {Point} from '../../../math/geometry'
//import {Assert} from '../../../utils/assert'
import {Disc} from './disc'
import {MinimumEnclosingDisc} from './minimumEnclosingDisc'
import {MultipoleCoefficients} from './multipoleCoefficients'

enum Dim {
  Horizontal = 0,

  Vertical = 1,
}
abstract class KdNode {
  parent: InternalKdNode

  med: Disc

  multipoleCoefficients: MultipoleCoefficients

  intersects(v: KdNode): boolean {
    const d: Point = v.med.Center.sub(this.med.Center)
    const l: number = d.length
    return l < v.med.Radius + this.med.Radius
  }

  abstract computeMultipoleCoefficients(precision: number): void
}

class InternalKdNode extends KdNode {
  leftChild: KdNode

  rightChild: KdNode

  constructor(med: Disc, left: KdNode, right: KdNode) {
    super()
    this.med = med
    this.parent = left.parent
    if (this.parent != null) {
      if (this.parent.leftChild == left) {
        this.parent.leftChild = this
      } else {
        //Assert.assert(this.parent.rightChild == left)
        this.parent.rightChild = this
      }
    }

    this.leftChild = left
    this.rightChild = right
    left.parent = this
    right.parent = this
  }

  computeMultipoleCoefficients(precision: number) {
    this.leftChild.computeMultipoleCoefficients(precision)
    this.rightChild.computeMultipoleCoefficients(precision)
    this.multipoleCoefficients = MultipoleCoefficients.constructorPMM(
      this.med.Center,
      this.leftChild.multipoleCoefficients,
      this.rightChild.multipoleCoefficients,
    )
  }
}

class LeafKdNode extends KdNode {
  particles: Array<Array<Particle>>

  ps: Point[]

  constructor(particles: Array<Array<Particle>>) {
    super()
    //Assert.assert(particles[0].length == particles[1].length)
    this.particles = particles
    this.ComputeMinimumEnclosingDisc()
  }

  computeMultipoleCoefficients(precision: number) {
    this.multipoleCoefficients = MultipoleCoefficients.constructorNPA(precision, this.med.Center, this.ps)
  }

  ComputeMinimumEnclosingDisc(): Disc {
    const n: number = this.Size()
    this.ps = new Array(n)
    for (let i = 0; i < n; i++) {
      this.ps[i] = this.particles[0][i].point
    }

    return (this.med = MinimumEnclosingDisc.LinearComputation(this.ps))
  }

  private Min(d: Dim): number {
    return this.particles[<number>d][0].pos(d)
  }

  Size(): number {
    return this.particles[0].length
  }

  private Max(d: Dim): number {
    return this.particles[<number>d][this.Size() - 1].pos(d)
  }

  private Dimension(d: Dim): number {
    return this.Max(d) - this.Min(d)
  }

  Split(t: {rightSibling: LeafKdNode}): InternalKdNode {
    const splitDirection: Dim = this.Dimension(Dim.Horizontal) > this.Dimension(Dim.Vertical) ? Dim.Horizontal : Dim.Vertical
    const nonSplitDirection: Dim = splitDirection == Dim.Horizontal ? Dim.Vertical : Dim.Horizontal
    const n = this.Size()
    const nLeft = n >> 1
    const nRight = n - nLeft

    const leftParticles: Array<Array<Particle>> = [new Array<Particle>(nLeft), new Array<Particle>(nLeft)]
    const rightParticles: Array<Array<Particle>> = [new Array<Particle>(nRight), new Array<Particle>(nRight)]
    let rCtr = 0
    let lCtr = 0
    for (let i = 0; i < n; i++) {
      const p: Particle = this.particles[<number>splitDirection][i]
      if (i < nLeft) {
        leftParticles[<number>splitDirection][i] = p
        p.splitLeft = true
      } else {
        rightParticles[<number>splitDirection][i - nLeft] = p
        p.splitLeft = false
      }
    }

    for (let i = 0; i < n; i++) {
      const p: Particle = this.particles[<number>nonSplitDirection][i]
      if (p.splitLeft) {
        leftParticles[<number>nonSplitDirection][lCtr++] = p
      } else {
        rightParticles[<number>nonSplitDirection][rCtr++] = p
      }
    }

    // Assert.assert(lCtr == nLeft)
    // Assert.assert(rCtr == nRight)
    const parentMED: Disc = this.med
    this.particles = leftParticles
    this.ComputeMinimumEnclosingDisc()
    t.rightSibling = new LeafKdNode(rightParticles)
    return new InternalKdNode(parentMED, this, t.rightSibling)
  }

  ComputeForces() {
    for (const u of this.particles[0]) {
      for (const v of this.particles[0]) {
        if (u != v) {
          u.force = u.force.add(MultipoleCoefficients.Force(u.point, v.point))
        }
      }
    }
  }
}

export class Particle {
  force: Point

  point: Point

  splitLeft: boolean

  pos(d: Dim): number {
    return d == Dim.Horizontal ? this.point.x : this.point.y
  }

  //  Create particle at point

  public constructor(point: Point) {
    this.point = point
    this.force = new Point(0, 0)
  }
}

//  A KDTree recursively divides particles of a 2D space into a balanced tree structure by doing horizontal splits for wide bounding boxes and vertical splits for tall bounding boxes.

export class KDTree {
  particles: Particle[]

  root: InternalKdNode

  leaves: Array<LeafKdNode>

  private particlesBy(d: Dim): Particle[] {
    return this.particles.map((t) => t).sort((a, b) => a.pos(d) - b.pos(d))
  }

  //  Create a KDTree over the specified particles, with the leaf partitions each containing bucketSize particles.

  public constructor(particles: Particle[], bucketSize: number) {
    this.particles = particles
    const ps = new Array<Array<Particle>>()
    ps.push(this.particlesBy(Dim.Horizontal))
    ps.push(this.particlesBy(Dim.Vertical))
    this.leaves = new Array<LeafKdNode>()
    let l: LeafKdNode = new LeafKdNode(ps)
    this.leaves.push(l)
    const t: {rightSibling: LeafKdNode} = {rightSibling: null}
    this.root = l.Split(t)
    this.leaves.push(t.rightSibling)
    const splitQueue = new SplitQueue(bucketSize)
    splitQueue.EnqueueLL(l, t.rightSibling)
    while (splitQueue.length > 0) {
      l = splitQueue.dequeue()
      l.Split(t)
      this.leaves.push(t.rightSibling)
      splitQueue.EnqueueLL(l, t.rightSibling)
    }
  }

  //  Compute forces between particles using multipole approximations.

  public ComputeForces(precision: number) {
    this.root.computeMultipoleCoefficients(precision)
    for (const l of this.leaves) {
      l.ComputeForces()
      const stack: Array<KdNode> = new Array<KdNode>()
      stack.push(this.root)
      while (stack.length > 0) {
        const v: KdNode = stack.pop()
        if (!l.intersects(v)) {
          for (const p of l.particles[0]) {
            p.force = p.force.sub(v.multipoleCoefficients.ApproximateForce(p.point))
          }
        } else {
          if (v instanceof LeafKdNode) {
            for (const p of l.particles[0]) {
              for (const q of v.particles[0]) {
                if (p != q) {
                  p.force = p.force.add(MultipoleCoefficients.Force(p.point, q.point))
                }
              }
            }
          } else {
            const n = <InternalKdNode>v
            stack.push(n.leftChild)
            stack.push(n.rightChild)
          }
        }
      }
    }
  }

  //  Particles used of KDTree multipole force approximations
}
class SplitQueue extends Queue<LeafKdNode> {
  B: number

  public constructor(B: number) {
    super()
    this.B = B
  }

  public EnqueueLL(l: LeafKdNode, r: LeafKdNode) {
    if (l.Size() > this.B) {
      this.enqueue(l)
    }

    if (r.Size() > this.B) {
      this.enqueue(r)
    }
  }
}
