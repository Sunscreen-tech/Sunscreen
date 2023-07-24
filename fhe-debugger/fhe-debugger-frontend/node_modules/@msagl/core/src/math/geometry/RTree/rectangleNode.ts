import {Stack} from 'stack-typescript'

import {IRectangle} from '../IRectangle'
import {HitTestBehavior} from './hitTestBehavior'

function DivideNodes<T, P>(
  nodes: RectangleNode<T, P>[],
  seed0: number,
  seed1: number,
  gr0: RectangleNode<T, P>[],
  gr1: RectangleNode<T, P>[],
  t: {box0: IRectangle<P>; box1: IRectangle<P>},
) {
  const groupSplitThreshold = 2
  for (let i = 0; i < nodes.length; i++) {
    if (i === seed0 || i === seed1) continue

    // ReSharper disable InconsistentNaming
    const box0_ = t.box0.add_rect(nodes[i].irect)
    const delta0 = box0_.area - t.box0.area

    const box1_ = t.box1.add_rect(nodes[i].irect)
    const delta1 = box1_.area - t.box1.area
    // ReSharper restore InconsistentNaming

    //keep the tree roughly balanced

    if (gr0.length * groupSplitThreshold < gr1.length) {
      gr0.push(nodes[i])
      t.box0 = box0_
    } else if (gr1.length * groupSplitThreshold < gr0.length) {
      gr1.push(nodes[i])
      t.box1 = box1_
    } else if (delta0 < delta1) {
      gr0.push(nodes[i])
      t.box0 = box0_
    } else if (delta1 < delta0) {
      gr1.push(nodes[i])
      t.box1 = box1_
    } else if (t.box0.area < t.box1.area) {
      gr0.push(nodes[i])
      t.box0 = box0_
    } else {
      gr1.push(nodes[i])
      t.box1 = box1_
    }
  }
}
/**  calculates an RTree with the leaves in the given nodes */
export function CreateRectNodeOnArrayOfRectNodes<T, P>(nodes: RectangleNode<T, P>[]): RectangleNode<T, P> {
  if (nodes.length === 0) return null

  if (nodes.length === 1) return nodes[0]

  //Finding the seeds
  const t = {b0: nodes[0].irect, seed0: 1}
  const seed1 = ChooseSeeds(nodes, t)

  //We have two seeds at hand. Build two groups.
  const gr0 = []
  const gr1 = []

  gr0.push(nodes[t.seed0])
  gr1.push(nodes[seed1])

  //divide nodes on two groups
  const p = {box0: nodes[t.seed0].irect, box1: nodes[seed1].irect}
  DivideNodes(nodes, t.seed0, seed1, gr0, gr1, p)
  const ret = mkRectangleNodeWithCount<T, P>(nodes.length)
  ret.irect = p.box0.add_rect(p.box1)
  ret.Left = CreateRectNodeOnArrayOfRectNodes(gr0)
  ret.Right = CreateRectNodeOnArrayOfRectNodes(gr1)
  return ret
}

function areaoftwo<P>(a: IRectangle<P>, b: IRectangle<P>) {
  return a.add_rect(b).area
}

function ChooseSeeds<T, P>(nodes: RectangleNode<T, P>[], t: {b0: IRectangle<P>; seed0: number}): number {
  let area = areaoftwo(t.b0, nodes[t.seed0].irect)
  for (let i = 2; i < nodes.length; i++) {
    const area0 = areaoftwo<P>(t.b0, nodes[i].irect)
    if (area0 > area) {
      t.seed0 = i
      area = area0
    }
  }

  //Got the first seed seed0
  //Now looking for a seed for the second group
  let seed1: number

  //init seed1
  for (let i = 0; i < nodes.length; i++) {
    if (i !== t.seed0) {
      seed1 = i
      break
    }
  }

  area = nodes[t.seed0].irect.add_rect(nodes[seed1].irect).area
  //Now try to improve the second seed

  for (let i = 0; i < nodes.length; i++) {
    if (i === t.seed0) continue
    const area1 = nodes[t.seed0].irect.add_rect(nodes[i].irect).area
    if (area1 > area) {
      seed1 = i
      area = area1
    }
  }
  return seed1
}

