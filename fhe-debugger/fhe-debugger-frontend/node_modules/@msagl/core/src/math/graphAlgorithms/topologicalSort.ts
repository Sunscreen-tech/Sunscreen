import {IntPair} from './../../utils/IntPair'
import {BasicGraphOnEdges, mkGraphOnEdgesN} from './../../structs/basicGraphOnEdges'
import {Stack} from 'stack-typescript'

// Implements the topological sort
import {IEdge} from './../../structs/iedge'

export function hasCycle(g: BasicGraphOnEdges<IEdge>): boolean {
  const visited = new Array(g.nodeCount).fill(false)
  const reachableFromU = new Array(g.nodeCount).fill(false)
  for (let u = 0; u < g.nodeCount; u++) {
    if (hasCycleUnder(g, u, visited, reachableFromU)) return true
  }

  return false
}

export class TopologicalSort {
  // Topological sort of a list of int edge tuples
  static getOrder(numberOfVertices: number, edges: [number, number][]): number[] {
    const dag = mkGraphOnEdgesN(
      edges.map(([u, v]) => new IntPair(u, v)),
      numberOfVertices,
    )

    //Assert.assert(!hasCycle(dag), 'no cycles')
    return TopologicalSort.getOrderOnGraph(dag)
  }

  // The function returns an array arr such that
  // every edge points forward in the array. The input has to be a DAG
  static getOrderOnGraph(graph: BasicGraphOnEdges<IEdge>): number[] {
    // Assert.assert(!hasCycle(graph))
    const visited = new Array<boolean>(graph.nodeCount).fill(false)

    //no recursion! So we have to organize a stack
    const se = new Stack<{edges: IEdge[]; index: number; current_u: number}>()

    const order: number[] = []

    let en: IEdge[]
    for (let u = 0; u < graph.nodeCount; u++) {
      if (visited[u]) continue

      let cu = u
      visited[cu] = true
      let i = 0

      en = graph.outEdges[u]
      do {
        for (; i < en.length; i++) {
          const v = en[i].target
          if (!visited[v]) {
            visited[v] = true
            se.push({edges: en, index: i + 1, current_u: cu})
            cu = v
            en = graph.outEdges[cu]
            i = -1
          }
        }
        order.push(cu)

        if (se.length > 0) {
          const t = se.pop()
          en = t.edges
          i = t.index
          cu = t.current_u
        } else break
      } while (true)
    }
    return order.reverse()
  }
}
function hasCycleUnder(g: BasicGraphOnEdges<IEdge>, u: number, visited: boolean[], reachableFromU: boolean[]): boolean {
  if (reachableFromU[u]) {
    return true
  }

  if (visited[u]) return false
  reachableFromU[u] = true
  visited[u] = true
  for (const e of g.outEdges[u]) {
    if (hasCycleUnder(g, e.target, visited, reachableFromU)) {
      return true
    }
  }
  reachableFromU[u] = false
  return false
}
