import {HashSet} from '@esfx/collections'
import {Point} from '../../../math/geometry/point'
//import missing symbols
import {ICurve} from '../../../math/geometry/icurve'
import {Curve, PointLocation, LineSegment, GeomConstants, parameterSpan} from '../../../math/geometry'
import {Ellipse} from '../../../math/geometry/ellipse'
import {PolylinePoint} from '../../../math/geometry/polylinePoint'
import {closeDistEps} from '../../../utils/compare'
import {addToMapOfArrays} from '../../../utils/setOperations'
import {BundlingSettings} from '../../BundlingSettings'
import {BundleBase} from './BundleBase'
import {BundleInfo} from './BundleInfo'
import {GeneralMetroMapOrdering} from './GeneralMetroMapOrdering'
import {getOrientationOf3Vectors, MetroGraphData} from './MetroGraphData'
import {Metroline} from './MetroLine'
import {OrientedHubSegment} from './OrientedHubSegment'
import {Station} from './Station'

export class BundleBasesCalculator {
  metroOrdering: GeneralMetroMapOrdering

  metroGraphData: MetroGraphData

  bundlingSettings: BundlingSettings

  Bundles: Array<BundleInfo>

  // boundary curve with bases going outside the hub
  externalBases: Map<Station, Array<BundleBase>>

  // boundary curve with bases going inside the cluster
  internalBases: Map<Station, Array<BundleBase>>

  constructor(metroOrdering: GeneralMetroMapOrdering, metroGraphData: MetroGraphData, bundlingSettings: BundlingSettings) {
    this.metroOrdering = metroOrdering
    this.metroGraphData = metroGraphData
    this.bundlingSettings = bundlingSettings
  }

  Run() {
    // HubDebugger.ShowHubs(metroGraphData, bundlingSettings, true);
    // HubDebugger.ShowHubs(metroGraphData, bundlingSettings);
    this.AllocateBundleBases()
    this.SetBasesRightLeftParamsToTheMiddles()
    if (this.bundlingSettings.KeepOverlaps) {
      this.UpdateSourceAndTargetBases()
      this.CreateOrientedSegs()
    } else {
      this.SetRightLeftParamsFeasiblySymmetrically()
      // EdgeNudger.ShowHubs(metroGraphData, metroOrdering, null);
      // these bases can be too wide and overlap each other, so we need to adjust them
      this.AdjustStartEndParamsToAvoidBaseOverlaps()
      this.UpdateSourceAndTargetBases()
      // EdgeNudger.ShowHubs(metroGraphData, metroOrdering, null);
      this.CreateOrientedSegs()
      // EdgeNudger.ShowHubs(metroGraphData, metroOrdering, null);
      // optimization: moving bases to reduce cost
      // TimeMeasurer.DebugOutput("Initial cost of bundle bases: " + Cost());
      if (this.bundlingSettings.RotateBundles) this.RotateBundlesToDiminishCost()
      // EdgeNudger.ShowHubs(metroGraphData, metroOrdering, null);
      this.AdjustStartEndParamsToAvoidBaseOverlaps()
      this.UpdateSourceAndTargetBases()
    }

    // TimeMeasurer.DebugOutput("Optimized cost of bundle bases: " + Cost());
    //            EdgeNudger.ShowHubs(metroGraphData, metroOrdering, null);
  }

