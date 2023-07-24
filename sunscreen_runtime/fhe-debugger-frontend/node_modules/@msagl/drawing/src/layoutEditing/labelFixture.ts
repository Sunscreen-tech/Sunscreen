/**  to put a label go to RelativeLengthOnCurve position, take normal accordingly to the RightSide and follow NormalLength this direction */
export class LabelFixture {
  RelativeLengthOnCurve: number

  RightSide: boolean

  NormalLength: number
  constructor(relativeLengthOnCurve: number, rightSide: boolean, normalLength: number) {
    this.RelativeLengthOnCurve = relativeLengthOnCurve
    this.RightSide = rightSide
    this.NormalLength = normalLength
  }
}
