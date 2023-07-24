import {EventHandler, Node} from '@msagl/core'
import {IViewerObject} from './iViewerObject'
export interface IViewerNode extends IViewerObject {
  node: Node
  IsCollapsedChanged: EventHandler // TODO:should it be in IViewerGraph
}
