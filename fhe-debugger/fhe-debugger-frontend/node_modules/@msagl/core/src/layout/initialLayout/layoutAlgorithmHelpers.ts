export class LayoutAlgorithmHelpers {
  //  Linearly interpolates a result between the minResult and the maxResult based on the location of the value between the lowerThreshold and the upperThreshold.

  //  <returns>The linearly interpolated result.  Between minResult and maxResult, inclusive.</returns>
  static LinearInterpolation(value: number, lowerThreshold: number, upperThreshold: number, minResult: number, maxResult: number): number {
    if (value < lowerThreshold) {
      return minResult
    }

    if (value > upperThreshold) {
      return maxResult
    }

    const fraction: number = (value - lowerThreshold) / <number>(upperThreshold - lowerThreshold)
    return minResult + <number>(fraction * (maxResult - minResult))
  }

  //  Negatively linearly interpolates a result between the minResult and the maxResult based on the location of the value between the lowerThreshold and the upperThreshold.

  //  <returns>The linearly interpolated result.  Between minResult and maxResult, inclusive.</returns>
  static NegativeLinearInterpolation(
    value: number,
    lowerThreshold: number,
    upperThreshold: number,
    minResult: number,
    maxResult: number,
  ): number {
    if (value < lowerThreshold) {
      return maxResult
    }

    if (value > upperThreshold) {
      return minResult
    }

    const fraction: number = (value - lowerThreshold) / <number>(upperThreshold - lowerThreshold)
    return minResult + <number>((1 - fraction) * (maxResult - minResult))
  }
}
