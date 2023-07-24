import {Graph} from '@msagl/core'
import {IViewerObject} from './iViewerObject'

export interface IViewerGraph extends IViewerObject {
  graph: Graph
}