  AllocateBundleBases() {
    this.externalBases = new Map<Station, Array<BundleBase>>()
    this.internalBases = new Map<Station, Array<BundleBase>>()
    this.Bundles = new Array<BundleInfo>()
    for (const station of this.metroGraphData.Stations) {
      if (station.BoundaryCurve == null) station.BoundaryCurve = Ellipse.mkCircle(station.Radius, station.Position)
    }

    for (const station of this.metroGraphData.Stations) {
      for (const neighbor of station.Neighbors) {
        if (station.SerialNumber < neighbor.SerialNumber) {
          const bb = new BundleBase(
            this.metroGraphData.RealEdgeCount(station, neighbor),
            station.BoundaryCurve,
            station.Position,
            station.IsReal,
          )
          station.BundleBases.set(neighbor, bb)

          const bb2 = new BundleBase(
            this.metroGraphData.RealEdgeCount(station, neighbor),
            neighbor.BoundaryCurve,
            neighbor.Position,
            neighbor.IsReal,
          )
          neighbor.BundleBases.set(station, bb2)

          if (Curve.PointRelativeToCurveLocation(neighbor.Position, station.BoundaryCurve) !== PointLocation.Outside) {
            bb.IsParent = true
            addToMapOfArrays(this.internalBases, station, bb)
            addToMapOfArrays(this.externalBases, neighbor, bb2)
          } else if (Curve.PointRelativeToCurveLocation(station.Position, neighbor.BoundaryCurve) !== PointLocation.Outside) {
            bb2.IsParent = true
            addToMapOfArrays(this.externalBases, station, bb)
            addToMapOfArrays(this.internalBases, neighbor, bb2)
          } else {
            addToMapOfArrays(this.externalBases, station, bb)
            addToMapOfArrays(this.externalBases, neighbor, bb2)
          }

          const obstaclesToIgnore = this.metroGraphData.tightIntersections.ObstaclesToIgnoreForBundle(station, neighbor)
          const bundle = new BundleInfo(
            bb,
            bb2,
            obstaclesToIgnore,
            Array.from(this.metroOrdering.GetOrder(station, neighbor)).map((l) => l.Width / 2),
          )
          bb.OutgoingBundleInfo = bb2.IncomingBundleInfo = bundle
          this.Bundles.push(bundle)
        }
      }
    }

    //neighbors
    this.SetBundleBaseNeighbors()
  }

  SetBundleBaseNeighbors() {
    for (const c of this.externalBases.keys()) {
      const list = this.externalBases.get(c)
      this.SortBundlesCounterClockwise(list)

      //set left
      this.SetLeftRightBases(list)
    }

    for (const c of this.internalBases.keys()) {
      const list = this.internalBases.get(c)
      this.SortBundlesCounterClockwise(list)

      //set left
      this.SetLeftRightBases(list)
    }
  }

  SortBundlesCounterClockwise(list: Array<BundleBase>) {
    if (list.length > 2) {
      const pivot: Point = list[0].OppositeBase.Position
      const center: Point = list[0].CurveCenter
      list.sort((u: BundleBase, v: BundleBase) => {
        return getOrientationOf3Vectors(pivot.sub(center), u.OppositeBase.Position.sub(center), v.OppositeBase.Position.sub(center))
      })
    }
  }

  SetLeftRightBases(bases: Array<BundleBase>) {
    const count: number = bases.length
    if (count <= 1) {
      return
    }

    for (let i = 0; i < count; i++) {
      bases[i].Prev = bases[(i - 1 + count) % count]
      bases[i].Next = bases[(i + 1) % count]
    }
  }

  CreateOrientedSegs() {
    for (const metroline of this.metroGraphData.Metrolines) {
      this.CreateOrientedSegsOnLine(metroline)
    }
  }

  CreateOrientedSegsOnLine(line: Metroline) {
    for (let polyPoint: PolylinePoint = line.Polyline.startPoint.next; polyPoint.next != null; polyPoint = polyPoint.next) {
      this.CreateOrientedSegsOnLineVertex(line, polyPoint)
    }
  }

  CreateOrientedSegsOnLineVertex(line: Metroline, polyPoint: PolylinePoint) {
    const u: Station = this.metroGraphData.PointToStations.get(polyPoint.prev.point)
    const v: Station = this.metroGraphData.PointToStations.get(polyPoint.point)
    const w: Station = this.metroGraphData.PointToStations.get(polyPoint.next.point)
    const h0: BundleBase = v.BundleBases.get(u)
    const h1: BundleBase = v.BundleBases.get(w)
    const j0: number = this.metroOrdering.GetLineIndexInOrder(u, v, line)
    const j1: number = this.metroOrdering.GetLineIndexInOrder(w, v, line)
    const or0 = (h0.OrientedHubSegments[j0] = new OrientedHubSegment(null, false, j0, h0))
    const or1 = (h1.OrientedHubSegments[j1] = new OrientedHubSegment(null, true, j1, h1))
    or1.Other = or0
    or0.Other = or1
  }