//calculates a tree based on the given nodes
export function createRectangleNodeOnData<T, P>(
  dataEnumeration: Iterable<T>,
  rectangleDelegate: (t: T) => IRectangle<P>,
): RectangleNode<T, P> {
  if (dataEnumeration == null || rectangleDelegate == null) return null
  const nodeList = Array.from(dataEnumeration).map((d) => mkRectangleNode(d, rectangleDelegate(d)))
  return CreateRectNodeOnArrayOfRectNodes(nodeList)
}

export function mkRectangleNodeWithCount<T, P>(count: number): RectangleNode<T, P> {
  const r = new RectangleNode<T, P>()
  r.Count = count
  return r
}

export function mkRectangleNode<T, P>(data: T, rect: IRectangle<P>): RectangleNode<T, P> {
  const r = new RectangleNode<T, P>()
  r.UserData = data
  r.irect = rect
  r.Count = 1
  return r
}

// it should be a static function of a class but declaring it such creates an error
function VisitTreeStatic<T, P>(
  rectangleNode: RectangleNode<T, P>,
  hitTest: (data: T) => HitTestBehavior,
  hitRectangle: IRectangle<P>,
): HitTestBehavior {
  if (rectangleNode.irect.intersects_rect(hitRectangle)) {
    if (hitTest(rectangleNode.UserData) === HitTestBehavior.Continue) {
      if (rectangleNode.Left != null) {
        // If rectangleNode.Left is not null, rectangleNode.Right won't be either.
        if (
          VisitTreeStatic(rectangleNode.Left, hitTest, hitRectangle) === HitTestBehavior.Continue &&
          VisitTreeStatic(rectangleNode.Right, hitTest, hitRectangle) === HitTestBehavior.Continue
        ) {
          return HitTestBehavior.Continue
        }
        return HitTestBehavior.Stop
      }
      return HitTestBehavior.Continue
    }
    return HitTestBehavior.Stop
  }
  return HitTestBehavior.Continue
}

// Represents a node containing a box and some user data.
// Is used of curve intersections routines.
export class RectangleNode<T, P> {
  UserData: T
  Count: number
  left: RectangleNode<T, P>
  right: RectangleNode<T, P>
  irect: IRectangle<P>

  toString() {
    return this.IsLeaf ? this.Count.toString() + ' ' + this.UserData : this.Count.toString()
  }

  Parent: RectangleNode<T, P>

  // false if it is an internal node and true if it is a leaf
  get IsLeaf(): boolean {
    return this.left == null /*&& right==null*/
  } //if left is a null then right is also a null

  //
  get Left() {
    return this.left
  }
  set Left(value) {
    if (this.left != null && this.left.Parent === this) this.left.Parent = null
    this.left = value
    if (this.left != null) this.left.Parent = this
  }

  get Right() {
    return this.right
  }
  set Right(value) {
    if (this.right != null && this.right.Parent === this) this.right.Parent = null
    this.right = value
    if (this.right != null) this.right.Parent = this
  }

  get IsLeftChild(): boolean {
    /*Assert.assert(this.Parent != null)*/
    return this === this.Parent.Left
  }

  // brings the first leaf which rectangle was intersected
  FirstIntersectedNode(r: IRectangle<P>): RectangleNode<T, P> {
    if (r.intersects_rect(this.irect)) {
      if (this.IsLeaf) return this
      return this.Left.FirstIntersectedNode(r) ?? this.Right.FirstIntersectedNode(r)
    }
    return null
  }

  public FirstHitNodeWithPredicate(point: P, hitTest: (p: P, t: T) => HitTestBehavior): RectangleNode<T, P> {
    if (!this.irect.contains_point(point)) return null

    if (this.IsLeaf) {
      return hitTest(point, this.UserData) === HitTestBehavior.Stop ? this : null
    }

    return this.Left.FirstHitNodeWithPredicate(point, hitTest) ?? this.Right.FirstHitNodeWithPredicate(point, hitTest)
  }
  private FirstHitByRectWithPredicate(rect: IRectangle<P>, hitTest: (t: T) => HitTestBehavior): RectangleNode<T, P> {
    if (!this.irect.intersects_rect(rect)) return null

    if (this.IsLeaf) {
      return hitTest(this.UserData) === HitTestBehavior.Stop ? this : null
    }

    return this.Left.FirstHitByRectWithPredicate(rect, hitTest) ?? this.Right.FirstHitByRectWithPredicate(rect, hitTest)
  }
  // brings the first leaf which rectangle was hit and the delegate is happy with the object
  FirstHitNode(point: P): RectangleNode<T, P> {
    if (this.irect.contains_point(point)) {
      if (this.IsLeaf) return this
      return this.Left.FirstHitNode(point) ?? this.Right.FirstHitNode(point)
    }
    return null
  }

