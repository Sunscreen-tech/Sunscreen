import {Metroline} from './MetroLine'

export class StationEdgeInfo {
  get Count() {
    return this.Metrolines.length
  }

  Width = 0

  Metrolines: Array<Metroline> = new Array<Metroline>()

  cachedBundleCost = 0
}
