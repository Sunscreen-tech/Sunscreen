import {Queue} from 'queue-typescript'
import {BasicGraphOnEdges} from '../../structs/basicGraphOnEdges'
import {IEdge} from '../../structs/iedge'

export function* GetConnectedComponents<TEdge extends IEdge>(graph: BasicGraphOnEdges<TEdge>): IterableIterator<number[]> {
  const enqueueed = new Array(graph.nodeCount).fill(false)

  const queue = new Queue<number>()
  for (let i = 0; i < graph.nodeCount; i++) {
    if (!enqueueed[i]) {
      const nodes = new Array<number>()
      Enqueue(i, queue, enqueueed)
      while (queue.length > 0) {
        const s: number = queue.dequeue()
        nodes.push(s)
        for (const neighbor of Neighbors(graph, s)) {
          Enqueue(neighbor, queue, enqueueed)
        }
      }
      yield nodes
    }
  }
}

function* Neighbors<TEdge extends IEdge>(graph: BasicGraphOnEdges<TEdge>, s: number): IterableIterator<number> {
  for (const e of graph.outEdges[s]) {
    yield e.target
  }
  for (const e of graph.inEdges[s]) {
    yield e.source
  }
}

function Enqueue(i: number, q: Queue<number>, enqueueed: boolean[]) {
  if (enqueueed[i] === false) {
    q.enqueue(i)
    enqueueed[i] = true
  }
}
