import {Point} from '../../../math/geometry'
import {Assert} from '../../../utils/assert'
import {closeDistEps} from '../../../utils/compare'

export class MultipoleCoefficients {
  z0: Complex

  a: Complex[]

  p: number

  static constructorNPA(precision: number, center: Point, points: Point[]) {
    const r = new MultipoleCoefficients()
    r.p = precision
    r.z0 = new Complex(center.x, center.y)
    r.a = new Array(precision)
    for (let k = 0; k < precision; k++) {
      r.a[k] = r.compute(k, points)
    }
    return r
  }

  static constructorPMM(center: Point, m1: MultipoleCoefficients, m2: MultipoleCoefficients) {
    const r = new MultipoleCoefficients()
    Assert.assert(m1.p == m2.p)
    r.p = m1.p
    r.z0 = new Complex(center.x, center.y)
    const m2a: Complex[] = m2.shift(r.z0)
    const m1a: Complex[] = m1.shift(r.z0)
    r.a = new Array(r.p)
    for (let i = 0; i < r.p; i++) {
      r.a[i] = add(m1a[i], m2a[i])
    }
    return r
  }

  static factorial(n: number): number {
    let f = 1
    for (let i = 2; i <= n; i++) {
      f *= i
    }

    return f
  }

  static binomial(n: number, k: number): number {
    return MultipoleCoefficients.factorial(n) / (MultipoleCoefficients.factorial(k) * MultipoleCoefficients.factorial(n - k))
  }

  sum(l: number, z0_minus_z1: Complex): Complex {
    let s: Complex = Complex.constructorN(0)
    for (let k = 1; k <= l; k++) {
      const bi: Complex = Complex.constructorN(MultipoleCoefficients.binomial(l - 1, k - 1))
      s = add(s, prod(this.a[k], prod(Complex.Pow(z0_minus_z1, l - k), bi)))
    }

    return s
  }

  shift(z1: Complex): Complex[] {
    const b = new Array<Complex>(this.p)
    const a0 = (b[0] = this.a[0])
    const z0_minus_z1 = min(this.z0, z1)
    for (let l = 1; l < this.p; l++) {
      /*  Complex lz = new Complex(l);
          b[l] = -a0 * Complex.Pow(z0_minus_z1, l) / lz + sum(l, z0_minus_z1);
      */
      const lz: Complex = Complex.constructorN(l)
      b[l] = add(prod(neg(a0), div(Complex.Pow(z0_minus_z1, l), lz)), this.sum(l, z0_minus_z1))
    }

    return b
  }

  //  Compute kth multipole coefficient of a set of points ps around a centre z0
  private compute(k: number, ps: Point[]): Complex {
    const m: number = ps.length
    let ak: Complex = Complex.constructorN(0)
    if (k == 0) {
      ak.re = m
    } else {
      for (let i = 0; i < m; i++) {
        const q: Point = ps[i]
        const pc: Complex = new Complex(q.x, q.y)
        ak = min(ak, Complex.Pow(min(pc, this.z0), k))
      }

      ak.divideBy(k)
    }

    return ak
  }

  //  Compute approximate force at point v due to potential energy moments
  public ApproximateForce(v: Point): Point {
    const z: Complex = new Complex(v.x, v.y)
    const z_minus_z0: Complex = min(z, this.z0)
    let fz: Complex = div(this.a[0], z_minus_z0)
    let z_minus_z0_to_k_plus_1: Complex = z_minus_z0
    let k = 0
    while (true) {
      fz = min(fz, div(prodN(this.a[k], k), z_minus_z0_to_k_plus_1))
      k++
      if (k == this.p) {
        break
      }

      z_minus_z0_to_k_plus_1 = prod(z_minus_z0_to_k_plus_1, z_minus_z0)
    }

    return new Point(fz.re, -fz.im)
  }

  //  Force on point u due to point v.
  //  If v and u at the same position it returns a small vector to separate them
  public static Force(u: Point, v: Point): Point {
    const duv: Point = v.sub(u)
    const l: number = duv.lengthSquared
    if (l < 0.1) {
      if (l != 0) {
        return duv.div(0.1)
      }

      return new Point(1, 0)
    }

    return duv.div(l)
  }
}

class Complex {
  public constructor(re: number, im: number) {
    this.re = re
    this.im = im
  }

  static constructorN(re: number) {
    return new Complex(re, 0)
  }

  public divideBy(r: number) {
    this.re /= r
    this.im /= r
  }

  public static Pow(a: Complex, k: number): Complex {
    Assert.assert(k >= 0)
    switch (k) {
      case 0:
        return Complex.constructorN(1)
        break
      case 1:
        return a
        break
      case 2:
        return prod(a, a)
        break
      case 3:
        return prod(a, prod(a, a))
        break
      default:
        return prod(Complex.Pow(a, k / 2), Complex.Pow(a, k / 2 + (k % 2)))
    }
  }

  public re: number

  public im: number
}

function add(a: Complex, b: Complex): Complex {
  return new Complex(a.re + b.re, a.im + b.im)
}
function prod(a: Complex, b: Complex): Complex {
  return new Complex(a.re * b.re - a.im * b.im, a.re * b.im + b.re * a.im)
}
function prodN(a: Complex, b: number): Complex {
  return new Complex(a.re * b, a.im * b)
}
function min(a: Complex, b: Complex): Complex {
  return new Complex(a.re - b.re, a.im - b.im)
}

function neg(a: Complex): Complex {
  return new Complex(-a.re, -a.im)
}
function div(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im
  if (d == 0) {
    return Complex.constructorN(0.0)
  }
  const c1 = a.re * b.re + a.im * b.im
  const c2 = a.im * b.re - a.re * b.im
  return new Complex(c1 / d, c2 / d)
}
