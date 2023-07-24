// An instance of Qpsc drives the gradient-projection portion of the Projection Solver.
import {number} from 'yargs'

import {Parameters} from './Parameters'
import {Variable} from './Variable'
// Store original weight to be restored when done.  With the ability to re-Solve() after
// updating constraint gaps, we must restore DesiredPos as well.
export class QpscVar {
  Variable: Variable

  OrigWeight: number

  OrigScale: number

  OrigDesiredPos: number

  constructor(v: Variable) {
    this.Variable = v
    this.OrigWeight = v.Weight
    this.OrigScale = v.Scale
    this.OrigDesiredPos = this.Variable.DesiredPos
  }
}

class MatrixCell {
  // Initially the summed weights of all variables to which this variable has a relationship
  // (including self as described above for the diagonal), then modified with scale.
  Value: number

  // The index of the variable j for this column in the i row (may be same as i).
  Column: number

  constructor(w: number, index: number) {
    this.Value = w
    this.Column = index
  }
}

export class Qpsc {
  private solverParameters: Parameters

  //
  // This class tracks closely to the Ipsep_Cola paper's ,IPSep-CoLa: An Incremental Procedure for
  // Separation Constraint Layout of Graphs, solve_QPSC function, outside of
  // the SplitBlocks() and Project() operations.  The relevant data are extracted from the
  // Variables of the solver and placed within the mxA (Hessian A) matrix and vecWiDi (b)
  // vector on initialization, and then the vecPrevX (x-hat), vecCurX (x-bar), and vecDeltaX
  // (d) vectors are filled and the normal matrix operations proceed as in the paper.
  //
  // From the Ipsep paper: Qpsc solves a system with a goal function that includes minimization of
  // distance between pairs of neighbors as well as minimization of distances necessary
  // to satisfy separation constraints.  I.e., our goal function is:
  //     f(X) = Sum(i < n) w_i (x_i - a_i)^2
  //          + Sum(i,j in Edge list) w_ij (x_i - x_j)^2
  // Where
  //     X is the vector of CURRENT axis positions (x_i)
  //     a_i is the desired position for each x_i (called d in the paper)
  //     w_ij is the weight of each edge between i and j (possibly multiple edges between
  //          the same i/j pair)
  // Now we can write f(x) = x'Ax.
  // The gradient g at X is computed:
  //     g = Ax+b
  // where b is the negative of the vector (so it becomes Ax-b)
  //     [w_0*d_0 ... w_n-1*d_n-1]
  // and the optimal stepsize to reduce f in the direction d is:
  //     alpha = d'g / (g'Ag)
  // In order to compute any of these efficiently we need an expression for the i'th
  // term of the product of our sparse symmetric square matrix A and a vector v.
  // Now the i'th term of Av is the inner product of row i of A and the vector v,
  // i.e. A[i] is the row vector:
  //     Av[i] = A[i] * v = A[i][0]*v[0] + A[i][1]*v[1] + ... +A[i][n-1]*v[n-1]
  // So what are A[i][0]...A[i][n-1]?
  //     First the diagonal entries: A[i][i] = wi + Sum(wij for every neighbor j of i).
  //     Then the off diagonal entries: A[i][j] = -Sum(wij for each time j is a neighbor of i).
  //     And all A[i][k] where there is no neighbor relation between i and k is 0.
  //     Then, because this is the partial derivative wrt x, each cell is multiplied by 2.
  // Thus for the small example of 3 variables i, j, and k, with neighbors ij and ik,
  // the A matrix is (where w is the weight of the variable or neighbor pair):
  //             i               j              k
  //       +-----------------------------------------
  //     i | 2(wi+wij+wik)      -2wij          -2wik
  //     j |   -2wij          2(wj+wij)          0
  //     k |   -2wik             0           2(wk+wik)
  //
  // Because A is sparse, each row is represented as an array of the A[i][0..n] entries
  // that are nonzero.
  // The foregoing was updated to the Diagonal scaling paper:
  //      Constrained Stress Majorization Using Diagonally Scaled Gradient Projection.pdf
  // which is also checked into the project.  The implementation here is somewhat modified from it:
  //
  //      We store the offset o[i] in the variable.
  //      The position for a variable i in a block B is:
  //          y[i] = (S[B] * Y[B] + o[i])/s[i]
  //
  //      Then the df/dv[i] is:
  //          df/dv[i] = 2 * w[i] * ( y[i] - d[i] );
  //
  //      And comp_dfdv(i , AC, ~c) is a bit different too:
  //          Dfdv = df/dv[i]
  //          For each c in AC s.t. i=lv[c] and c!== ~c:
  //              Lambda[c] = comp_dfdv(rv[c], AC, c)
  //              dfdv += Lambda[c] * s[lv[c]]
  //          For each c in AC s.t. i=rv[c] and c!== ~c:
  //              Lambda[c] = comp_dfdv(lv[c], AC, c)
  //              dfdv -= Lambda[c] * s[rv[c]]
  //
  //      The statistics for the blocks are calculated as follows:
  //          For each variable i we have:
  //                a[i] = S[B] / s[i]
  //                b[i] = o[i] / s[i]
  //      Then:
  //          AD[B] = sum over i=0..n:  a[i] * d[i] * w[i]
  //          AB[B] = sum over i=0..n:  a[i] * b[i] * w[i]
  //          A2[B] = sum over i=0..n:  a[i] * a[i] * w[i]
  //      And the ideal position calculation for the block is then the same as the paper:
  //          Y[B] = (AD[B] - AB[B])/A2[B]
  // A MatrixCell implements A[i][j] as above.

