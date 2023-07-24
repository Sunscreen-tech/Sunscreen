import {Rectangle} from '../../math/geometry/rectangle'
import {GeomNode} from './geomNode'
import {Edge} from '../../structs/edge'
import {GeomLabel} from './geomLabel'
import {Point} from '../../math/geometry/point'
import {CurveClip, ArrowHeadData} from './tileMap'
import {Curve, ICurve} from '../../math/geometry'
import {PointPairMap} from '../../utils/pointPairMap'
import {PointPair} from '../../math/geometry/pointPair'
import {Assert} from '../../utils/assert'

export type Bundle = {clip: ICurve; edges: Edge[]}

/** keeps the data needed to render a tile, and some fields for optimizations */
export class Tile {
  private _curveClips: CurveClip[] = []
  public get curveClips(): CurveClip[] {
    if (this._curveClips.length > 0) return this._curveClips
    return Array.from(this.getBundles())
      .map((b) =>
        b.edges.map((e) => {
          return {curve: b.clip, edge: e}
        }),
      )
      .flat()
  }
  public set curveClips(value: CurveClip[]) {
    this._curveClips = value
  }
  get cachedClipsLength() {
    return this.bundleTable ? this.bundleTable.size : 0
  }
  constructor(rect: Rectangle) {
    this.arrowheads = []
    this.nodes = []
    this.labels = []
    this.rect = rect
    this.bundleTable = new PointPairMap<Bundle>()
  }
  /**
   *  
   * returns the array of edges passing through the curve */
  addToBundlesOrFetchFromBundles(s:number, e:number, curveToClip: ICurve): Edge[] {
    Assert.assert(!(curveToClip instanceof Curve), 'CurveClip.curve is not a Curve')

    const pp = new PointPair(curveToClip.value(s), curveToClip.value(e))
    const bundle = this.bundleTable.get(pp)
    if (bundle) {
      return bundle.edges
    }
    const ret: Edge[] = []
    this.bundleTable.set(pp, {clip: curveToClip.trim(s,e), edges: ret})
    return ret
  }

  findCreateBundle(seg: ICurve): Bundle | undefined {
    const pp = new PointPair(seg.start, seg.end)
    const ret = this.bundleTable.get(pp)
    if (ret) return ret
    const b = {clip: seg, edges: new Array<Edge>()}
    this.bundleTable.set(pp, b)
    return b
  }

  addCurveClip(cc: CurveClip) {
    Assert.assert(!(cc.curve instanceof Curve), 'CurveClip.curve should not be a Curve!')
    this.findCreateBundle(cc.curve).edges.push(cc.edge)
  }

  arrowheads: {tip: Point; edge: Edge; base: Point}[]
  nodes: GeomNode[]
  labels: GeomLabel[]
  rect: Rectangle

  /** There is only one curve passing between given two points.
   * bundleTable is a map from a pair of points to a curve and an array of edges passing through the curve.
   */
  private bundleTable: PointPairMap<{clip: ICurve; edges: Edge[]}>;

  *getBundles(): IterableIterator<Bundle> {
    yield* this.bundleTable.values()
  }
  get curveBundlesLength() {
    return this.bundleTable.size
  }

  isEmpty(): boolean {
    return this.bundleTable.size == 0 && this.arrowheads.length == 0 && this.nodes.length == 0 && this.labels.length == 0
  }

  initCurveClips() {
    if (this.bundleTable) {
      this.bundleTable.clear()
    } else {
      this.bundleTable = new PointPairMap<Bundle>()
    }
  }

  /** clears all arrays but does not touch this.rect */
  clear() {
    this.arrowheads = []
    this.nodes = []
    this.labels = []
    if (this.bundleTable) this.bundleTable.clear()
    else this.bundleTable = new PointPairMap<Bundle>()
  }

  /** returns the number of entities that will be rendered for a tile: each bundle is counted as one entity */
  get entityCount() {
    return this.bundleTable.size + this.arrowheads.length + this.labels.length + this.nodes.length
  }

  addElement(data: CurveClip | ArrowHeadData | GeomLabel | GeomNode) {
    if (data instanceof GeomNode) {
      this.nodes.push(data)
    } else if (data instanceof GeomLabel) {
      this.labels.push(data)
    } else if ('curve' in data) {
      Assert.assert(this.rect.containsRect(data.curve.boundingBox), 'CurveClip.curve is not in tile')
      if (data.curve instanceof Curve) {
        for (const seg of data.curve.segs) {
          this.addCurveClip({edge: data.edge, curve: seg})
        }
      } else {
        this.addCurveClip(data)
      }
    } else {
      this.arrowheads.push(data)
    }
  }
}
