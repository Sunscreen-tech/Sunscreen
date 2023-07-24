import {Metroline} from './MetroLine'

export class PointPairOrder {
  // array of metrolines for node u of edge u->v
  Metrolines: Array<Metroline> = new Array<Metroline>()

  orderFixed: boolean

  LineIndexInOrder: Map<Metroline, number>

  Add(metroline: Metroline) {
    this.Metrolines.push(metroline)
  }
}
