import {Rectangle} from '../rectangle'
import {ColumnPacking} from './ColumnPacking'
import {OptimalPacking} from './OptimalPacking'

// Pack rectangles (without rotation) into a given aspect ratio
export class OptimalColumnPacking extends OptimalPacking {
  // Constructor for packing, call Run to do the actual pack.
  // Each RectangleToPack.Rectangle is updated in place.
  // Performs a Golden Section Search on packing width for the
  // closest aspect ratio to the specified desired aspect ratio
  public constructor(rectangles: Rectangle[], aspectRatio: number) {
    super(rectangles, aspectRatio)
    /*Assert.assert(
      rectangles.length > 0,
      'Expected more than one rectangle in rectangles',
    )*/
    /*Assert.assert(aspectRatio > 0, 'aspect ratio should be greater than 0')*/

    this.createPacking = (rs, height) => new ColumnPacking(rs, height)
  }

  // Performs a Golden Section Search on packing height for the
  // closest aspect ratio to the specified desired aspect ratio
  run() {
    let minRectHeight = Number.MAX_VALUE
    let maxRectHeight = 0
    let totalHeight = 0
    // initial widthLowerBound is the width of a perfect packing for the desired aspect ratio
    for (const r of this.rectangles) {
      /*Assert.assert(r.width > 0, 'Width must be greater than 0')*/
      /*Assert.assert(r.height > 0, 'Height must be greater than 0')*/
      totalHeight = totalHeight + r.height
      minRectHeight = Math.min(minRectHeight, r.height)
      maxRectHeight = Math.max(maxRectHeight, r.height)
    }

    this.Pack(maxRectHeight, totalHeight, minRectHeight)
  }
}