  UpdateSourceAndTargetBases() {
    for (const bundleInfo of this.Bundles) {
      bundleInfo.UpdateSourceAndTargetBases(true, true)
    }
  }

  SetBasesRightLeftParamsToTheMiddles() {
    for (const bundle of this.Bundles) {
      const sbase = bundle.SourceBase
      const tbase = bundle.TargetBase
      sbase.ParEnd = sbase.ParStart = this.GetBaseMiddleParamInDirection(sbase, sbase.Position, tbase.Position)
      tbase.ParEnd = tbase.ParStart = this.GetBaseMiddleParamInDirection(tbase, tbase.Position, sbase.Position)
    }
  }

  GetBaseMiddleParamInDirection(targetBase: BundleBase, sPos: Point, neighbPos: Point): number {
    const curve = targetBase.Curve
    const isCircle = curve instanceof Ellipse
    if (isCircle) {
      const circle = <Ellipse>curve
      if (circle.isArc()) {
        return Point.angle(circle.aAxis, neighbPos.sub(sPos))
      }
    }

    const intersections = Curve.getAllIntersections(curve, LineSegment.mkPP(sPos, neighbPos), true)
    for (const intersectionInfo of intersections) {
      const xP = intersectionInfo.x
      if (xP.sub(sPos).dot(xP.sub(neighbPos)) <= 0) {
        return intersectionInfo.par0
      }
    }
    // SvgDebugWriter.dumpDebugCurves('./tmp/baseMiddle.svg', [
    //  DebugCurve.mkDebugCurveTWCI(100, 1, 'Red', curve),
    //  DebugCurve.mkDebugCurveTWCI(100, 1, 'Blue', LineSegment.mkPP(sPos, neighbPos)),
    // ])
    throw new Error()
  }

  SetRightLeftParamsFeasiblySymmetrically() {
    for (const bundle of this.Bundles) {
      bundle.SetParamsFeasiblySymmetrically(this.metroGraphData.TightTree)
    }
  }

  AdjustStartEndParamsToAvoidBaseOverlaps() {
    for (const c of this.externalBases.values()) this.AdjustCurrentBundleWidthsOnCurve(c)
    for (const c of this.internalBases.values()) this.AdjustCurrentBundleWidthsOnCurve(c)
  }

  AdjustCurrentBundleWidthsOnCurve(bases: Array<BundleBase>) {
    const count = bases.length
    if (count <= 1) return

    for (let i = 0; i < count; i++) {
      const rBase = bases[i]
      const lBase = rBase.Next

      this.ShrinkBasesToMakeTwoConsecutiveNeighborsHappy(rBase, lBase)
      // Assert.assert(rBase.isCorrectlyOrienected() && lBase.isCorrectlyOrienected())
    }
  }

  ShrinkBasesToMakeTwoConsecutiveNeighborsHappy(rBase: BundleBase, lBase: BundleBase) {
    const interval = intersectBases(rBase, lBase)
    if (interval == null) return
    if (closeDistEps(interval.start, interval.end)) return

    const rM = interval.rbaseMiddle
    const lM = interval.lbaseMiddle
    if (rM < lM) {
      //swap
      const t = rBase
      rBase = lBase
      lBase = t
    }
    const rBaseSpan = rBase.Span
    const lBaseSpan = lBase.Span

    const x = (interval.end * rBaseSpan + interval.start * lBaseSpan) / (lBaseSpan + rBaseSpan)

    rBase.ParStart = rBase.AdjustParam(x + GeomConstants.distanceEpsilon)
    lBase.ParEnd = lBase.AdjustParam(x - GeomConstants.distanceEpsilon)
    // Assert.assert(intersectBases(rBase, lBase) == null )
  }

  // find a cut point for 2 segments

  RegularCut(l1: number, r1: number, l2: number, r2: number, span1: number, span2: number): number {
    let cutParam: number = (span1 * r2 + span2 * l1) / (span1 + span2)
    const mn: number = Math.min(r1, r2)
    const mx: number = Math.max(l1, l2)
    // //Assert.assert((lessOrEqual(mx, cutParam) && ApproximateComparer.LessOrEqual(cutParam, mn)));
    if (cutParam < mx) {
      cutParam = mx
    }

    if (cutParam > mn) {
      cutParam = mn
    }

    return cutParam
  }

