export class Transform {
  // Rotates a 2D configuration clockwise by a given angle
  // The angle is given in degrees
  static Rotate(x: number[], y: number[], angle: number) {
    const sin: number = Math.sin(angle * (Math.PI / 180))
    const cos: number = Math.cos(angle * (Math.PI / 180))
    for (let i = 0; i < x.length; i++) {
      const t = cos * x[i] + sin * y[i]
      y[i] = cos * y[i] - sin * x[i]
      x[i] = t
    }
  }
}
