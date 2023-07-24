// Flow fill of columns to some maximum height

import {Point} from '../point'
import {Rectangle} from '../rectangle'
import {Packing} from './Packing'

export class ColumnPacking extends Packing {
  orderedRectangles: Rectangle[]
  getRects() {
    return this.orderedRectangles
  }
  maxHeight: number

  // Constructor for packing, call Run to do the actual pack.
  // Each RectangleToPack.Rectangle is updated of place.
  // Pack rectangles tallest to shortest, left to right until wrapWidth is reached,
  // then wrap to right-most rectangle still with vertical space to fit the next rectangle
  public constructor(rectangles: Rectangle[], maxHeight: number) {
    super(null)
    this.orderedRectangles = rectangles
    this.maxHeight = maxHeight
  }

  // Pack columns by iterating over rectangle enumerator until column height exceeds wrapHeight.
  // When that happens, create a new column at position PackedWidth.
  run() {
    this.PackedWidth = 0
    this.PackedHeight = 0
    let columnPosition = 0
    let columnHeight = 0
    for (let i = 0; i < this.orderedRectangles.length; i++) {
      const r = this.orderedRectangles[i]
      if (columnHeight + r.height > this.maxHeight) {
        columnPosition = this.PackedWidth
        columnHeight = 0
      }

      const leftBottom = new Point(columnPosition, columnHeight)
      const center = leftBottom.add(new Point(r.width / 2, r.height / 2))
      r.center = center
      this.rectsToCenters.set(r, center)

      this.PackedWidth = Math.max(this.PackedWidth, columnPosition + r.width)
      columnHeight = columnHeight + r.height
      this.PackedHeight = Math.max(this.PackedHeight, columnHeight)
    }
  }
}
