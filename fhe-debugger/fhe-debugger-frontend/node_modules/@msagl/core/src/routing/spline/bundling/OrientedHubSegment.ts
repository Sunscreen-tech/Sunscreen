import {ICurve, Point} from '../../..'
import {BundleBase} from './BundleBase'

export class OrientedHubSegment {
  private segment: ICurve
  public get Segment(): ICurve {
    return this.segment
  }
  public set Segment(value: ICurve) {
    this.segment = value
  }

  Reversed: boolean

  Index: number
  BundleBase: BundleBase

  constructor(seg: ICurve, reversed: boolean, index: number, bundleBase: BundleBase) {
    this.Segment = seg
    this.Reversed = reversed
    this.Index = index
    this.BundleBase = bundleBase
  }

  value(t: number): Point {
    return this.Reversed ? this.Segment.value(this.Segment.parEnd - t) : this.Segment.value(t)
  }

  Other: OrientedHubSegment
}
