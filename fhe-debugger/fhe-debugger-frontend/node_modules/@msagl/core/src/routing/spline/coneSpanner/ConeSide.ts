import {Point} from '../../../math/geometry/point'
import {Cone} from './Cone'

export abstract class ConeSide {
  abstract get Start(): Point

  abstract get Direction(): Point

  Cone: Cone

  Removed = false
}
