// Constants used by OptimalRectanglePacking
export class PackingConstants {
  // The greeks thought the GoldenRatio was a good aspect ratio: Phi = (1 + Math.Sqrt(5)) / 2
  // <remarks>we also use this internally in our golden section search</remarks>
  static GoldenRatio: number = (1 + Math.sqrt(5)) / 2

  // equiv to 1 - (1/Phi) where Phi is the Golden Ratio: i.e. the smaller of the two sections
  // if you divide a unit length by the golden ratio
  static GoldenRatioRemainder: number = 2 - PackingConstants.GoldenRatio
}
