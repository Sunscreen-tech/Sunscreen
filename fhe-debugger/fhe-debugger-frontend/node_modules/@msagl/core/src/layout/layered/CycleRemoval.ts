import {IEdge} from '../../structs/iedge'
import {BasicGraphOnEdges} from '../../structs/basicGraphOnEdges'
import {IntPair} from '../../utils/IntPair'
import {IntPairSet} from '../../utils/IntPairSet'

import {Stack} from 'stack-typescript'
import {IntPairMap} from '../../utils/IntPairMap'

enum VertStatus {
  NotVisited,
  InStack,
  Visited,
}
class StackStruct {
  v: number // vertex of the edge enumeration
  i: number // the index in the outEdges array
  constructor(v: number, i: number) {
    this.v = v
    this.i = i
  }
}

export class CycleRemoval {
  static getFeedbackSetWithConstraints(arg0: BasicGraphOnEdges<IntPair>, arg1: IntPairSet): IntPair[] {
    throw new Error('Method not implemented.')
  }

  static push(stack: Stack<StackStruct>, status: VertStatus[], v: number, i: number) {
    status[v] = VertStatus.InStack
    stack.push(new StackStruct(v, i))
  }

  static getFeedbackSet(graph: BasicGraphOnEdges<IEdge>): IEdge[] {
    const feedbackSet = new IntPairMap<IEdge>(graph.nodeCount)
    if (graph == null || graph.nodeCount === 0) return []
    const status = new Array<VertStatus>(graph.nodeCount).fill(VertStatus.NotVisited)
    for (let vertex = 0; vertex < graph.nodeCount; vertex++) {
      if (status[vertex] === VertStatus.Visited) continue

      /*Assert.assert(status[vertex] !== VertStatus.InStack)*/

      const stack = new Stack<StackStruct>() //avoiding the recursion
      let i = 0 // the index in the outEnum
      CycleRemoval.push(stack, status, vertex, i)
      while (stack.size > 0) {
        const s = stack.pop()
        vertex = s.v
        status[vertex] = VertStatus.Visited
        i = s.i
        let outEnum = graph.outEdges[vertex]
        for (; i < outEnum.length; i++) {
          const e = outEnum[i]

          if (e.source === e.target) continue

          const targetStatus = status[e.target]
          if (targetStatus === VertStatus.InStack) {
            feedbackSet.set(e.source, e.target, e)
          } else if (targetStatus === VertStatus.NotVisited) {
            //have to go deeper
            CycleRemoval.push(stack, status, vertex, i + 1)
            vertex = e.target
            status[e.target] = VertStatus.Visited
            outEnum = graph.outEdges[vertex]
            i = -1
          }
        }
      }
    }
    return Array.from(feedbackSet.values())
  }
}
