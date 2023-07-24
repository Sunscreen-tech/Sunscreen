import {Point, ICurve} from '../../..'
import {Polyline} from '../../../math/geometry'

import {CdtTriangle} from '../../ConstrainedDelaunayTriangulation/CdtTriangle'
import {BundleBase} from './BundleBase'
import {MetroNodeInfo} from './MetroNodeInfo'

// (this needs to be public because it's used elsewhere in an interface implementation)

export class Station {
  constructor(serialNumber: number, isRealNode: boolean, position: Point) {
    this.SerialNumber = serialNumber
    this.IsReal = isRealNode
    this.Position = position
    // if (this.debStop()) {
    //  console.log(this)
    // }
  }

  debStop(): boolean {
    return (
      //(this.SerialNumber === 1 && this.Position.sub(new Point(706.0327200902565, 203.36018761064003)).length < 0.01) ||
      this.SerialNumber === 28 && this.Position.sub(new Point(841.2662778763244, 303.3817005853006)).length < 0.001
    )
  }

  // id of the station (used for comparison)
  SerialNumber: number

  // if true the station is a center of an obstacle
  IsReal: boolean

  // radius of the corresponding hub
  Radius = 0

  // position of the corresponding hub
  private _Position: Point
  public get Position(): Point {
    return this._Position
  }
  public set Position(value: Point) {
    this._Position = value
    // if (this.debStop()) {
    //  console.log(this)
    // }
  }

  // neighbors sorted in counter-clockwise order around the station
  Neighbors: Station[]

  // it maps each neighbor to its hub
  BundleBases: Map<Station, BundleBase> = new Map<Station, BundleBase>()

  // it maps a node to a set of tight polylines that can contain the node
  EnterableTightPolylines: Set<Polyline>

  // it maps a node to a set of loose polylines that can contain the node
  private EnterableLoosePolylines: Set<Polyline>
  getELP(): Set<Polyline> {
    return this.EnterableLoosePolylines
  }
  setELP(s: Set<Polyline>) {
    // if (this.SerialNumber === 32 && s.size > 0) {
    //  console.log(this)
    // }
    this.EnterableLoosePolylines = s
  }
  addEL(p: Polyline) {
    // if (this.SerialNumber === 32) {
    //  console.log(this)
    // }
    this.EnterableLoosePolylines.add(p)
  }

  // MetroNodeInfos corresponding to the node
  MetroNodeInfos: Array<MetroNodeInfo> = new Array<MetroNodeInfo>()

  // curve of the hub
  BoundaryCurve: ICurve

  cdtTriangle: CdtTriangle

  cachedRadiusCost: number

  cachedBundleCost: number

  private _cachedIdealRadius = 0
  public get cachedIdealRadius() {
    return this._cachedIdealRadius
  }
  public set cachedIdealRadius(value) {
    //Assert.assert(!isNaN(value))
    this._cachedIdealRadius = value
  }

  AddEnterableLoosePolyline(poly: Polyline) {
    if (this.EnterableLoosePolylines == null) {
      this.EnterableLoosePolylines = new Set<Polyline>()
    }

    this.EnterableLoosePolylines.add(poly)
  }

  AddEnterableTightPolyline(poly: Polyline) {
    if (this.EnterableTightPolylines == null) {
      this.EnterableTightPolylines = new Set<Polyline>()
    }

    this.EnterableTightPolylines.add(poly)
  }
}