  /** 1(-1) rotate point CCW(CW)*/

  static Deltas = [
    [1, -1], //rotating the left point ccw, the right cw
    // [0, 1],
    //[-1, 1],
    // [1, 0],
    // [-1, 0],
    //[1, -1],
    // [0, -1],
    [1, -1], //rotating the left point cw, the right ccw
  ]
  static SeparationCoeff = 1

  static SqueezeCoeff = 1

  static CenterCoeff = 10

  static AssymetryCoeff = 1

  static MaxIterations = 200

  static MaxParameterChange: number = 8 / 360

  // it would be one degree for a circle
  static MinParameterChange: number = 0.1 / 360

  static CostThreshold = 1e-5

  static CostDeltaThreshold = 0.01

  fixedBundles = new HashSet<BundleInfo>()

  RotateBundlesToDiminishCost() {
    let parameterChange: number = BundleBasesCalculator.MaxParameterChange
    const t = {cost: this.Cost()}
    let iteration = 0
    // HubDebugger.ShowHubs(metroGraphData, bundlingSettings, true);
    while (iteration++ < BundleBasesCalculator.MaxIterations) {
      const oldCost: number = t.cost
      this.RotateBundlesToDiminishCostOneIteration(parameterChange, t)
      parameterChange = this.UpdateParameterChange(parameterChange, oldCost, t.cost)
      if (parameterChange < BundleBasesCalculator.MinParameterChange) {
        break
      }
    }

    // TimeMeasurer.DebugOutput("bases optimization completed after " + iteration + " iterations (cost=" + cost + ")");
  }

  // the cooling scheme follows Yifan Hu, Efficient and high quality force-directed graph drawing
  stepsWithProgress = 0

  UpdateParameterChange(step: number, oldEnergy: number, newEnergy: number): number {
    // cooling factor
    const T = 0.8
    if (newEnergy + 1 < oldEnergy) {
      this.stepsWithProgress++
      if (this.stepsWithProgress >= 5) {
        this.stepsWithProgress = 0
        // step = Math.Min(MaxParameterChange, step / T);
        this.fixedBundles.clear()
      }
    } else {
      this.stepsWithProgress = 0
      step *= T
      this.fixedBundles.clear()
    }

    return step
  }

  RotateBundlesToDiminishCostOneIteration(parameterChange: number, t: {cost: number}): boolean {
    let progress = false
    for (const bundleInfo of this.Bundles) {
      if (this.fixedBundles.has(bundleInfo)) continue

      if (this.OptimizeBundle(bundleInfo, parameterChange, t)) {
        progress = true
        /*bool isClusterS = bundleInfo.SourceBase.CurveCenter !== bundleInfo.SourceBase.Position;
                    bool isClusterT = bundleInfo.TargetBase.CurveCenter !== bundleInfo.TargetBase.Position;
                    while ((isClusterS || isClusterT) && OptimizeBundle(bundleInfo, parameterChange, ref cost)) { }*/
      } else this.fixedBundles.add(bundleInfo)
    }
    return progress
  }

