import {
  Arrowhead,
  CurveFactory,
  Edge,
  GeomEdge,
  GeomGraph,
  GeomLabel,
  GeomNode,
  Graph,
  ICurve,
  Label,
  Point,
  Rectangle,
  Size,
  SugiyamaLayoutSettings,
  Node,
} from '@msagl/core'

import {DrawingObject} from './drawingObject'
import {DrawingNode} from './drawingNode'
import {TextMeasurerOptions} from './textMeasurerOptions'
import {ArrowTypeEnum} from './arrowTypeEnum'
import {DrawingEdge} from './drawingEdge'
import {ShapeEnum} from './shapeEnum'
type GraphVisData = {
  sameRanks: string[][]
  minRanks: string[]
  maxRanks: string[]
  sourceRanks: string[]
  sinkRanks: string[]
}
/**
 * DrawingGraph is an attribute on Graph.
 * It keeps the attributes for nodes and edges rendering.
 *  It facilitates the geometry creation, mostly for the bounding curves of the nodes, from drawing attributes and labels
 * */
export class DrawingGraph extends DrawingNode {
  private _defaultNodeObject: DrawingObject
  public get defaultNodeObject(): DrawingObject {
    return this._defaultNodeObject
  }
  public set defaultNodeObject(value: DrawingObject) {
    this._defaultNodeObject = value
  }
  defaultEdgeObject: DrawingObject
  static getDrawingGraph(g: Graph): DrawingGraph {
    return DrawingObject.getDrawingObj(g) as DrawingGraph
  }
  /** this node does not belong to the graph,
   but rather serves as a template for the other node's attributes (like filledColor, style, etc.) */
  graphVisData: GraphVisData = {
    sameRanks: new Array<string[]>(),
    minRanks: new Array<string>(),
    maxRanks: new Array<string>(),
    sourceRanks: new Array<string>(),
    sinkRanks: new Array<string>(),
  }
  get graph(): Graph {
    return this.entity as Graph
  }

  findNode(id: string): DrawingNode | null {
    const gr = this.graph
    const n = gr.findNode(id)
    if (n == null) return null
    return DrawingObject.getDrawingObj(n) as DrawingNode
  }

  hasDirectedEdge(): boolean {
    for (const e of this.graph.deepEdges) {
      const drawingEdge = <DrawingEdge>DrawingObject.getDrawingObj(e)
      if (drawingEdge.directed) {
        return true
      }
    }
    return false
  }

  textMeasure: (text: string, opts: Partial<TextMeasurerOptions>) => Size
  createGeometry(
    textMeasure: (label: string, opts: Partial<TextMeasurerOptions>) => Size = (str: string) => {
      if (!str) return null
      return new Size(str.length * 8 + 8, 20)
    },
  ): GeomGraph {
    const geomGraph = new GeomGraph(this.graph)
    this.textMeasure = textMeasure
    const opts: Partial<TextMeasurerOptions> = {fontFamily: this.fontname, fontSize: this.fontsize, fontStyle: 'normal'}
    geomGraph.labelSize = textMeasure(this.labelText, opts)
    for (const n of this.graph.nodesBreadthFirst) {
      this.createNodeGeometry(n)
    }
    for (const e of this.graph.deepEdges) {
      this.createEdgeGeometry(e)
    }
    if (this.rankdir) {
      // we must have the Sugiyama scheme here
      const ss: SugiyamaLayoutSettings = (geomGraph.layoutSettings = new SugiyamaLayoutSettings())
      ss.layerDirection = this.rankdir
    }
    return geomGraph
  }
  private createEdgeGeometry(e: Edge) {
    const drawingEdge = <DrawingEdge>DrawingEdge.getDrawingObj(e)
    const geomEdge = new GeomEdge(e)

    if (drawingEdge.arrowhead != ArrowTypeEnum.none) {
      geomEdge.targetArrowhead = new Arrowhead()
    }
    if (drawingEdge.arrowtail != ArrowTypeEnum.none) {
      geomEdge.sourceArrowhead = new Arrowhead()
    }
    if (drawingEdge.labelText) {
      const size = this.textMeasure(drawingEdge.labelText, {
        fontSize: drawingEdge.fontsize,
        fontFamily: drawingEdge.fontname,
        fontStyle: 'normal',
      })
      const label = (e.label = new Label(e))
      new GeomLabel(label, Rectangle.mkPP(new Point(0, 0), new Point(size.width, size.height)))
      drawingEdge.measuredTextSize = size
    }
    if (drawingEdge.penwidth) {
      geomEdge.lineWidth = drawingEdge.penwidth
    }
  }