  //
  // SolveQpsc static data members:  These do not change after initialization.
  // The matrix is sparse in columns for each row, but not in rows, because there is always
  // at least one entry per row, the diagonal.
  //
  private matrixQ: MatrixCell[][]

  // Sparse matrix A in the Ipsep paper; matrix Q (modified to Q') in the Scaling paper
  private vectorWiDi: number[]

  // b (weight * desiredpos) in the Ipsep paper; modified to b' = Sb from the Scaling paper
  private vectorQpscVars: QpscVar[]

  // Array of variables, for perf (avoid nested block/variable Array<> iteration)
  private newMatrixRow: Array<MatrixCell> = new Array<MatrixCell>()

  // current row in AddVariable
  //
  // SolveQpsc per-iteration data members:  These change with each iteration.
  //
  private gradientVector: number[]

  // g in the paper
  private vectorQg: number[]

  // Qg in the paper
  private vectorPrevY: number[]

  // y-hat in the paper
  private vectorCurY: number[]

  // y-bar in the paper
  private isFirstProjectCall: boolean

  // If true we're on our first call to Project
  // Holds the value of f(x) = yQ'y + b'y as computed on the last iteration; used to test for
  // convergence and updated before HasConverged() returns.
  private previousFunctionValue: number = Number.MAX_VALUE

  constructor(solverParameters: Parameters, cVariables: number) {
    this.solverParameters = solverParameters
    this.matrixQ = new Array(cVariables).fill(0)
    this.vectorWiDi = new Array(cVariables).fill(0)
    this.vectorQpscVars = new Array(cVariables).fill(0)
    this.gradientVector = new Array(cVariables).fill(0)
    this.vectorQg = new Array(cVariables).fill(0)
    this.vectorPrevY = new Array(cVariables).fill(0)
    this.vectorCurY = new Array(cVariables).fill(0)
  }

