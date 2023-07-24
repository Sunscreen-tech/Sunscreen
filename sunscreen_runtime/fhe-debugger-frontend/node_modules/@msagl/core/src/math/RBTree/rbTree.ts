import {RBNode} from './rbNode'
import {RBColor} from './rbColor'

export class RBTree<T> {
  readonly comparer: (a: T, b: T) => number
  count: number

  root: RBNode<T>
  nil: RBNode<T>;

  [Symbol.iterator](): IterableIterator<T> {
    return this.allNodes()
  }
  constructor(comparer: (a: T, b: T) => number) {
    this.comparer = comparer
    this.count = 0
    this.root = this.nil = new RBNode(RBColor.Black)
  }

  clear() {
    this.root = this.nil = new RBNode<T>(RBColor.Black)
  }

  toNull(y: RBNode<T>): RBNode<T> {
    return y !== this.nil ? y : null
  }

  isEmpty(): boolean {
    return this.root === this.nil
  }

  getComparer(): (a: T, b: T) => number {
    return this.comparer
  }

  getRoot(): RBNode<T> {
    return this.root
  }

  find(i: T, x: RBNode<T> = this.root): RBNode<T> {
    let compareResult: number
    while (x !== this.nil && (compareResult = this.comparer(i, x.item)) !== 0) x = compareResult < 0 ? x.left : x.right

    return this.toNull(x)
  }

  findFirst(predicate: (t: T) => boolean, n: RBNode<T> = this.root): RBNode<T> {
    if (n === this.nil) return null
    let good: RBNode<T> = null
    while (n !== this.nil) {
      n = predicate(n.item) ? (good = n).left : n.right
    }
    return good
  }

  findLast(predicate: (t: T) => boolean, n: RBNode<T> = this.root): RBNode<T> {
    if (n === this.nil) return null
    let good: RBNode<T> = null
    while (n !== this.nil) n = predicate(n.item) ? (good = n).right : n.left
    return good
  }

  treeMinimum(x: RBNode<T> = this.root): RBNode<T> {
    while (x.left !== this.nil) x = x.left
    return this.toNull(x)
  }

  treeMaximum(x: RBNode<T> = this.root): RBNode<T> {
    while (x.right !== this.nil) x = x.right
    return this.toNull(x)
  }

  next(x: RBNode<T>): RBNode<T> {
    if (x.right !== this.nil) return this.treeMinimum(x.right)
    let y: RBNode<T> = x.parent
    while (y !== this.nil && x === y.right) {
      x = y
      y = y.parent
    }
    return this.toNull(y)
  }

  previous(x: RBNode<T>): RBNode<T> {
    if (x.left !== this.nil) return this.treeMaximum(x.left)
    let y: RBNode<T> = x.parent
    while (y !== this.nil && x === y.left) {
      x = y
      y = y.parent
    }
    return this.toNull(y)
  }

  private leftRotate(x: RBNode<T>) {
    const y: RBNode<T> = x.right
    x.right = y.left
    if (y.left !== this.nil) y.left.parent = x
    y.parent = x.parent
    if (x.parent === this.nil) this.root = y
    else if (x === x.parent.left) x.parent.left = y
    else x.parent.right = y

    y.left = x
    x.parent = y
  }

  private rightRotate(x: RBNode<T>) {
    const y: RBNode<T> = x.left
    x.left = y.right
    if (y.right !== this.nil) y.right.parent = x
    y.parent = x.parent
    if (x.parent === this.nil) this.root = y
    else if (x === x.parent.right) x.parent.right = y
    else x.parent.left = y

    y.right = x
    x.parent = y
  }

  private deleteFixup(x: RBNode<T>) {
    while (x !== this.root && x.color === RBColor.Black) {
      if (x === x.parent.left) {
        let w: RBNode<T> = x.parent.right
        if (w.color === RBColor.Red) {
          w.color = RBColor.Black
          x.parent.color = RBColor.Red
          this.leftRotate(x.parent)
          w = x.parent.right
        }
        if (w.left.color === RBColor.Black && w.right.color === RBColor.Black) {
          w.color = RBColor.Red
          x = x.parent
        } else {
          if (w.right.color === RBColor.Black) {
            w.left.color = RBColor.Black
            w.color = RBColor.Red
            this.rightRotate(w)
            w = x.parent.right
          }
          w.color = x.parent.color
          x.parent.color = RBColor.Black
          w.right.color = RBColor.Black
          this.leftRotate(x.parent)
          x = this.root
        }
      } else {
        let w: RBNode<T> = x.parent.left
        if (w.color === RBColor.Red) {
          w.color = RBColor.Black
          x.parent.color = RBColor.Red
          this.rightRotate(x.parent)
          w = x.parent.left
        }
        if (w.right.color === RBColor.Black && w.left.color === RBColor.Black) {
          w.color = RBColor.Red
          x = x.parent
        } else {
          if (w.left.color === RBColor.Black) {
            w.right.color = RBColor.Black
            w.color = RBColor.Red
            this.leftRotate(w)
            w = x.parent.left
          }
          w.color = x.parent.color
          x.parent.color = RBColor.Black
          w.left.color = RBColor.Black
          this.rightRotate(x.parent)
          x = this.root
        }
      }
    }
    x.color = RBColor.Black
  }

