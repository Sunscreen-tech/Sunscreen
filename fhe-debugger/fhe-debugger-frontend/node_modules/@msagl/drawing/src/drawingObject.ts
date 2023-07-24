import {ArrowTypeEnum} from './arrowTypeEnum'
import {Color} from './color'
import {StyleEnum} from './styleEnum'
import {RankEnum} from './rankEnum'
import {DirTypeEnum} from './dirTypeEnum'
import {OrderingEnum} from './orderingEnum'
import {Attribute, AttributeRegistry, Entity, LayerDirectionEnum, Size} from '@msagl/core'
/** DrawingObject ment to be an attribute on an Entity, with some additional information necessery for rendering. Many fields of this class support of Dot language */
export abstract class DrawingObject extends Attribute {
  rebind(e: Entity): void {
    this.entity = e
    this.bind(AttributeRegistry.DrawingObjectIndex)
  }
  static copyValidFields(source: DrawingObject, target: DrawingObject) {
    if (source == null || target == null) return
    if (source.color && source.color.keyword && source.color.keyword.toLowerCase() !== 'black') {
      target.color = source.color
    }
    if (source.fillColor) {
      target.fillColor = source.fillColor
    }
    if (source.labelfontcolor && source.labelfontcolor.keyword.toLowerCase() !== 'black') {
      target.labelfontcolor = source.labelfontcolor
    }
    if (source.labelText != null && source.labelText !== '' && source.labelText !== source.id) {
      target.labelText = source.labelText
    }
    if (source.fontColor && source.fontColor.keyword && source.fontColor.keyword.toLowerCase() !== 'black') {
      target.fontColor = source.fontColor
    }
    if (source.styles && source.styles.length) {
      target.styles = source.styles.map((a) => a)
    }
    if (source.pencolor && source.pencolor.keyword !== 'black') {
      target.pencolor = source.pencolor
    }
    if (source.penwidth && source.penwidth !== 1) {
      target.penwidth = source.penwidth
    }
    if (source.rankdir) {
      target.rankdir = source.rankdir
    }
    if (source.fontname && source.fontname !== DrawingObject.defaultLabelFontName) {
      target.fontname = source.fontname
    }
    if (source.margin) {
      target.margin = source.margin
    }
    if (source.fontsize && source.fontsize !== DrawingObject.defaultLabelFontSize) {
      target.fontsize = source.fontsize
    }
    if (source.orientation) {
      target.orientation = source.orientation
    }
    if (source.ranksep) {
      target.ranksep = source.ranksep
    }
    if (source.arrowtail) {
      target.arrowtail = source.arrowtail
    }
    if (source.arrowhead) {
      target.arrowhead = source.arrowhead
    }
    if (source.ordering) {
      target.ordering = source.ordering
    }
    if (source.bgcolor) {
      target.bgcolor = source.bgcolor
    }
    if (source.pos) {
      target.pos = source.pos
    }
    if (source.nodesep) {
      target.nodesep = source.nodesep
    }
    if (source.arrowsize) {
      target.arrowsize = source.arrowsize
    }
    if (source.samehead) {
      target.samehead = source.samehead
    }
    if (source.layersep) {
      target.layersep = source.layersep
    }
    if (source.clusterRank) {
      target.clusterRank = source.clusterRank
    }
  }

  measuredTextSize: Size
  /** the index of the DrawingObject in the list of attributes of Entity */
  /**  This is the field from the Graph. It is used to keep the connection with the underlying graph */

  // not all attributes can be used in derived classes
  static defaultLabelFontName = 'Times-Roman'
  static defaultLabelFontSize = 12

  color: Color
  fillColor: Color
  labelfontcolor: Color = Color.Black

  private _labelText: string
  public get labelText(): string {
    return this._labelText
  }
  public set labelText(value: string) {
    this._labelText = value
  }
  headlabel: string
  taillabel: string
  fontColor: Color
  styles: StyleEnum[] = []
  pencolor: Color
  penwidth = 1
  peripheries: number
  size: [number, number]
  rankdir: LayerDirectionEnum
  fontname: any
  width: number
  height: number
  margin: number
  len: number
  fontsize: number
  minlen: number
  rank: RankEnum
  charset: any
  orientation: any
  ratio: any
  weight: number
  ranksep: number
  splines: boolean
  overlap: boolean
  arrowtail: ArrowTypeEnum
  private _arrowhead: ArrowTypeEnum
  public get arrowhead(): ArrowTypeEnum {
    return this._arrowhead
  }
  public set arrowhead(value: ArrowTypeEnum) {
    this._arrowhead = value
  }
  ordering: OrderingEnum
  URL: string
  dir: DirTypeEnum
  concentrate: boolean
  compound: boolean
  lhead: string
  bgcolor: Color
  center: boolean
  pos: [number, number]
  nodesep: number
  rotate: number
  arrowsize: number
  colorscheme: string
  ltail: string
  sides: number
  distortion: number
  skew: number
  bb: [number, number, number, number]
  labelloc: string
  decorate: boolean
  tailclip: boolean
  headclip: boolean
  constraint: boolean
  gradientangle: number
  samehead: string
  href: string
  imagepath: string
  image: string
  labejust: string
  layers: string[]
  layer: string
  layersep: number
  f: number
  nojustify: boolean
  root: boolean
  page: [number, number]
  pname: any
  kind: any
  fname: any
  subkind: any
  area: number
  tailport: string
  headport: string
  wt: any
  private _id: string
  public get id(): string {
    return this._id
  }
  public set id(value: string) {
    this._id = value
  }
  edgetooltip: any
  headURL: any
  tailURL: any
  labelURL: any
  edgeurl: any
  tailtooltip: any
  headtooltip: any
  shapefile: any
  xlabel: any
  sametail: string
  clusterRank: any

  constructor(entity: Entity) {
    super(entity, AttributeRegistry.DrawingObjectIndex)
    this.fontname = DrawingObject.defaultLabelFontName
    this.fontsize = DrawingObject.defaultLabelFontSize
  }

  static getDrawingObj(attrCont: Entity): DrawingObject | null {
    if (attrCont == null) {
      return null
    } else {
      return attrCont.getAttr(AttributeRegistry.DrawingObjectIndex)
    }
  }
}