  //
  // solver.SolveQpsc drives the Qpsc instance as follows:
  // Initialization:
  //    Qpsc qpsc = new Qpsc(numVariables);
  //    foreach (variable in (foreach block))
  //       qpsc.AddVariable(variable)
  //    qpsc.VariablesComplete()
  // Per iteration:
  //    if (!qpsc.PreProject()) break;
  //    solver.SplitBlocks()
  //    solver.Project()
  //    if (!qpsc.PostProject()) break;
  // Done:
  //    qpsc.ProjectComplete()
  AddVariable(variable: Variable) {
    /*Assert.assert(
      this.matrixQ[variable.Ordinal] == null  &&
        this.vectorQpscVars[variable.Ordinal].Variable == null ,
      'variable.Ordinal already exists',
    )*/
    this.isFirstProjectCall = true
    // This is the weight times desired position, multiplied by 2.0 per the partial derivative.
    // We'll use this to keep as close as possible to the desired position on each iteration.
    this.vectorWiDi[variable.Ordinal] = 2 * (variable.Weight * variable.DesiredPos) * -1
    // Temporarily hijack vectorPrevY for use as scratch storage, to handle duplicate
    // neighbor pairs (take the highest weight).
    // Sum the weight for cell i,i (the diagonal).
    this.vectorPrevY[variable.Ordinal] = variable.Weight
    if (null != variable.Neighbors) {
      for (const neighborWeightPair of variable.Neighbors) {
        // We should already have verified this in AddNeighbourPair.
        /*Assert.assert(
          neighborWeightPair.Neighbor.Ordinal !== variable.Ordinal,
          'self-neighbors are not allowed',
        )*/
        // For the neighbor KeyValuePairs, Key === neighboring variable and Value === relationship
        // weight.  If we've already encountered this pair then we'll sum the relationship weights, under
        // the assumption the caller will be doing something like creating edges for different reasons,
        // and multiple edges should be like rubber bands, the sum of the strengths.  Mathematica also
        // sums duplicate weights.
        // Per above comments:
        //     First the diagonal entries: A[i][i] = wi + Sum(wij for every neighbor j of i).
        this.vectorPrevY[variable.Ordinal] = this.vectorPrevY[variable.Ordinal] + neighborWeightPair.Weight
        //     Then the off diagonal entries: A[i][j] = -Sum(wij for time j is a neighbor of i).
        this.vectorPrevY[neighborWeightPair.Neighbor.Ordinal] =
          this.vectorPrevY[neighborWeightPair.Neighbor.Ordinal] - neighborWeightPair.Weight
      }
    }

    // endif null !=  variable.Neighbors
    // Add the sparse row to the matrix (all non-zero slots of vectorPrevY are weights to that neighbor).
    for (let ii = 0; ii < this.vectorPrevY.length; ii++) {
      if (0 !== this.vectorPrevY[ii]) {
        // The diagonal must be > 0 and off-diagonal < 0.
        /*Assert.assert(
          (ii === variable.Ordinal) === this.vectorPrevY[ii] > 0,
          'Diagonal must be > 0.0',
        )*/
        // All 'A' cells must be 2*(summed weights).
        this.newMatrixRow.push(new MatrixCell(this.vectorPrevY[ii] * 2, ii))
        this.vectorPrevY[ii] = 0
      }
    }

    this.matrixQ[variable.Ordinal] = Array.from(this.newMatrixRow)
    this.newMatrixRow = []
    this.vectorQpscVars[variable.Ordinal] = new QpscVar(variable)
    // For the non-Qpsc loop, we consider weights in block reference-position calculation.
    // Here, we have that in vectorWiDi which we use in calculating gradient and alpha, which
    // in turn we use to set the gradient-stepped desiredPos.  So turn it off for the duration
    // of Qpsc - we restore it in QpscComplete().
    variable.Weight = 1
  }