  OptimizeBundle(bundleInfo: BundleInfo, parameterChange: number, t: {cost: number}): boolean {
    const bundleCost: number = this.CostBi(bundleInfo)
    if (bundleCost < BundleBasesCalculator.CostThreshold) {
      return false
    }

    // choose the best step
    let bestDelta = 0
    let bestJ = -1
    let bestI = -1
    for (let i = 0; i < BundleBasesCalculator.Deltas.length - 1; i++) {
      let delta: number = this.DeltaWithChangedAngles(
        BundleBasesCalculator.Deltas[i][0],
        BundleBasesCalculator.Deltas[i][1],
        0,
        0,
        bundleInfo,
        bundleCost,
        parameterChange,
      )
      if (delta > BundleBasesCalculator.CostDeltaThreshold && delta > bestDelta) {
        bestI = i
        bestJ = BundleBasesCalculator.Deltas.length - 1
        bestDelta = delta
      }

      delta = this.DeltaWithChangedAngles(
        0,
        0,
        BundleBasesCalculator.Deltas[i][0],
        BundleBasesCalculator.Deltas[i][1],
        bundleInfo,
        bundleCost,
        parameterChange,
      )
      if (delta > BundleBasesCalculator.CostDeltaThreshold && delta > bestDelta) {
        bestI = BundleBasesCalculator.Deltas.length - 1
        bestJ = i
        bestDelta = delta
      }
    }

    if (bestDelta < BundleBasesCalculator.CostDeltaThreshold) {
      return false
    }

    t.cost -= bestDelta
    bundleInfo.RotateBy(
      BundleBasesCalculator.Deltas[bestI][0],
      BundleBasesCalculator.Deltas[bestI][1],
      BundleBasesCalculator.Deltas[bestJ][0],
      BundleBasesCalculator.Deltas[bestJ][1],
      parameterChange,
    )
    return true
  }

  DeltaWithChangedAngles(
    rotationOfSourceRigthPoint: number,
    rotationOfSourceLeftPoint: number,
    rotationOfTargetRigthPoint: number,
    rotationOfTargetLeftPoint: number,
    bundleInfo: BundleInfo,
    bundleCost: number,
    parameterChange: number,
  ): number {
    if (
      !bundleInfo.RotationIsLegal(
        rotationOfSourceRigthPoint,
        rotationOfSourceLeftPoint,
        rotationOfTargetRigthPoint,
        rotationOfTargetLeftPoint,
        parameterChange,
      )
    ) {
      return 0
    }

    bundleInfo.RotateBy(
      rotationOfSourceRigthPoint,
      rotationOfSourceLeftPoint,
      rotationOfTargetRigthPoint,
      rotationOfTargetLeftPoint,
      parameterChange,
    )
    const newCost = this.CostBN(bundleInfo, bundleCost)
    // restoring
    bundleInfo.RotateBy(
      rotationOfSourceRigthPoint * -1,
      rotationOfSourceLeftPoint * -1,
      rotationOfTargetRigthPoint * -1,
      rotationOfTargetLeftPoint * -1,
      parameterChange,
    )
    return bundleCost - newCost
  }

  CostBi(bundleInfo: BundleInfo): number {
    return (
      BundleBasesCalculator.SeparationCoeff * this.SeparationCost(bundleInfo) +
      (BundleBasesCalculator.SqueezeCoeff * this.SqueezeCost(bundleInfo) +
        (BundleBasesCalculator.AssymetryCoeff * this.AssymetryCost(bundleInfo) +
          BundleBasesCalculator.CenterCoeff * this.CenterCostBi(bundleInfo)))
    )
  }

  // this is an accelerated version of the above function (calculate cost partly)
  CostBN(bundleInfo: BundleInfo, limit: number): number {
    let cost = 0
    cost = cost + BundleBasesCalculator.CenterCoeff * this.CenterCostBi(bundleInfo)
    if (cost > limit) {
      return cost
    }

    cost = cost + BundleBasesCalculator.SeparationCoeff * this.SeparationCost(bundleInfo)
    if (cost > limit) {
      return cost
    }

    cost = cost + BundleBasesCalculator.SqueezeCoeff * this.SqueezeCost(bundleInfo)
    if (cost > limit) {
      return cost
    }

    cost = cost + BundleBasesCalculator.AssymetryCoeff * this.AssymetryCost(bundleInfo)
    return cost
  }

  SqueezeCost(bundleInfo: BundleInfo): number {
    const middleLineDir = bundleInfo.TargetBase.MidPoint.sub(bundleInfo.SourceBase.MidPoint).normalize()
    const perp = middleLineDir.rotate90Ccw()
    const projecton0 = Math.abs(bundleInfo.SourceBase.StartPoint.sub(bundleInfo.SourceBase.EndPoint).dot(perp))
    const projecton1 = Math.abs(bundleInfo.TargetBase.StartPoint.sub(bundleInfo.TargetBase.EndPoint).dot(perp))
    const del0: number = Math.abs(bundleInfo.TotalRequiredWidth - projecton0) / bundleInfo.TotalRequiredWidth
    const del1: number = Math.abs(bundleInfo.TotalRequiredWidth - projecton1) / bundleInfo.TotalRequiredWidth
    const del: number = Math.abs(projecton0 - projecton1) / bundleInfo.TotalRequiredWidth
    const cost: number = Math.exp(del0 * 10) - 1 + (Math.exp(del1 * 10) - 1)
    return cost + del
  }

