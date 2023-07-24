import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {Metroline} from './MetroLine'
import {Station} from './Station'

export class MetroNodeInfo {
  metroline: Metroline

  station: Station

  polyPoint: PolylinePoint

  constructor(metroline: Metroline, station: Station, polyPoint: PolylinePoint) {
    this.metroline = metroline
    this.station = station
    this.polyPoint = polyPoint
  }

  get Metroline(): Metroline {
    return this.metroline
  }

  get PolyPoint(): PolylinePoint {
    return this.polyPoint
  }
}