  // end AddVariable()
  VariablesComplete() {
    for (const qvar of this.vectorQpscVars) {
      const variable = qvar.Variable
      for (const cell of this.matrixQ[variable.Ordinal]) {
        if (cell.Column === variable.Ordinal) {
          if (this.solverParameters.Advanced.ScaleInQpsc) {
            variable.Scale = 1 / Math.sqrt(Math.abs(cell.Value))
            if (!Number.isFinite(variable.Scale)) {
              variable.Scale = 1
            }

            // This is the y = Sx step from the Scaling paper.
            variable.Scale
            // This is the b' <- Sb step from the Scaling paper
            this.vectorWiDi[variable.Ordinal] = this.vectorWiDi[variable.Ordinal] * variable.Scale
          }

          // This is needed for block re-initialization.
          this.vectorCurY[variable.Ordinal] = variable.ActualPos
          variable.DesiredPos = variable.ActualPos
        }
      }
    }

    if (!this.solverParameters.Advanced.ScaleInQpsc) {
      return
    }

    // Now convert mxQ to its scaled form S#QS (noting that the transform of a diagonal matrix S is S
    // so this is optimized), and we've made the S matrix such that Q[i][i] is 1.  The result is in-place
    // conversion of Q to scaledQ s.t.
    //   for all ii
    //      for all jj
    //         if ii === jj, scaledQ[ii][jj] = 1
    //         else         scaledQ[ii][jj] = Q[ii][jj] * var[ii].scale * var[jj].scale
    // /
    for (let rowNum = 0; rowNum < this.matrixQ.length; rowNum++) {
      const row = this.matrixQ[rowNum]
      for (let sparseCol = 0; sparseCol < row.length; sparseCol++) {
        if (row[sparseCol].Column === rowNum) {
          row[sparseCol].Value = 1
        } else {
          // Diagonal on left scales rows [SQ], on right scales columns [QS].
          row[sparseCol].Value =
            row[sparseCol].Value * (this.vectorQpscVars[rowNum].Variable.Scale * this.vectorQpscVars[row[sparseCol].Column].Variable.Scale)
        }
      }
    }
  }

  // end VariablesComplete()
  // Called by SolveQpsc before the split/project phase.  Returns false if the difference in the
  // function value on the current vs. previous iteration is sufficiently small that we're done.
  // @@PERF: Right now this is distinct matrix/vector operations.  Profiling shows most time
  // in Qpsc is taken by MatrixVectorMultiply.  We could gain a bit of performance by combining
  // some things but keep it simple unless that's needed.
  PreProject(): boolean {
    if (this.isFirstProjectCall) {
      // Due to MergeEqualityConstraints we may have moved some of the variables.  This won't
      // affect feasibility since QpscMakeFeasible would already have ensured that any unsatisfiable
      // constraints are so marked.
      for (const qvar of this.vectorQpscVars) {
        this.vectorCurY[qvar.Variable.Ordinal] = qvar.Variable.ActualPos
      }
    }

    //
    // Compute: g = Q'y + b' (in the Scaling paper terminology)
    //
    // g(radient) = Q'y...
    this.MatrixVectorMultiply(this.vectorCurY, this.gradientVector)
    // If we've minimized the goal function (far enough), we're done.
    // This uses the Q'y value we've just put into gradientVector and tests the goal-function value
    // to see if it is sufficiently close to the previous value to be considered converged.
    if (this.HasConverged()) {
      return false
    }

    // ...g = Q'y + b'
    Qpsc.VectorVectorAdd(this.gradientVector, this.vectorWiDi, this.gradientVector)
    //
    // Compute: alpha = g#g / g#Q'g  (# === transpose)
    //
    const alphaNumerator: number = Qpsc.VectorVectorMultiply(this.gradientVector, this.gradientVector)
    // Compute numerator of stepsize
    let alphaDenominator = 0
    if (0 !== alphaNumerator) {
      this.MatrixVectorMultiply(this.gradientVector, this.vectorQg)
      alphaDenominator = Qpsc.VectorVectorMultiply(this.vectorQg, this.gradientVector)
    }

    if (0 === alphaDenominator) {
      return false
    }

    const alpha: number = alphaNumerator / alphaDenominator
    //
    // Store off the current position as the previous position (the paper's y^ (y-hat)),
    // then calculate the new current position by subtracting the (gradient * alpha)
    // from it and update the Variables' desired position.
    //
    Qpsc.VectorCopy(this.vectorPrevY, this.vectorCurY)
    // Update d(esiredpos) = y - alpha*g
    // Use vectorCurY as temp as it is not used again here and is updated at start of PostProject.
    Qpsc.VectorScaledVectorSubtract(this.vectorPrevY, alpha, this.gradientVector, this.vectorCurY)
    for (let ii = 0; ii < this.vectorCurY.length; ii++) {
      this.vectorQpscVars[ii].Variable.DesiredPos = this.vectorCurY[ii]
    }

    return true
  }