  // returns all leaf nodes for which the rectangle was hit and the delegate is happy with the object
  *AllHitItems(rectanglePar: IRectangle<P>, hitTestAccept: (data: T) => boolean = null): IterableIterator<T> {
    const stack = new Stack<RectangleNode<T, P>>()
    stack.push(this)
    while (stack.size > 0) {
      const node = stack.pop()
      if (node.irect.intersects_rect(rectanglePar)) {
        if (node.IsLeaf) {
          if (hitTestAccept == null || hitTestAccept(node.UserData)) {
            yield node.UserData
          }
        } else {
          stack.push(node.left)
          stack.push(node.right)
        }
      }
    }
  }

  // returns all items for which the rectangle contains the point
  *AllHitItems_(point: P): IterableIterator<T> {
    const stack = new Stack<RectangleNode<T, P>>()
    stack.push(this)
    while (stack.size > 0) {
      const node = stack.pop()
      if (node.irect.contains_point(point)) {
        if (node.IsLeaf) yield node.UserData
        else {
          stack.push(node.left)
          stack.push(node.right)
        }
      }
    }
  }

  // Returns all leaves whose rectangles intersect hitRectangle (or all leaves before hitTest returns false).
  VisitTree(hitTest: (data: T) => HitTestBehavior, hitRectangle: IRectangle<P>) {
    VisitTreeStatic(this, hitTest, hitRectangle)
  }

  //
  Clone(): RectangleNode<T, P> {
    const ret = mkRectangleNodeWithCount<T, P>(this.Count)
    ret.UserData = this.UserData
    ret.irect = this.irect
    if (this.Left != null) ret.Left = this.Left.Clone()
    if (this.Right != null) ret.Right = this.Right.Clone()
    return ret
  }

  // yields all leaves which rectangles intersect the given one. We suppose that leaves are all nodes having UserData not a null.
  *GetNodeItemsIntersectingRectangle(rectanglePar: IRectangle<P>) {
    for (const n of this.GetLeafRectangleNodesIntersectingRectangle(rectanglePar)) yield n.UserData
  }

  // yields all leaves whose rectangles intersect the given one. We suppose that leaves are all nodes having UserData not a null.
  *GetLeafRectangleNodesIntersectingRectangle(rectanglePar: IRectangle<P>): IterableIterator<RectangleNode<T, P>> {
    const stack = new Stack<RectangleNode<T, P>>()
    stack.push(this)
    while (stack.size > 0) {
      const node = stack.pop()
      if (node.irect.intersects_rect(rectanglePar)) {
        if (node.IsLeaf) {
          yield node
        } else {
          stack.push(node.left)
          stack.push(node.right)
        }
      }
    }
  }

  // Walk the tree and return the data from all leaves
  *GetAllLeaves(): IterableIterator<T> {
    for (const n of this.GetAllLeafNodes()) yield n.UserData
  }

  *GetAllLeafNodes(): IterableIterator<RectangleNode<T, P>> {
    //return this.EnumRectangleNodes(true /*leafOnly*/)
    for (const p of this.EnumRectangleNodes(true)) yield p
  }

  *EnumRectangleNodes(leafOnly: boolean): IterableIterator<RectangleNode<T, P>> {
    const stack = new Stack<RectangleNode<T, P>>()
    stack.push(this)
    while (stack.size > 0) {
      const node = stack.pop()
      if (node.IsLeaf || !leafOnly) {
        yield node
      }
      if (!node.IsLeaf) {
        stack.push(node.left)
        stack.push(node.right)
      }
    }
  }

  //

  // Walk the tree from node down and apply visitor to all nodes
  TraverseHierarchy(node: RectangleNode<T, P>, visitor: (n: RectangleNode<T, P>) => void) {
    visitor(node)
    if (node.Left != null) this.TraverseHierarchy(node.Left, visitor)
    if (node.Right != null) this.TraverseHierarchy(node.Right, visitor)
  }
}
