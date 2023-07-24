import {CoupleSet} from '../../../utils/CoupleSet'
export class LayerInfo {
  // constrained on the level of neighBlocks
  leftRight = new CoupleSet()
  flatEdges = new CoupleSet()
  neigBlocks = new Map<number, number[]>()
  constrainedFromAbove = new Map<number, number>()
  constrainedFromBelow = new Map<number, number>()
  nodeToBlockRoot = new Map<number, number>()
  // if the block contains a fixed node v,  it can be only one because of the monotone paths feature,
  // then blockToFixedNodeOfBlock[block]=v

  blockRootToVertConstrainedNodeOfBlock = new Map<number, number>()
}
