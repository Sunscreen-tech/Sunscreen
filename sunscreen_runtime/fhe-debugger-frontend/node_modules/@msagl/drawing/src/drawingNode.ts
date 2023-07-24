import {DrawingObject} from './drawingObject'
import {Color} from './color'
import {ShapeEnum} from './shapeEnum'
import {Node, Attribute} from '@msagl/core'
export class DrawingNode extends DrawingObject {
  clone(): Attribute {
    throw new Error('Method not implemented.')
  }

  shape: ShapeEnum = ShapeEnum.box
  padding = 2

  get Padding(): number {
    return this.padding
  }
  set Padding(value: number) {
    this.padding = Math.max(0, value)
    // //RaiseVisualsChangedEvent(this, null);
  }
  xRad = 3

  // x radius of the rectangle box

  get XRadius(): number {
    return this.xRad
  }
  set XRadius(value: number) {
    this.xRad = value
    //RaiseVisualsChangedEvent(this, null);
  }

  yRad = 3

  // y radius of the rectangle box

  get YRadius(): number {
    return this.yRad
  }
  set YRadius(value: number) {
    this.yRad = value
  }

  static defaultFillColor: Color = Color.LightGray

  // the default fill color

  static get DefaultFillColor(): Color {
    return DrawingNode.defaultFillColor
  }
  static set DefaultFillColor(value: Color) {
    DrawingNode.defaultFillColor = value
  }

  get ShapeEnum(): ShapeEnum {
    return this.shape
  }
  set ShapeEnum(value: ShapeEnum) {
    this.shape = value
    //RaiseVisualsChangedEvent(this, null);
  }

  labelMargin = 1

  // the node label margin

  get LabelMargin(): number {
    return this.labelMargin
  }
  set LabelMargin(value: number) {
    this.labelMargin = value
    //RaiseVisualsChangedEvent(this, null);
  }
  constructor(n: Node) {
    super(n)
    if (n != null) {
      this.labelText = n.id
    }
  }
  // the non adgjacent edges should avoid being closer to the node than Padding

  private labelWidthToHeightRatio = 1

  // the label width to height ratio.

  get LabelWidthToHeightRatio(): number {
    return this.labelWidthToHeightRatio
  }
  set LabelWidthToHeightRatio(value: number) {
    this.labelWidthToHeightRatio = value
  }
  get node(): Node {
    return this.entity as Node
  }

  get id(): string {
    return this.node ? this.node.id : ''
  }
}