  curveByShape(width: number, height: number, center: Point, drawingNode: DrawingNode): ICurve {
    let curve: ICurve
    switch (drawingNode.shape) {
      case ShapeEnum.diamond:
        curve = CurveFactory.mkDiamond(width, height, center)
        break
      case ShapeEnum.ellipse:
        curve = CurveFactory.mkEllipse(width / 1.6, height / 1.6, center)
        break
      case ShapeEnum.record:
      case ShapeEnum.box:
        curve = CurveFactory.mkRectangleWithRoundedCorners(width, height, drawingNode.XRadius, drawingNode.YRadius, center)
        break
      case ShapeEnum.circle:
        curve = CurveFactory.mkCircle(Math.sqrt(width * width + height * height), center)
        break
      case ShapeEnum.plaintext:
        break
      case ShapeEnum.point:
        break
      case ShapeEnum.mdiamond:
        break
      case ShapeEnum.msquare:
        break
      case ShapeEnum.polygon:
        break
      case ShapeEnum.doublecircle:
        curve = CurveFactory.mkCircle(Math.sqrt(width * width + height * height) + 2 * drawingNode.penwidth, center)
        break
      case ShapeEnum.house:
        curve = CurveFactory.createHouse(width, height, center)
        break
      case ShapeEnum.invhouse:
        curve = CurveFactory.createInvertedHouse(width, height, center)
        break
      case ShapeEnum.parallelogram:
        curve = CurveFactory.createParallelogram(width, height, center)
        break
      case ShapeEnum.octagon:
        curve = CurveFactory.createOctagon(width, height, center)
        break
      case ShapeEnum.tripleoctagon:
        break
      case ShapeEnum.triangle:
        break
      case ShapeEnum.trapezium:
        break
      case ShapeEnum.drawFromGeometry:
        break
      case ShapeEnum.hexagon:
        curve = CurveFactory.createHexagon(width, height, center)
        break
    }
    return curve ?? CurveFactory.mkRectangleWithRoundedCorners(width, height, drawingNode.XRadius, drawingNode.YRadius, center)
  }

  createNodeGeometry(n: Node, center = new Point(0, 0)): void {
    if (n instanceof Graph) {
      const subDg = <DrawingGraph>DrawingObject.getDrawingObj(n)
      const geomGraph = new GeomGraph(n)
      if (subDg.labelText) {
        geomGraph.labelSize = subDg.measuredTextSize = measureTextSize(subDg, this.textMeasure)
      }
    } else {
      const drawingNode = <DrawingNode>DrawingNode.getDrawingObj(n)
      let textSize = new Size(1, 1)
      if (drawingNode.labelText) {
        textSize = measureTextSize(drawingNode, this.textMeasure)
      }
      drawingNode.measuredTextSize = textSize
      const geomNode = new GeomNode(n)
      const width = textSize.width + drawingNode.LabelMargin * 2
      const height = textSize.height + drawingNode.LabelMargin * 2
      geomNode.boundaryCurve = this.curveByShape(width, height, center, drawingNode)
    }
  }
  measureLabelSizes(textMeasure: (text: string, opts: Partial<TextMeasurerOptions>) => Size) {
    for (const n of this.graph.nodesBreadthFirst) {
      const dn = DrawingNode.getDrawingObj(n) as DrawingNode
      dn.measuredTextSize = measureTextSize(dn, textMeasure) ?? new Size(1, 1)
    }
  }
}

function measureTextSize(drawingNode: DrawingNode, textMeasure: (text: string, opts: Partial<TextMeasurerOptions>) => Size): Size {
  if (drawingNode.labelText) {
    return textMeasure(drawingNode.labelText, {
      fontSize: drawingNode.fontsize,
      fontFamily: drawingNode.fontname,
      fontStyle: 'normal', // TODO: find in styles?
    })
  }
  return null
}