  deleteSubTree(z: RBNode<T>): RBNode<T> {
    //Assert.assert(z !== nil);
    /*Assert.assert(z !== this.nil, 'root of subtree to delete must not be null.')*/
    let y: RBNode<T>
    if (z.left === this.nil || z.right === this.nil) {
      /* y has a nil node as a child */
      y = z
    } else {
      /* find tree successor with a nilnode as a child */
      y = z.right
      while (y.left !== this.nil) y = y.left
    }

    /* x is y's only child */
    const x: RBNode<T> = y.left !== this.nil ? y.left : y.right
    x.parent = y.parent
    if (y.parent === this.nil) this.root = x
    else {
      if (y === y.parent.left) y.parent.left = x
      else y.parent.right = x
    }
    if (y !== z) z.item = y.item
    if (y.color === RBColor.Black) this.deleteFixup(x)

    return this.toNull(z)
  }

  deleteNodeInternal(x: RBNode<T>) {
    this.count--
    this.deleteSubTree(x)
  }

  remove(i: T): RBNode<T> {
    const n: RBNode<T> = this.find(i)
    if (n != null) {
      this.count--
      return this.deleteSubTree(n)
    }
    return null
  }

  insert(v: T): RBNode<T> {
    const x: RBNode<T> = this.treeInsert(v)
    this.insertPrivate(x)
    return this.toNull(x)
  }

  treeInsert(z: T): RBNode<T> {
    let y = this.nil
    let x = this.root
    let compareRes = 0
    while (x !== this.nil) {
      y = x
      //#if SHARPKIT //https://code.google.com/p/sharpkit/issues/detail?id=368
      // compareRes = Comparer.Compare(z, x.Item);
      // x = compareRes < 0 ? x.left : x.right;
      compareRes = this.comparer(z, x.item)
      x = compareRes < 0 ? x.left : x.right
      // #else
      //    x = (compareRes = Comparer.Compare(z, x.Item)) < 0 ? x.left : x.right;
      // #endif
    }

    const nz = new RBNode<T>(RBColor.Black, z, y, this.nil, this.nil)

    if (y === this.nil) this.root = nz
    else if (compareRes < 0) y.left = nz
    else y.right = nz

    return this.toNull(nz)
  }

  private insertPrivate(x: RBNode<T>) {
    this.count++
    x.color = RBColor.Red
    while (x !== this.root && x.parent.color === RBColor.Red) {
      if (x.parent === x.parent.parent.left) {
        const y: RBNode<T> = x.parent.parent.right
        if (y.color === RBColor.Red) {
          x.parent.color = RBColor.Black
          y.color = RBColor.Black
          x.parent.parent.color = RBColor.Red
          x = x.parent.parent
        } else {
          if (x === x.parent.right) {
            x = x.parent
            this.leftRotate(x)
          }
          x.parent.color = RBColor.Black
          x.parent.parent.color = RBColor.Red
          this.rightRotate(x.parent.parent)
        }
      } else {
        const y: RBNode<T> = x.parent.parent.left
        if (y.color === RBColor.Red) {
          x.parent.color = RBColor.Black
          y.color = RBColor.Black
          x.parent.parent.color = RBColor.Red
          x = x.parent.parent
        } else {
          if (x === x.parent.left) {
            x = x.parent
            this.rightRotate(x)
          }
          x.parent.color = RBColor.Black
          x.parent.parent.color = RBColor.Red
          this.leftRotate(x.parent.parent)
        }
      }
    }

    this.root.color = RBColor.Black
  }

  *allNodes(): IterableIterator<T> {
    if (this.isEmpty()) return
    let c: RBNode<T> = this.treeMinimum()
    while (c != null) {
      yield c.item
      c = this.next(c)
    }
    return
  }

  public toString(): string {
    let ret = '{'
    let i = 0
    for (const node of this.allNodes()) {
      ret += node.toString()
      if (i !== this.count - 1) {
        ret += '\n'
      }
      i++
    }
    return ret + '}'
  }
}
