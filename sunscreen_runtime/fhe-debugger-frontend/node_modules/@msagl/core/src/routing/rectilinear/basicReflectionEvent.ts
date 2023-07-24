import {Point} from '../../math/geometry/point'
import {SweepEvent} from '../spline/coneSpanner/SweepEvent'
import {Obstacle} from './obstacle'

export class BasicReflectionEvent extends SweepEvent {
  ReflectingObstacle: Obstacle

  InitialObstacle: Obstacle

  PreviousSite: BasicReflectionEvent

  // Called by StoreLookaheadSite only.
  constructor(initialObstacle: Obstacle, reflectingObstacle: Obstacle, site: Point) {
    super()
    this.InitialObstacle = initialObstacle
    this.ReflectingObstacle = reflectingObstacle
    this.site = site
  }

  // Called by LowReflectionEvent or HighReflectionEvent ctors, which are called out of
  // AddReflectionEvent, which in turn is called by LoadLookaheadIntersections.
  // In this case we know the eventObstacle and initialObstacle are the same obstacle (the
  // one that the reflected ray bounced off of, to generate the Left/HighReflectionEvent).
  static mk(previousSite: BasicReflectionEvent, reflectingObstacle: Obstacle, site: Point) {
    const ret = new BasicReflectionEvent(previousSite.ReflectingObstacle, reflectingObstacle, site)
    ret.PreviousSite = previousSite
    return ret
  }

  // If true, we have a staircase situation.
  IsStaircaseStep(reflectionTarget: Obstacle): boolean {
    return this.InitialObstacle === reflectionTarget
  }

  private site: Point

  get Site(): Point {
    return this.site
  }
}
