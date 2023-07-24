export class UniformSolverVar {
  lowBound: number = Number.NEGATIVE_INFINITY

  upperBound: number = Number.POSITIVE_INFINITY

  IsFixed: boolean

  position: number

  Width: number

  get Position(): number {
    return this.position
  }
  set Position(value: number) {
    if (value < this.lowBound) {
      this.position = this.lowBound
    } else if (value > this.upperBound) {
      this.position = this.upperBound
    } else {
      this.position = value
    }
  }

  get LowBound(): number {
    return this.lowBound
  }
  set LowBound(value: number) {
    /*Assert.assert(value <= this.upperBound)*/
    this.lowBound = value
  }

  get UpperBound(): number {
    return this.upperBound
  }
  set UpperBound(value: number) {
    /*Assert.assert(value >= this.LowBound)*/
    this.upperBound = value
  }

  toString(): string {
    return this.lowBound + (' ' + (this.Position + (' ' + this.upperBound)))
  }
}
