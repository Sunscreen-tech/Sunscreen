import {EdgeRoutingSettings} from '../../routing/EdgeRoutingSettings'
import {CommonLayoutSettings} from '../commonLayoutSettings'
import {ILayoutSettings} from '../iLayoutSettings'
export type MdsLayoutSettingsJSON = {
  pivotNumber?: number

  iterationsWithMajorization?: number

  scaleX?: number

  scaleY?: number

  exponent?: number

  rotationAngle?: number

  removeOverlaps?: boolean

  _callIterationsWithMajorizationThreshold?: number
}
/** Settings for multi-dimensional scaling */
export class MdsLayoutSettings implements ILayoutSettings {
  static fromJSON(s: MdsLayoutSettingsJSON): MdsLayoutSettings {
    const ret = new MdsLayoutSettings()
    if (s.pivotNumber) ret.pivotNumber = s.pivotNumber

    if (s.iterationsWithMajorization) ret.iterationsWithMajorization = s.iterationsWithMajorization

    if (s.scaleX) ret.scaleX = s.scaleX

    if (s.scaleY) ret.scaleY = s.scaleY

    if (s.exponent) ret.exponent = s.exponent

    if (s.rotationAngle) ret.rotationAngle = s.rotationAngle

    if (s.removeOverlaps != undefined) ret._removeOverlaps = s.removeOverlaps

    if (s._callIterationsWithMajorizationThreshold)
      ret._callIterationsWithMajorizationThreshold = s._callIterationsWithMajorizationThreshold

    return ret
  }
  toJSON(): MdsLayoutSettingsJSON {
    const ret: MdsLayoutSettingsJSON = {}
    if (this.pivotNumber != 50) ret.pivotNumber = this.pivotNumber

    if (this.iterationsWithMajorization != 30) ret.iterationsWithMajorization = this.iterationsWithMajorization

    if (this.scaleX != 200) ret.scaleX = this.scaleX

    if (this.scaleY != 200) ret.scaleY = this.scaleY

    if (this.exponent != -2) ret.exponent = this.exponent

    if (this.rotationAngle != 0) ret.rotationAngle = this.rotationAngle

    if (!this._removeOverlaps) ret.removeOverlaps = this._removeOverlaps

    if (this._callIterationsWithMajorizationThreshold != 3000)
      ret._callIterationsWithMajorizationThreshold = this._callIterationsWithMajorizationThreshold
    return ret
  }
  get NodeSeparation() {
    return this.commonSettings.NodeSeparation
  }
  set NodeSeparation(value: number) {
    this.commonSettings.NodeSeparation = value
  }
  commonSettings = new CommonLayoutSettings()
  get edgeRoutingSettings() {
    return this.commonSettings.edgeRoutingSettings
  }
  set edgeRoutingSettings(value: EdgeRoutingSettings) {
    this.commonSettings.edgeRoutingSettings = value
  }

  // the setting of Multi-Dimensional Scaling layout

  // private double epsilon = Math.Pow(10,-8);
  private pivotNumber = 50

  private iterationsWithMajorization = 30

  private scaleX = 100

  private scaleY = 100

  private exponent = -2

  private rotationAngle = 0

  private _removeOverlaps = true

  /** do not call iterations with majorization, the local layout improvement heuristic, for graph with at least 2000 nodes */
  _callIterationsWithMajorizationThreshold = 2000

  // remove overlaps between node boundaries
  get removeOverlaps(): boolean {
    return this._removeOverlaps
  }
  set removeOverlaps(value: boolean) {
    this._removeOverlaps = value
  }

  // Number of pivots in Landmark Scaling (between 3 and number of objects).
  get PivotNumber(): number {
    return this.pivotNumber
  }
  set PivotNumber(value: number) {
    this.pivotNumber = value
  }

  /** Number of iterations in distance scaling: these iterations beautify the layout locally. This heuristic is optional , and the property has to be set to zero for a large graph, because each iteration has O(n*n) time, where n is the number of nodes in the graph */
  get IterationsWithMajorization(): number {
    return this.iterationsWithMajorization
  }
  set IterationsWithMajorization(value: number) {
    this.iterationsWithMajorization = value
  }

  // X Scaling Factor.
  get ScaleX(): number {
    return this.scaleX
  }
  set ScaleX(value: number) {
    this.scaleX = value
  }

  // Y Scaling Factor.
  get ScaleY(): number {
    return this.scaleY
  }
  set ScaleY(value: number) {
    /*Assert.assert(!isNaN(value))*/
    this.scaleY = value
  }

  // Weight matrix exponent.
  get Exponent(): number {
    return this.exponent
  }
  set Exponent(value: number) {
    this.exponent = value
  }

  // rotation angle
  get RotationAngle(): number {
    return this.rotationAngle
  }
  set RotationAngle(value: number) {
    this.rotationAngle = value % 360
  }

  adjustScale = false
  // Adjust the scale of the graph if there is not enough whitespace between nodes
  get AdjustScale(): boolean {
    return this.adjustScale
  }
  set AdjustScale(value: boolean) {
    this.adjustScale = value
  }

  GetNumberOfIterationsWithMajorization(nodeCount: number): number {
    if (nodeCount > this.CallIterationsWithMajorizationThreshold) {
      return 0
    }

    return this.IterationsWithMajorization
  }

  get CallIterationsWithMajorizationThreshold(): number {
    return this._callIterationsWithMajorizationThreshold
  }
  set CallIterationsWithMajorizationThreshold(value: number) {
    this._callIterationsWithMajorizationThreshold = value
  }
}
