import {Algorithm} from '../../utils/algorithm'
import {GeomEdge} from '../core/geomEdge'
import {GeomGraph} from '../core/geomGraph'
import {IGeomGraph} from '../initialLayout/iGeomGraph'
import {SingleSourceDistances} from './SingleSourceDistances'
// An algorithm for computing the distances between a selected set of nodes and all nodes.
export class PivotDistances extends Algorithm {
  private graph: IGeomGraph
  private length: (e: GeomEdge) => number
  private pivotArray: number[]
  private result: number[][]
  // A square matrix with shortest path distances.
  get Result(): number[][] {
    return this.result
  }

  // Computes distances between a selected set of nodes and all nodes.
  // Pivot nodes are selected with maxmin strategy (first at random, later
  // ones to maximize distances to all previously selected ones).
  constructor(graph: IGeomGraph, pivotArray: number[], length: (e: GeomEdge) => number) {
    super(null) // todo: pass the canceltoken
    this.graph = graph
    this.pivotArray = pivotArray
    this.length = length
  }

  // Executes the algorithm.
  run() {
    this.result = new Array(this.pivotArray.length)
    const nodes = Array.from(this.graph.shallowNodes)
    const min = new Array(this.graph.shallowNodeCount).fill(Number.POSITIVE_INFINITY)

    let pivot = nodes[0]
    this.pivotArray[0] = 0
    for (let i = 0; ; i++) {
      const ssd = new SingleSourceDistances(this.graph, pivot, this.length)
      ssd.run()
      this.Result[i] = ssd.Result
      if (i + 1 < this.pivotArray.length) {
        // looking for the next pivot
        let argmax = 0
        for (let j = 0; j < this.Result[i].length; j++) {
          min[j] = Math.min(min[j], this.Result[i][j])
          if (min[j] > min[argmax]) {
            argmax = j
          }
        }

        pivot = nodes[argmax]
        this.pivotArray[i + 1] = argmax
      } else {
        break
      }
    }
  }
}
