import {BundlingSettings, BundlingSettingsJSON} from './BundlingSettings'
import {EdgeRoutingMode} from './EdgeRoutingMode'

export type EdgeRoutingSettingsJSON = {
  edgeRoutingMode?: EdgeRoutingMode

  coneAngle?: number

  // Amount of space to leave around nodes
  padding?: number

  polylinePadding?: number

  // the settings for general edge bundling
  bundlingSettingsJSON?: BundlingSettingsJSON

  routingToParentConeAngle?: number

  simpleSelfLoopsForParentEdgesThreshold?: number

  incrementalRoutingThreshold?: number

  routeMultiEdgesAsBundles?: boolean

  // if set to true the original spline is kept under the corresponding GeomEdge
  KeepOriginalSpline?: boolean
}

export class EdgeRoutingSettings {
  toJSON(): EdgeRoutingSettingsJSON {
    const ret: EdgeRoutingSettingsJSON = {}
    if (this.EdgeRoutingMode != EdgeRoutingMode.Spline) ret.edgeRoutingMode = EdgeRoutingMode.Spline
    if (this.ConeAngle != 30 * (Math.PI / 180)) ret.coneAngle = this.ConeAngle
    if (this.padding != 3) ret.padding = this.padding
    if (this.polylinePadding != 1.5) ret.polylinePadding = this.polylinePadding
    if (this.bundlingSettings) ret.bundlingSettingsJSON = this.bundlingSettings.toJSON()

    return ret
  }
  static fromJSON(source: EdgeRoutingSettingsJSON): EdgeRoutingSettings {
    const ret = new EdgeRoutingSettings()
    if (source.edgeRoutingMode) source.edgeRoutingMode = ret.edgeRoutingMode

    if (source.coneAngle) ret.coneAngle = source.coneAngle

    // Amount of space to leave around nodes
    if (source.padding) ret.padding = source.padding

    if (source.polylinePadding) ret.polylinePadding = source.polylinePadding

    // the settings for general edge bundling
    if (source.bundlingSettingsJSON) ret.bundlingSettings = BundlingSettings.createFromJSON(source.bundlingSettingsJSON)

    if (source.routingToParentConeAngle) ret.routingToParentConeAngle = source.routingToParentConeAngle

    if (source.simpleSelfLoopsForParentEdgesThreshold)
      ret.simpleSelfLoopsForParentEdgesThreshold = source.simpleSelfLoopsForParentEdgesThreshold

    if (source.incrementalRoutingThreshold) ret.incrementalRoutingThreshold = source.incrementalRoutingThreshold

    if (source.routeMultiEdgesAsBundles) ret.routeMultiEdgesAsBundles = source.routeMultiEdgesAsBundles

    // if set to true the original spline is kept under the corresponding GeomEdge
    if (source.KeepOriginalSpline) ret.KeepOriginalSpline = source.KeepOriginalSpline
    return ret
  }
  constructor() {
    this.EdgeRoutingMode = EdgeRoutingMode.Spline
  }
  private edgeRoutingMode: EdgeRoutingMode // = EdgeRoutingMode.SugiyamaSplines

  // defines the way edges are routed
  public get EdgeRoutingMode(): EdgeRoutingMode {
    return this.edgeRoutingMode
  }
  public set EdgeRoutingMode(value: EdgeRoutingMode) {
    if (value === EdgeRoutingMode.SplineBundling && this.bundlingSettings == null) {
      if (this.bundlingSettings == null) {
        this.bundlingSettings = new BundlingSettings()
      }
    }
    this.edgeRoutingMode = value
  }

  coneAngle = 30 * (Math.PI / 180)

  // the angle in degrees of the cones in the routing with the spanner
  public get ConeAngle(): number {
    return this.coneAngle
  }
  public set ConeAngle(value: number) {
    this.coneAngle = value
  }

  // Amount of space to leave around nodes
  padding = 2

  // Amount of space to leave around nodes
  public get Padding(): number {
    return this.padding
  }
  public set Padding(value: number) {
    this.padding = value
  }

  polylinePadding = 1

  // Additional amount of padding to leave around nodes when routing with polylines
  public get PolylinePadding(): number {
    return this.polylinePadding
  }
  public set PolylinePadding(value: number) {
    this.polylinePadding = value
  }

  // the settings for general edge bundling
  bundlingSettings: BundlingSettings

  routingToParentConeAngle: number = Math.PI / 6

  // this is a cone angle to find a relatively close point on the parent boundary
  public get RoutingToParentConeAngle(): number {
    return this.routingToParentConeAngle
  }
  public set RoutingToParentConeAngle(value: number) {
    this.routingToParentConeAngle = value
  }

  simpleSelfLoopsForParentEdgesThreshold = 200

  // if the number of the nodes participating in the routing of the parent edges is less than the threshold
  // then the parent edges are routed avoiding the nodes
  public get SimpleSelfLoopsForParentEdgesThreshold(): number {
    return this.simpleSelfLoopsForParentEdgesThreshold
  }
  public set SimpleSelfLoopsForParentEdgesThreshold(value: number) {
    this.simpleSelfLoopsForParentEdgesThreshold = value
  }

  incrementalRoutingThreshold = 5000000

  // debugging
  routeMultiEdgesAsBundles = true

  // defines the size of the changed graph that could be routed fast with the standard spline routing when dragging
  public get IncrementalRoutingThreshold(): number {
    return this.incrementalRoutingThreshold
  }
  public set IncrementalRoutingThreshold(value: number) {
    this.incrementalRoutingThreshold = value
  }

  // if set to true the original spline is kept under the corresponding GeomEdge
  KeepOriginalSpline = false

  // if set to true routes multi edges as ordered bundles, when routing in a spline mode
  // <exception cref="NotImplementedException"></exception>
  public get RouteMultiEdgesAsBundles(): boolean {
    return this.routeMultiEdgesAsBundles
  }
  public set RouteMultiEdgesAsBundles(value: boolean) {
    this.routeMultiEdgesAsBundles = value
  }
}
