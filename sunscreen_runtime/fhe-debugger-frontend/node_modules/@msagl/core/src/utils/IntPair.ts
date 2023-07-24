// represents the minimal int->int edge

export class IntPair {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
  get source() {
    return this.x
  }
  get target() {
    return this.y
  }
  isDiagonal(): boolean {
    return this.x === this.y
  }
}
