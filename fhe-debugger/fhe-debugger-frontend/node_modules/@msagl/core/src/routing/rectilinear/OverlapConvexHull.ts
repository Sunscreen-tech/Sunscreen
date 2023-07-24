// This stores the location and type of a Port.

import {Polyline} from '../../math/geometry/polyline'
import {Obstacle} from './obstacle'

export class OverlapConvexHull {
  Polyline: Polyline

  // This is some arbitrary obstacle inside the convex hull so we qualify Select().Where() so we
  // don't get the CH duplicated in the scanline etc. enumerations.

  PrimaryObstacle: Obstacle

  Obstacles: Array<Obstacle>

  constructor(polyline: Polyline, obstacles: Iterable<Obstacle>) {
    this.Polyline = polyline
    this.Obstacles = Array.from(obstacles)
    this.PrimaryObstacle = this.Obstacles[0]
    Obstacle.RoundVerticesAndSimplify(this.Polyline)
  }
}