  CenterCostBi(bundleInfo: BundleInfo): number {
    if (!bundleInfo.SourceBase.BelongsToRealNode && !bundleInfo.TargetBase.BelongsToRealNode) {
      return 0
    }

    return this.CenterCostBb(bundleInfo.SourceBase) + this.CenterCostBb(bundleInfo.TargetBase)
  }

  CenterCostBb(bundleBase: BundleBase): number {
    if (!bundleBase.BelongsToRealNode) {
      return 0
    }

    const currentMid: number = bundleBase.ParMid
    const mn: number = Math.min(bundleBase.InitialMidParameter, currentMid)
    const mx: number = Math.max(bundleBase.InitialMidParameter, currentMid)
    const dist: number = Math.min(mx - mn, mn + (parameterSpan(bundleBase.Curve) - mx))
    if (bundleBase.CurveCenter.equal(bundleBase.Position) || bundleBase.IsParent) {
      return 25 * (dist * dist)
    } else {
      return 500 * (dist * dist)
    }
  }

  AssymetryCost(bundleInfo: BundleInfo): number {
    return this.GetAssymetryCostForBase(bundleInfo.SourceBase) + this.GetAssymetryCostForBase(bundleInfo.TargetBase)
  }

  GetAssymetryCostForBase(bundleBase: BundleBase): number {
    if (bundleBase.BelongsToRealNode) {
      return 0
    }

    const assymetryWeight: number = bundleBase.OppositeBase.BelongsToRealNode ? 200 : 500
    let cost = 0
    for (const o of bundleBase.OrientedHubSegments) {
      const i0: number = o.Index
      const i1: number = o.Other.Index
      const a = bundleBase.Points[i0]
      const ta = bundleBase.Tangents[i0]
      const oppositeBase = o.Other.BundleBase
      const b = oppositeBase.Points[i1]
      const tb = oppositeBase.Tangents[i1]
      const s: number = bundleBase.Count + oppositeBase.Count
      cost += this.GetAssymetryCostOnData(a, ta, b, tb, assymetryWeight) / s
    }
    return cost
  }

  GetAssymetryCostOnData(a: Point, tangentA: Point, b: Point, tangentB: Point, assymetryWeight: number): number {
    const xAxis = a.sub(b)
    const len = xAxis.length
    if (len < GeomConstants.distanceEpsilon) {
      return 0
    }

    len
    // Tangents both have length 1. If they compensate each other on x-asis,
    // then their projections on y-axis are the same.
    const delx = tangentA.add(tangentB).dot(xAxis)
    // const yAxis = xAxis.Rotate90Ccw();
    // const ay = tangentA * yAxis;
    // const by = tangentB * yAxis;
    const ay = Point.crossProduct(xAxis, tangentA)
    const by = Point.crossProduct(xAxis, tangentB)
    const dely = ay - by
    // double ac = Math.Sqrt(delx * delx + dely * dely);
    // double bc = Math.Sqrt(ay * ay + by * by);
    const ac: number = delx * delx + dely * dely
    const bc: number = ay * ay + by * by
    return 10 * ac + assymetryWeight * bc
  }

  SeparationCost(bundleInfo: BundleInfo): number {
    return this.SeparationCostForBundleBase(bundleInfo.SourceBase) + this.SeparationCostForBundleBase(bundleInfo.TargetBase)
  }

  SeparationCostForBundleBase(bBase: BundleBase): number {
    if (bBase.Prev == null) {
      return 0
    }

    return this.SeparationCostForAdjacentBundleBases(bBase, bBase.Prev) + this.SeparationCostForAdjacentBundleBases(bBase, bBase.Next)
  }

