import {random} from '../../utils/random'
export class MultidimensionalScaling {
  // Double-centers a matrix of such a way that the center of gravity is zero.
  // After number-centering, each row and each column sums up to zero.
  static DoubleCenter(matrix: number[][]) {
    const rowMean = new Array<number>(matrix.length).fill(0)
    const colMean = new Array<number>(matrix[0].length).fill(0)
    let mean = 0
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        rowMean[i] += matrix[i][j]
        colMean[j] += matrix[i][j]
        mean += matrix[i][j]
      }
    }
    for (let i = 0; i < matrix.length; i++) rowMean[i] /= matrix.length
    for (let j = 0; j < matrix[0].length; j++) colMean[j] /= matrix[0].length
    mean /= matrix.length
    mean /= matrix[0].length
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        matrix[i][j] -= rowMean[i] + colMean[j] - mean
      }
    }
  }

  // Squares all entries of a matrix.
  public static SquareEntries(matrix: number[][]) {
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        matrix[i][j] = Math.pow(matrix[i][j], 2)
      }
    }
  }

  // Multiplies a matrix with a scalar factor.
  static Multiply(matrix: number[][], factor: number) {
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[0].length; j++) {
        matrix[i][j] *= factor
      }
    }
  }

  // Multiply a square matrix and a vector.
  // Note that matrix width and vector length
  // have to be equal, otherwise null is returned.
  static MultiplyX(A: number[][], x: number[]): number[] {
    if (A[0].length !== x.length) return null
    const y = new Array<number>(x.length).fill(0)
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < A[0].length; j++) {
        y[i] += A[i][j] * x[j]
      }
    }
    return y
  }

  // Gives the norm of a vector, that is, its length in
  // vector.length dimensional Euclidean space.
  static Norm(x: number[]): number {
    let norm = 0
    for (let i = 0; i < x.length; i++) {
      norm += Math.pow(x[i], 2)
    }
    return Math.sqrt(norm)
  }

  // Normalizes a vector to unit length (1.0) in
  // vector.length dimensional Euclidean space.
  // If the vector is the 0-vector, nothing is done.
  static Normalize(x: number[]): number {
    const lambda = MultidimensionalScaling.Norm(x)
    if (lambda <= 0) return 0
    for (let i = 0; i < x.length; i++) {
      x[i] /= lambda
    }
    return lambda
  }

  // Gives a random unit Euclidean length vector of a given size.
  static RandomUnitLengthVector(n: number): number[] {
    const result = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      result[i] = random()
    }
    MultidimensionalScaling.Normalize(result)
    return result
  }

  // Computes the two dominant eigenvectors and eigenvalues of a symmetric
  // square matrix.
  static SpectralDecomposition(
    A: number[][],
    t: {
      u1: number[]
      lambda1: number
      u2: number[]
      lambda2: number
    },
  ) {
    MultidimensionalScaling.SpectralDecompositionIE(A, t, 30, 1e-6)
  }

  // Computes the two dominant eigenvectors and eigenvalues of a symmetric
  // square matrix.
  static SpectralDecompositionIE(
    A: number[][],
    t: {
      u1: number[]
      lambda1: number
      u2: number[]
      lambda2: number
    },
    maxIterations: number,
    epsilon: number,
  ) {
    const n: number = A[0].length
    t.u1 = MultidimensionalScaling.RandomUnitLengthVector(n)
    t.lambda1 = 0
    t.u2 = MultidimensionalScaling.RandomUnitLengthVector(n)
    t.lambda2 = 0
    let r = 0
    const limit = 1.0 - epsilon
    // iterate until convergence but at most 30 steps
    for (let i = 0; i < maxIterations && r < limit; i++) {
      const x1 = MultidimensionalScaling.MultiplyX(A, t.u1)
      const x2 = MultidimensionalScaling.MultiplyX(A, t.u2)

      t.lambda1 = MultidimensionalScaling.Normalize(x1)
      t.lambda2 = MultidimensionalScaling.Normalize(x2)
      MultidimensionalScaling.MakeOrthogonal(x2, x1)
      MultidimensionalScaling.Normalize(x2)

      // convergence is assumed if the inner product of
      // two consecutive (unit length) iterates is close to 1
      r = Math.min(MultidimensionalScaling.DotProduct(t.u1, x1), MultidimensionalScaling.DotProduct(t.u2, x2))
      t.u1 = x1
      t.u2 = x2
    }
  }
  // Gives the inner product of two vectors of the same size.
  static DotProduct(x: number[], y: number[]): number {
    if (x.length !== y.length) return 0
    let result = 0
    for (let i = 0; i < x.length; i++) {
      result += x[i] * y[i]
    }
    return result
  }

  // Orthogonalizes a vector against another vector, so that
  // their scalar product is 0.
  static MakeOrthogonal(x: number[], y: number[]) {
    if (x.length !== y.length) return
    const prod = MultidimensionalScaling.DotProduct(x, y) / MultidimensionalScaling.DotProduct(y, y)
    for (let i = 0; i < x.length; i++) {
      x[i] -= prod * y[i]
    }
  }

  // Classical multidimensional scaling.  Computes two-dimensional coordinates
  // for a given distance matrix by computing the two largest eigenvectors
  // and eigenvalues of a matrix assiciated with the distance matrix (called
  // "fitting inner products").
  static ClassicalScaling(d: number[][], t: {u1: number[]; u2: number[]; lambda1: number; lambda2: number}) {
    const b = new Array<number[]>(d.length)
    for (let i = 0; i < d.length; i++) {
      b[i] = d[i].slice()
    }
    MultidimensionalScaling.SquareEntries(b)
    MultidimensionalScaling.DoubleCenter(b)
    MultidimensionalScaling.Multiply(b, -0.5)

    MultidimensionalScaling.SpectralDecomposition(b, t)
    t.lambda1 = Math.sqrt(Math.abs(t.lambda1))
    t.lambda2 = Math.sqrt(Math.abs(t.lambda2))
    for (let i = 0; i < t.u1.length; i++) {
      t.u1[i] *= t.lambda1
      t.u2[i] *= t.lambda2
    }
  }

  // Multidimensional scaling.  Computes two-dimensional coordinates
  // for a given distance matrix by fitting the coordinates to these distances
  // iteratively by majorization (called "distance fitting").
  // Only objects that have rows of the distance/weight matrix
  // is subject to iterative relocation.
  static DistanceScalingSubset(d: number[][], x: number[], y: number[], w: number[][], numberOfIterations: number) {
    const n = x.length
    const k = d.length
    const index = new Array<number>(k)
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < n; j++) {
        if (d[i][j] === 0) {
          index[i] = j
        }
      }
    }

    const wSum = new Array<number>(k).fill(0)
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < n; j++) {
        if (index[i] !== j) {
          wSum[i] += w[i][j]
        }
      }
    }
    for (let c = 0; c < numberOfIterations; c++) {
      for (let i = 0; i < k; i++) {
        let xNew = 0
        let yNew = 0
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            let inv = Math.sqrt(Math.pow(x[index[i]] - x[j], 2) + Math.pow(y[index[i]] - y[j], 2))
            if (inv > 0) inv = 1 / inv
            xNew += w[i][j] * (x[j] + d[i][j] * (x[index[i]] - x[j]) * inv)
            yNew += w[i][j] * (y[j] + d[i][j] * (y[index[i]] - y[j]) * inv)
          }
        }
        x[index[i]] = xNew / wSum[i]
        y[index[i]] = yNew / wSum[i]
      }
    }
  }

  // Multidimensional scaling.  Computes two-dimensional coordinates
  // for a given distance matrix by fitting the coordinates to these distances
  // iteratively by majorization (called "distance fitting").
  // (McGee, Kamada-Kawai)
  static DistanceScaling(d: number[][], x: number[], y: number[], w: number[][], iter: number) {
    const n = x.length
    const wSum = new Array<number>(n).fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) wSum[i] += w[i][j]
      }
    }
    for (let c = 0; c < iter; c++) {
      for (let i = 0; i < n; i++) {
        let xNew = 0
        let yNew = 0
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            let inv = Math.sqrt(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2))
            if (inv > 0) inv = 1 / inv
            xNew += w[i][j] * (x[j] + d[i][j] * (x[i] - x[j]) * inv)
            yNew += w[i][j] * (y[j] + d[i][j] * (y[i] - y[j]) * inv)
          }
        }
        x[i] = xNew / wSum[i]
        y[i] = yNew / wSum[i]
      }
    }
  }

  // Convenience method for generating a weight matrix from a distance matrix.
  // Each output entry is the corresponding input entry powered by a constant
  // exponent.
  static ExponentialWeightMatrix(d: number[][], exponent: number): number[][] {
    const w = new Array<number[]>(d.length)
    for (let i = 0; i < d.length; i++) {
      w[i] = new Array<number>(d[i].length).fill(0)
      for (let j = 0; j < d[i].length; j++) {
        if (d[i][j] > 0) w[i][j] = Math.pow(d[i][j], exponent)
      }
    }
    return w
  }

  // Convenience method for all Euclidean distances within two-dimensional
  // positions.
  static EuclideanDistanceMatrix(x: number[], y: number[]): number[][] {
    const d = new Array<number[]>(x.length)
    for (let i = 0; i < x.length; i++) {
      d[i] = new Array<number>(x.length)
      for (let j = 0; j < x.length; j++) {
        d[i][j] = Math.sqrt(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2))
      }
    }
    return d
  }

  // Approximation to classical multidimensional scaling.
  // Computes two-dimensional coordinates
  // for a given rectangular distance matrix.
  static LandmarkClassicalScaling(d: number[][], t: {x: number[]; y: number[]}, pivotArray: number[]) {
    const c = new Array<number[]>(d.length)
    for (let i = 0; i < d.length; i++) {
      c[i] = new Array<number>(d.length)
      for (let j = 0; j < d.length; j++) {
        c[i][j] = d[i][pivotArray[j]]
      }
    }
    MultidimensionalScaling.SquareEntries(c)
    const mean = new Array<number>(d.length).fill(0)
    for (let i = 0; i < d.length; i++) {
      for (let j = 0; j < d.length; j++) {
        mean[i] += c[i][j]
      }
      mean[i] /= d.length
    }
    MultidimensionalScaling.DoubleCenter(c)
    MultidimensionalScaling.Multiply(c, -0.5)
    const tt = {
      u1: new Array<number>(),
      u2: new Array<number>(),
      lambda1: 0,
      lambda2: 0,
    }
    MultidimensionalScaling.SpectralDecomposition(c, tt)
    tt.lambda1 = Math.sqrt(Math.abs(tt.lambda1))
    tt.lambda2 = Math.sqrt(Math.abs(tt.lambda2))

    // place non-pivots by weighted barycenter
    t.x = new Array<number>(d[0].length).fill(0)
    t.y = new Array<number>(d[0].length).fill(0)
    for (let i = 0; i < t.x.length; i++) {
      for (let j = 0; j < c.length; j++) {
        const c = (Math.pow(d[j][i], 2) - mean[j]) / 2
        t.x[i] -= tt.u1[j] * c
        t.y[i] -= tt.u2[j] * c
      }
    }
  }
}
