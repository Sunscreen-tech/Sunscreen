import {EdgeRoutingSettings, EdgeRoutingSettingsJSON} from '../routing/EdgeRoutingSettings'
export type CommonLayoutSettingsJSON = {
  nodeSeparation?: number
  packingAspectRatio?: number
  edgeRoutingSettings?: EdgeRoutingSettingsJSON
}

/** The common data of layout settings: it specifies the minumal allowed distance between the nodes,  the minimal size of the resulting bounding box, settings for edge routing, and the ratio for the graph boxes packing algorithm  */

export class CommonLayoutSettings {
  static fromJSON(s: CommonLayoutSettingsJSON): CommonLayoutSettings {
    const ret = new CommonLayoutSettings()
    if (s.nodeSeparation != 10) {
      ret.nodeSeparation = s.nodeSeparation
    }
    if (s.packingAspectRatio) {
      ret.packingAspectRatio = s.packingAspectRatio
    }
    if (s.edgeRoutingSettings) {
      ret.edgeRoutingSettings = EdgeRoutingSettings.fromJSON(s.edgeRoutingSettings)
    }
    return ret
  }
  toJSON(): CommonLayoutSettingsJSON {
    let differentFromDefault = false
    const ret: CommonLayoutSettingsJSON = {}
    if (this.nodeSeparation != 10) {
      ret.nodeSeparation = this.nodeSeparation
      differentFromDefault = true
    }
    if (this.packingAspectRatio != 1.5) {
      ret.packingAspectRatio = this.packingAspectRatio
      differentFromDefault = true
    }
    if ((ret.edgeRoutingSettings = this.edgeRoutingSettings.toJSON())) {
      differentFromDefault = true
    }
    return differentFromDefault ? ret : undefined
  }

  edgeRoutingSettings = new EdgeRoutingSettings()

  private nodeSeparation = 10
  public get NodeSeparation() {
    return this.nodeSeparation
  }
  public set NodeSeparation(value) {
    this.nodeSeparation = value
  }
  private packingAspectRatio = 1.5
  get PackingAspectRatio() {
    return this.packingAspectRatio
  }
  set PackingAspectRatio(value: number) {
    this.packingAspectRatio = value
  }
}
