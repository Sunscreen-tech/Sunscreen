import {GeomEdge} from '../layout/core/geomEdge'

export type BundlingSettingsJSON = {
  capacityOverflowCoefficient?: number
  RotateBundles?: boolean
  MaxHubRadius?: number
  MinHubRadius?: number
  CreateUnderlyingPolyline?: boolean
  pathLengthImportance?: number
  inkImportance?: number
  edgeSeparation?: number
  _edgeWidthShrinkCoeff?: number
  useCubicBezierSegmentsInsideOfHubs?: boolean
  angleThreshold?: number
  hubRepulsionImportance?: number
  bundleRepulsionImportance?: number
  minimalRatioOfGoodCdtEdges?: number
  highestQuality?: boolean
  KeepOverlaps?: boolean
  StopAfterShortestPaths?: boolean
}
export class BundlingSettings {
  toJSON(): BundlingSettingsJSON {
    const ret: BundlingSettingsJSON = {}
    if (this.capacityOverflowCoefficient != BundlingSettings.DefaultCapacityOverflowCoefficientMultiplier)
      ret.capacityOverflowCoefficient = this.capacityOverflowCoefficient
    if (this.RotateBundles) ret.RotateBundles = this.RotateBundles
    if (this.MaxHubRadius != 50) ret.MaxHubRadius = this.MaxHubRadius
    if (this.MinHubRadius != 0.1) ret.MinHubRadius = this.MinHubRadius
    if (this.CreateUnderlyingPolyline) ret.CreateUnderlyingPolyline = this.CreateUnderlyingPolyline
    if (this.pathLengthImportance != BundlingSettings.DefaultPathLengthImportance) ret.pathLengthImportance = this.pathLengthImportance
    if (this.inkImportance != BundlingSettings.DefaultInkImportance) ret.inkImportance = this.inkImportance
    if (this.edgeSeparation != BundlingSettings.DefaultEdgeSeparation) ret.edgeSeparation = this.edgeSeparation
    if (this._edgeWidthShrinkCoeff != 1) ret._edgeWidthShrinkCoeff = this._edgeWidthShrinkCoeff
    if (this.useCubicBezierSegmentsInsideOfHubs) ret.useCubicBezierSegmentsInsideOfHubs = this.useCubicBezierSegmentsInsideOfHubs
    if (this.angleThreshold != (Math.PI / 180) * 45) ret.angleThreshold = this.angleThreshold
    if (this.hubRepulsionImportance != 100) ret.hubRepulsionImportance = this.hubRepulsionImportance
    if (this.bundleRepulsionImportance != 100) ret.bundleRepulsionImportance = this.bundleRepulsionImportance
    if (this.minimalRatioOfGoodCdtEdges != 0.9) ret.minimalRatioOfGoodCdtEdges = this.minimalRatioOfGoodCdtEdges
    if (!this.highestQuality) ret.highestQuality = this.highestQuality
    if (this.KeepOverlaps) ret.KeepOverlaps = this.KeepOverlaps
    if (this.StopAfterShortestPaths) ret.StopAfterShortestPaths = this.StopAfterShortestPaths

    return ret
  }
  static createFromJSON(s: BundlingSettingsJSON): BundlingSettings {
    const r = new BundlingSettings()
    if (s.capacityOverflowCoefficient) r.capacityOverflowCoefficient = s.capacityOverflowCoefficient
    if (s.RotateBundles) r.RotateBundles = s.RotateBundles
    if (s.MaxHubRadius) r.MaxHubRadius = s.MaxHubRadius
    if (s.MinHubRadius) r.MinHubRadius = s.MinHubRadius
    if (s.CreateUnderlyingPolyline) r.CreateUnderlyingPolyline = s.CreateUnderlyingPolyline
    if (s.pathLengthImportance) r.pathLengthImportance = s.pathLengthImportance
    if (s.inkImportance) r.inkImportance = s.inkImportance
    if (s.edgeSeparation) r.edgeSeparation = s.edgeSeparation
    if (s._edgeWidthShrinkCoeff) r._edgeWidthShrinkCoeff = s._edgeWidthShrinkCoeff
    if (s.useCubicBezierSegmentsInsideOfHubs) r.useCubicBezierSegmentsInsideOfHubs = s.useCubicBezierSegmentsInsideOfHubs
    if (s.angleThreshold) r.angleThreshold = s.angleThreshold
    if (s.hubRepulsionImportance) r.hubRepulsionImportance = s.hubRepulsionImportance
    if (s.bundleRepulsionImportance) r.bundleRepulsionImportance = s.bundleRepulsionImportance
    if (s.minimalRatioOfGoodCdtEdges) r.minimalRatioOfGoodCdtEdges = s.minimalRatioOfGoodCdtEdges
    if (s.highestQuality) r.HighestQuality = s.highestQuality
    if (s.KeepOverlaps) r.KeepOverlaps = s.KeepOverlaps
    if (s.StopAfterShortestPaths) r.StopAfterShortestPaths = s.StopAfterShortestPaths
    return r
  }
  // the default value of CapacityOverflowCoefficient
  public static DefaultCapacityOverflowCoefficientMultiplier = 1000