  SeparationCostForAdjacentBundleBases(base0: BundleBase, base1: BundleBase): number {
    //Assert.assert(base0.Curve === base1.Curve)
    const boundaryCurve: ICurve = base0.Curve
    const len: number = this.IntervalsOverlapLength(base0.ParStart, base0.ParEnd, base1.ParStart, base1.ParEnd, boundaryCurve)
    const mn: number = Math.min(base0.Span, base1.Span)
    //Assert.assert(ApproximateComparer.LessOrEqual(len, mn));
    //Assert.assert((mn > 0));
    return Math.exp(len / (mn * 10)) - 1
  }

  // returns the length of the overlapped interval of parameter space

  IntervalsOverlapLength(a: number, b: number, c: number, d: number, curve: ICurve): number {
    const s = curve.parStart
    const e = curve.parEnd
    if (a < b) {
      if (c < d) {
        return this.IntersectRegularIntervals(a, b, c, d)
      }

      return this.IntersectRegularIntervals(a, b, c, e) + this.IntersectRegularIntervals(a, b, s, d)
    }

    if (c < d) {
      return this.IntersectRegularIntervals(a, e, c, d) + this.IntersectRegularIntervals(s, b, c, d)
    }

    return this.IntersectRegularIntervals(a, e, c, e) + this.IntersectRegularIntervals(s, b, s, d)
  }

  IntersectRegularIntervals(a: number, b: number, c: number, d: number): number {
    const low = Math.max(a, c)
    const up = Math.min(b, d)
    if (low < up) {
      return up - low
    }

    return 0
  }

  Cost(): number {
    let cost = 0
    for (const bundleInfo of this.Bundles) {
      const c1: number = BundleBasesCalculator.SeparationCoeff * this.SeparationCost(bundleInfo)
      const c2: number = BundleBasesCalculator.AssymetryCoeff * this.AssymetryCost(bundleInfo)
      const c3: number = BundleBasesCalculator.SqueezeCoeff * this.SqueezeCost(bundleInfo)
      const c4: number = BundleBasesCalculator.CenterCoeff * this.CenterCostBi(bundleInfo)
      cost += (c1 + c2) / 2 + c3 + c4
      //Assert.assert(cost < Number.POSITIVE_INFINITY)
    }
    return cost
  }
}

function intersectBases(rBase: BundleBase, lBase: BundleBase): {start: number; end: number; rbaseMiddle: number; lbaseMiddle: number} {
  // here rBase.Curve is the same as lBase.Curve
  // getting the parameter span of the curve
  const fullSpan = parameterSpan(rBase.Curve)
  let e = rBase.ParEnd
  let s = rBase.ParStart < rBase.ParEnd ? rBase.ParStart : rBase.ParStart - fullSpan
  let oe = lBase.ParEnd
  let os = lBase.ParStart < lBase.ParEnd ? lBase.ParStart : lBase.ParStart - fullSpan
  // We have where s < e, and os < oe. Also e,s, os, oe <= rBase.Curve.ParEnd, but we can have s, os < rBase.Curve.ParStart
  // In addition, we are going to fit the intervals into an interval which is not longer then fullSpan.
  // To achive this we might need to shift one of the intervals by fullSpan
  if (e > oe) {
    // here also e > os
    if (e - os > fullSpan) {
      os += fullSpan
      oe += fullSpan
    }
  } else {
    // here oe >= e > s
    if (oe - s > fullSpan) {
      s += fullSpan
      e += fullSpan
    }
  }

  // Assert.assert(s < e)
  // Assert.assert(os < oe)

  // Assert.assert(Math.abs(e - s) <= fullSpan, 'e - s <= fullSpan')
  // Assert.assert(Math.abs(oe - os) <= fullSpan, 'oe - os <= fullSpan')
  // Assert.assert(Math.abs(oe - s) <= fullSpan, 'oe - s <= fullSpan')
  // Assert.assert(Math.abs(e - os) <= fullSpan, 'e - os <= fullSpan')
  const xEnd = Math.min(e, oe)
  const xStart = Math.max(s, os)
  return xStart <= xEnd ? {start: xStart, end: xEnd, rbaseMiddle: (s + e) / 2, lbaseMiddle: (os + oe) / 2} : null
}
