import {Queue} from 'queue-typescript'
import {Port} from '../layout/core/port'
import {ICurve} from '../math/geometry/icurve'
import {Rectangle} from '../math/geometry/rectangle'

export class Shape {
  private parents: Set<Shape> = new Set<Shape>()
  private children: Set<Shape> = new Set<Shape>()
  

  public get Parents(): Array<Shape> {
    return Array.from(this.parents.values())
  }

  public get Children(): Array<Shape> {
    return Array.from(this.children.values())
  }

  get BoundaryCurve(): ICurve {
    return this.boundaryCurve
  }
  set BoundaryCurve(value: ICurve) {
    this.boundaryCurve = value
  }

  private boundaryCurve: ICurve

  // The bounding box of the shape.

  public get BoundingBox(): Rectangle {
    return this.BoundaryCurve.boundingBox
  }

  // The set of Ports for this obstacle, usually RelativePorts.  In the event of overlapping
  // obstacles, this identifies the obstacle to which the port applies.

  public get Ports(): Set<Port> {
    return this.ports
  }

  private ports: Set<Port> = new Set<Port>()

  // A location for storing user data associated with the Shape.

  UserData: any

  // Default constructor.

  static mkShape(): Shape {
    return new Shape(null)
  }

  /**  Constructor taking the curve of the shape.*/
  public constructor(boundaryCurve: ICurve = null) {
    this.BoundaryCurve = boundaryCurve
  }

  /**  A group is a shape that has children.*/
  public get IsGroup(): boolean {
    return this.children.size > 0
  }

  IsTransparent: boolean;

  *Descendants(): IterableIterator<Shape> {
    const q = new Queue<Shape>()
    for (const shape of this.Children) {
      q.enqueue(shape)
    }

    while (q.length > 0) {
      const sh = q.dequeue()
      yield sh
      for (const shape of sh.Children) {
        q.enqueue(shape)
      }
    }
  }

  *Ancestors(): IterableIterator<Shape> {
    const q = new Queue<Shape>()
    for (const shape of this.Parents) {
      q.enqueue(shape)
    }

    while (q.length > 0) {
      const sh = q.dequeue()
      yield sh
      for (const shape of sh.Parents) {
        q.enqueue(shape)
      }
    }
  }

  // Adds a parent. A shape can have several parents

  public AddParent(shape: Shape) {
    this.parents.add(shape)
    shape.children.add(this)
  }

  public AddChild(shape: Shape) {
    shape.parents.add(this)
    this.children.add(shape)
  }

  //

  public RemoveChild(shape: Shape) {
    this.children.delete(shape)
    shape.parents.delete(this)
  }

  //

  public RemoveParent(shape: Shape) {
    this.parents.delete(shape)
    shape.children.delete(this)
  }

  public ToString(): string {
    return this.UserData ? this.UserData.toString() : 'null'
  }
}
