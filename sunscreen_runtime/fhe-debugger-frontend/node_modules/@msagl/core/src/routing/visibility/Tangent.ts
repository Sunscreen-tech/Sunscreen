import {String} from 'typescript-string-operations'
import {PolylinePoint} from '../../math/geometry/polylinePoint'
import {Diagonal} from './Diagonal'

export class Tangent {
  comp: Tangent

  // the complimentary tangent
  get Comp(): Tangent {
    return this.comp
  }
  set Comp(value: Tangent) {
    this.comp = value
  }

  get IsHigh(): boolean {
    return !this.IsLow
  }

  lowTangent: boolean

  // true means that it is a low tangent to Q, false meanst that it is a high tangent to Q
  get IsLow(): boolean {
    return this.lowTangent
  }
  set IsLow(value: boolean) {
    this.lowTangent = value
  }

  separatingPolygons: boolean

  get SeparatingPolygons(): boolean {
    return this.separatingPolygons
  }
  set SeparatingPolygons(value: boolean) {
    this.separatingPolygons = value
  }

  private diagonal: Diagonal

  // the diagonal will be not a null only when it is active

  get Diagonal(): Diagonal {
    return this.diagonal
  }
  set Diagonal(value: Diagonal) {
    this.diagonal = value
  }

  start: PolylinePoint

  get Start(): PolylinePoint {
    return this.start
  }
  set Start(value: PolylinePoint) {
    this.start = value
  }

  end: PolylinePoint

  public get End(): PolylinePoint {
    return this.end
  }
  public set End(value: PolylinePoint) {
    this.end = value
  }

  constructor(start: PolylinePoint, end: PolylinePoint) {
    this.start = start
    this.End = end
  }

  toString(): string {
    return String.Format('{0},{1}', this.Start, this.End)
  }
}
