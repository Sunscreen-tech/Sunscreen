import {Block} from './Block'

export class BlockVector {
  Vector: Array<Block>
  get Count(): number {
    return this.Vector.length
  }

  item(index: number): Block {
    return this.Vector[index]
  }

  constructor() {
    this.Vector = new Array<Block>()
  }

  Add(block: Block) {
    block.VectorIndex = this.Vector.length
    this.Vector.push(block)
    /*Assert.assert(
      this.Vector[block.VectorIndex] === block,
      'Inconsistent block.VectorIndex',
    )*/
  }

  Remove(block: Block) {
    /*Assert.assert(
      this.Vector[block.VectorIndex] === block,
      'Inconsistent block.VectorIndex',
    )*/
    const swapBlock = this.Vector[this.Vector.length - 1]
    this.Vector[block.VectorIndex] = swapBlock
    swapBlock.VectorIndex = block.VectorIndex
    this.Vector.pop()
  }

  toString(): string {
    return this.Vector.toString()
  }
}
