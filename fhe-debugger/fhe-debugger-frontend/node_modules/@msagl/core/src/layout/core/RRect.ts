import {Rectangle} from '../../math/geometry/rectangle'
import {Point} from '../../math/geometry/point'
import {Curve, CurveFactory} from '../../math/geometry'

export class RRect extends Rectangle {
  public radX: number
  public radY: number
  public roundedRect_: Curve
  protected boundingBox_: Rectangle

  constructor(t: {left: number; right: number; top: number; bottom: number; radX: number; radY: number}) {
    super(t)

    this.radX = t.radX
    this.radY = t.radY
    this.roundedRect_ = CurveFactory.mkRectangleWithRoundedCorners(this.width, this.height, t.radX, t.radY, this.center)
  }

  override onUpdated(): void {
    if (!this.isEmpty) {
      this.roundedRect_ = CurveFactory.mkRectangleWithRoundedCorners(this.width, this.height, this.radX, this.radY, this.center)
    }
  }

  isOk(): boolean {
    if (this.isEmpty()) {
      return true
    }
    return this.roundedRect_.boundingBox.equalEps(this)
  }

  setRect(value: Rectangle) {
    this.left = value.left
    this.right = value.right
    this.top = value.top
    this.bottom = value.bottom
    if (!this.isEmpty()) {
      this.roundedRect_ = CurveFactory.mkRectangleWithRoundedCorners(value.width, value.height, this.radX, this.radY, this.center)
    }
  }
}