  capacityOverflowCoefficient: number = BundlingSettings.DefaultCapacityOverflowCoefficientMultiplier
  RotateBundles = false

  // this number is muliplied by the overflow penalty cost and by the sum of the LengthImportanceCoefficient
  // and InkImportanceCoefficient, and added to the routing price

  public get CapacityOverflowCoefficient(): number {
    return this.capacityOverflowCoefficient
  }
  public set CapacityOverflowCoefficient(value: number) {
    this.capacityOverflowCoefficient = value
  }

  // the upper bound of the virtual node radius
  MaxHubRadius = 50

  // the lower bound of the virtual node radius
  MinHubRadius = 0.1

  CreateUnderlyingPolyline = false

  // the default path lenght importance coefficient
  public static DefaultPathLengthImportance = 500

  pathLengthImportance: number = BundlingSettings.DefaultPathLengthImportance

  // the importance of path lengths coefficient
  public get PathLengthImportance(): number {
    return this.pathLengthImportance
  }
  public set PathLengthImportance(value: number) {
    this.pathLengthImportance = value
  }

  // the default ink importance
  public static DefaultInkImportance = 0.01

  inkImportance: number = BundlingSettings.DefaultInkImportance

  public get InkImportance(): number {
    return this.inkImportance
  }
  public set InkImportance(value: number) {
    this.inkImportance = value
  }

  edgeSeparation: number = BundlingSettings.DefaultEdgeSeparation

  /** default edge separation */
  public static DefaultEdgeSeparation = 0.5

  /** Separation between the neighbor edges within a bundle */
  public get EdgeSeparation(): number {
    return this.edgeSeparation
  }

  public set EdgeSeparation(value: number) {
    this.edgeSeparation = value
  }

  /** this could be different from bundlingSetting.EdgeSeparation
   *    and could be a negative number
   */
  private _edgeWidthShrinkCoeff = 1
  public get edgeWidthShrinkCoeff() {
    return this._edgeWidthShrinkCoeff
  }
  public set edgeWidthShrinkCoeff(value) {
    this._edgeWidthShrinkCoeff = value
  }
  public ActualEdgeWidth(e: GeomEdge, coeff = this.edgeWidthShrinkCoeff): number {
    return coeff * (this.edgeSeparation + e.lineWidth)
  }

  useCubicBezierSegmentsInsideOfHubs = false

  // if is set to true will be using Cubic Bezie Segments inside of hubs, otherwise will be using Biarcs
  public get UseCubicBezierSegmentsInsideOfHubs(): boolean {
    return this.useCubicBezierSegmentsInsideOfHubs
  }
  public set UseCubicBezierSegmentsInsideOfHubs(value: boolean) {
    this.useCubicBezierSegmentsInsideOfHubs = value
  }

  angleThreshold: number = (Math.PI / 180) * 45

  // 45 degrees;
  // min angle for gluing edges
  public get AngleThreshold(): number {
    return this.angleThreshold
  }
  public set AngleThreshold(value: number) {
    this.angleThreshold = value
  }

  hubRepulsionImportance = 100

  // the importance of hub repulsion coefficient
  public get HubRepulsionImportance(): number {
    return this.hubRepulsionImportance
  }
  public set HubRepulsionImportance(value: number) {
    this.hubRepulsionImportance = value
  }

  bundleRepulsionImportance = 100

  // the importance of bundle repulsion coefficient
  public get BundleRepulsionImportance(): number {
    return this.bundleRepulsionImportance
  }
  public set BundleRepulsionImportance(value: number) {
    this.bundleRepulsionImportance = value
  }

  minimalRatioOfGoodCdtEdges = 0.9

  // minimal ration of cdt edges with satisfied capacity needed to perform bundling
  // (otherwise bundling will not be executed)
  public get MinimalRatioOfGoodCdtEdges(): number {
    return this.minimalRatioOfGoodCdtEdges
  }
  public set MinimalRatioOfGoodCdtEdges(value: number) {
    this.minimalRatioOfGoodCdtEdges = value
  }

  highestQuality = true

  // speed vs quality of the drawing
  public get HighestQuality(): boolean {
    return this.highestQuality
  }
  public set HighestQuality(value: boolean) {
    this.highestQuality = value
  }

  // if set to true then the edges will be routed one on top of each other with no gap inside of a bundle
  KeepOverlaps = false

  // calculates the routes that just follow the visibility graph
  StopAfterShortestPaths = false
}