  // end PreProject()
  // Called by SolveQpsc after the split/project phase.
  PostProject(): boolean {
    //
    // Update our copy of current positions (y-bar from the paper) and deltaY (p in the Scaling paper; y-bar minus y-hat).
    //
    for (const qvar of this.vectorQpscVars) {
      this.vectorCurY[qvar.Variable.Ordinal] = qvar.Variable.ActualPos
    }

    // vectorCurY temporarily becomes the p-vector from the Scaling paper since we don't use the "current"
    // position otherwise, until we reset it at the end.
    Qpsc.VectorVectorSubtract(this.vectorPrevY, this.vectorCurY, this.vectorCurY)
    //
    // Compute: Beta = min(g#p / p#Qp, 1)
    //
    const betaNumerator: number = Qpsc.VectorVectorMultiply(this.gradientVector, this.vectorCurY)
    // Compute numerator of stepsize
    let beta = 0
    if (0 !== betaNumerator) {
      // Calculate Qp first (matrix ops are associative so (AB)C === A(BC), so calculate the rhs first
      // with MatrixVectorMultiply).  Temporarily hijack vectorQg for this operation.
      this.MatrixVectorMultiply(this.vectorCurY, this.vectorQg)
      // Now p#(Qp).
      const betaDenominator: number = Qpsc.VectorVectorMultiply(this.vectorQg, this.vectorCurY)
      // Dividing by almost-0 would yield a huge value which we'd cap at 1.0 below.
      beta = 0 === betaDenominator ? 1 : betaNumerator / betaDenominator
      if (beta > 1) {
        // Note:  With huge ranges, beta is >>1 here - like 50 or millions.  This is expected as
        // we're dividing by p#Qp where p is potentially quite small.
        beta = 1
      } else if (beta < 0) {
        // Setting it above 0.0 can move us away from convergence, so set it to 0.0 which leaves
        // vectorCurY unchanged from vectorPrevY and we'll terminate if there are no splits/violations.
        // If we were close to convergence in preProject, we could have a significantly negative
        // beta here, which means we're basically done unless split/project still have stuff to do.
        beta = 0
      }
    }

    // Beta numerator is nonzero
    // Update the "Qpsc-local" copy of the current positions for use in the next loop's PreProject().
    Qpsc.VectorScaledVectorSubtract(this.vectorPrevY, beta, this.vectorCurY, this.vectorCurY)
    this.isFirstProjectCall = false
    return beta > 0
  }

  // end PostProject()
  QpscComplete(): number {
    // Restore original desired position and unscale the actual position.
    for (const qvar of this.vectorQpscVars) {
      qvar.Variable.Weight = qvar.OrigWeight
      qvar.Variable.DesiredPos = qvar.OrigDesiredPos
      if (this.solverParameters.Advanced.ScaleInQpsc) {
        // This multiplication essentially does what Constraint.Violation does, so the "satisfied" state
        // of constraints won't be changed.
        qvar.Variable.ActualPos = qvar.Variable.ActualPos * qvar.Variable.Scale
        qvar.Variable.Scale = qvar.OrigScale
      }
    }

    // This was updated to the final function value before HasConverged returned.
    return this.previousFunctionValue
  }

