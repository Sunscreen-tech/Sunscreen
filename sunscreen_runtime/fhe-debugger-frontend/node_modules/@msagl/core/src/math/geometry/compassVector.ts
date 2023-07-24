import {PointComparer} from '../../routing/rectilinear/PointComparer'
import {Direction} from './direction'
import {Point} from './point'

export class CompassVector {
  Dir: Direction

  constructor(direction: Direction) {
    this.Dir = direction
  }

  get Right(): CompassVector {
    return new CompassVector(CompassVector.RotateRight(this.Dir))
  }

  static RotateRight(direction: Direction): Direction {
    switch (direction) {
      case Direction.North:
        return Direction.East
        break
      case Direction.East:
        return Direction.South
        break
      case Direction.South:
        return Direction.West
        break
      case Direction.West:
        return Direction.North
        break
      default:
        throw new Error()
        break
    }
  }

  static RotateLeft(direction: Direction): Direction {
    switch (direction) {
      case Direction.North:
        return Direction.West
        break
      case Direction.West:
        return Direction.South
        break
      case Direction.South:
        return Direction.East
        break
      case Direction.East:
        return Direction.North
        break
      default:
        throw new Error()
        break
    }
  }

  static ToIndex(direction: Direction): number {
    switch (direction) {
      case Direction.North:
        return 0
        break
      case Direction.East:
        return 1
        break
      case Direction.South:
        return 2
        break
      case Direction.West:
        return 3
        break
      default:
        throw new Error()
        break
    }
  }

  static VectorDirection(d: Point): Direction {
    let r: Direction = Direction.None
    if (d.x > PointComparer.DifferenceEpsilon) {
      r = Direction.East
    } else if (d.x < -PointComparer.DifferenceEpsilon) {
      r = Direction.West
    }

    if (d.y > PointComparer.DifferenceEpsilon) {
      r = r | Direction.North
    } else if (d.y < -PointComparer.DifferenceEpsilon) {
      r = r | Direction.South
    }

    return r
  }

  static VectorDirectionPP(a: Point, b: Point): Direction {
    let r: Direction = Direction.None
    // This method is called a lot as part of rectilinear layout.
    // Try to keep it quick.
    const horizontalDiff: number = b.x - a.x
    const verticalDiff: number = b.y - a.y
    if (horizontalDiff > PointComparer.DifferenceEpsilon) {
      r = Direction.East
    } else if (-horizontalDiff > PointComparer.DifferenceEpsilon) {
      r = Direction.West
    }

    if (verticalDiff > PointComparer.DifferenceEpsilon) {
      r |= Direction.North
    } else if (-verticalDiff > PointComparer.DifferenceEpsilon) {
      r |= Direction.South
    }

    return r
  }

  static DirectionFromPointToPoint(a: Point, b: Point): Direction {
    return CompassVector.VectorDirectionPP(a, b)
  }

  static OppositeDir(dir: Direction): Direction {
    switch (dir) {
      case Direction.North:
        return Direction.South
        break
      case Direction.West:
        return Direction.East
        break
      case Direction.South:
        return Direction.North
        break
      case Direction.East:
        return Direction.West
        break
      default:
        return Direction.None
        break
    }
  }

  static IsPureDirection(dir: Direction): boolean {
    switch (dir) {
      case Direction.North:
        return true
        break
      case Direction.East:
        return true
        break
      case Direction.South:
        return true
        break
      case Direction.West:
        return true
        break
      default:
        return false
        break
    }
  }

  static IsPureDirectionPP(a: Point, b: Point): boolean {
    return CompassVector.IsPureDirection(CompassVector.DirectionFromPointToPoint(a, b))
  }

  static DirectionsAreParallel(a: Direction, b: Direction): boolean {
    return a === b || a === CompassVector.OppositeDir(b)
  }
  // Translates the CompassVector's direction into a new Point.

  public ToPoint(): Point {
    let x = 0,
      y = 0
    if ((this.Dir & Direction.East) === Direction.East) {
      x++
    }

    if ((this.Dir & Direction.North) === Direction.North) {
      y++
    }

    if ((this.Dir & Direction.West) === Direction.West) {
      x--
    }

    if ((this.Dir & Direction.South) === Direction.South) {
      y--
    }

    return new Point(x, y)
  }

  // Translates a direction into a Point.

  public static toPoint(dir: Direction): Point {
    return new CompassVector(dir).ToPoint()
  }

  //  the negation operator

  public static negate(directionVector: CompassVector): CompassVector {
    return new CompassVector(CompassVector.OppositeDir(directionVector.Dir))
  }
}