  private HasConverged(): boolean {
    //
    // Compute the function value relative to the previous iteration to test convergence:
    //     (x#Ax)/2 + bx + (w d).d       Note: final term is from Tim's Mathematica
    // where the last term (w d).d is constant and, because we only test decreasing value,
    // can therefore be omitted.
    //
    // We don't need to do the Ax operation as this is done as part of PreProject which has
    // already put this into gradientVector.
    //
    const currentFunctionValue: number = this.GetFunctionValue(this.vectorCurY)
    // If this is not our first PreProject call, test for convergence.
    let fConverged = false
    if (!this.isFirstProjectCall) {
      // Check for convergence.  We are monotonically decreasing so prev should be > cur
      // with some allowance for rounding error.
      const diff: number = this.previousFunctionValue - currentFunctionValue
      let quotient = 0
      if (diff !== 0) {
        const divisor = 0 !== this.previousFunctionValue ? this.previousFunctionValue : currentFunctionValue
        quotient = Math.abs(diff / divisor)
      }

      if (
        Math.abs(diff) < this.solverParameters.QpscConvergenceEpsilon ||
        Math.abs(quotient) < this.solverParameters.QpscConvergenceQuotient
      ) {
        fConverged = true
      }
    }

    // endif !isFirstProjectCall
    this.previousFunctionValue = currentFunctionValue
    return fConverged
  }

  private GetFunctionValue(positions: number[]): number {
    // (x#Ax)/2...
    const value: number = Qpsc.VectorVectorMultiply(this.gradientVector, positions) / 2
    // (x'Ax)/2 + bx...
    return value + Qpsc.VectorVectorMultiply(this.vectorWiDi, positions)
  }

  // Returns the dot product of two column vectors (with an "implicit transpose").
  private static VectorVectorMultiply(lhs: number[], rhs: number[]): number {
    // Do not use LINQ's Sum, it slows end-to-end by over 10%.
    let sum = 0
    for (let ii = 0; ii < lhs.length; ii++) {
      sum = sum + lhs[ii] * rhs[ii]
    }

    return sum
  }

  // Multiplies matrixQ with the column vector rhs leaving the result in column vector in result[].
  private MatrixVectorMultiply(rhs: number[], result: number[]) {
    // The only matrix we have here is (sparse) matrixQ so it's not a parameter.
    let rowIndex = 0
    for (const row of this.matrixQ) {
      // Do not use LINQ's Sum, it slows end-to-end by over 10%.
      let sum = 0
      for (const cell of row) {
        sum = sum + cell.Value * rhs[cell.Column]
      }

      result[rowIndex++] = sum
    }
  }

  // Returns the addition result in result[] (which may be lhs or rhs or a different vector).
  private static VectorVectorAdd(lhs: number[], rhs: number[], result: number[]) {
    for (let ii = 0; ii < lhs.length; ii++) {
      result[ii] = lhs[ii] + rhs[ii]
    }
  }

  // Returns the subtraction result in result[] (which may be lhs or rhs or a different vector).
  private static VectorVectorSubtract(lhs: number[], rhs: number[], result: number[]) {
    for (let ii = 0; ii < lhs.length; ii++) {
      result[ii] = lhs[ii] - rhs[ii]
    }
  }

  // Same as VectorVectorSubtract except that rhs is multiplied by the scale value.
  private static VectorScaledVectorSubtract(lhs: number[], scale: number, rhs: number[], result: number[]) {
    for (let ii = 0; ii < lhs.length; ii++) {
      result[ii] = lhs[ii] - scale * rhs[ii]
    }
  }

  // Copies src to dest
  private static VectorCopy(dest: number[], src: number[]) {
    for (let ii = 0; ii < src.length; ii++) {
      dest[ii] = src[ii]
    }
  }
}
