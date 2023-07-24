import {copyTo} from '../../utils/copy'

export class LayerArrays {
  y: number[]

  verticesToX: number[]

  layers: number[][]

  constructor(verticesToLayers: number[]) {
    this.initialize(verticesToLayers)
  }

  initialize(verticesToLayers: number[]) {
    this.y = verticesToLayers
    this.verticesToX = null
    this.layers = null
  }

  // Returns the same arrays but with no empty layers.
  DropEmptyLayers(): LayerArrays {
    const drop = new Array<number>(this.Layers.length)
    let dropVal = 0
    for (let i = 0; i < this.Layers.length; i++) {
      drop[i] = dropVal
      if (this.Layers[i].length === 0) dropVal++
    }

    if (dropVal === 0) return this

    //we do have empty layers
    const ny = new Array<number>(this.y.length)
    for (let i = 0; i < ny.length; i++) ny[i] = this.y[i] - drop[this.y[i]]

    //copy the layers itself
    const nls = new Array<number[]>(this.layers.length - dropVal)
    for (let i = 0; i < this.layers.length; i++) {
      if (this.layers[i].length > 0) nls[i - drop[i]] = Array.from(this.layers[i])
    }

    const la = new LayerArrays(ny)
    la.layers = nls
    return la
  }

  updateLayers(ulayers: number[][]) {
    if (this.layers == null) this.InitLayers()

    for (let i = 0; i < this.layers.length; i++) copyTo(ulayers[i], this.layers[i])

    this.UpdateXFromLayers()
  }

  UpdateXFromLayers() {
    if (this.layers == null) this.InitLayers()

    if (this.verticesToX == null) this.verticesToX = new Array<number>(this.y.length)

    for (const layer of this.layers) {
      let i = 0
      for (const v of layer) this.verticesToX[v] = i++
    }
  }

  // gives the order of the vertices in the y-layer
  // <value></value>
  get x(): number[] {
    if (this.verticesToX != null) return this.verticesToX

    this.verticesToX = new Array<number>(this.y.length)

    this.UpdateXFromLayers()

    return this.verticesToX
  }

  // returns the layer hierarchy where the order of the layers is reversed
  ReversedClone(): LayerArrays {
    const rv = new Array<number>(this.y.length)
    const lastLayer = this.Layers.length - 1 //call Layers to ensure that the layers are calculated
    for (let i = 0; i < this.y.length; i++) rv[i] = lastLayer - this.y[i]
    return new LayerArrays(rv)
  }

  // Layers[i] is the array of vertices of i-th layer
  get Layers(): number[][] {
    if (this.layers != null) return this.layers

    this.InitLayers()

    return this.layers
  }

  set Layers(value) {
    this.layers = value
  }

  InitLayers() {
    //find the number of layers
    let nOfLayers = 0

    for (const l of this.y) {
      if (l + 1 > nOfLayers) nOfLayers = l + 1
    }

    const counts = new Array<number>(nOfLayers).fill(0)

    //find the number of vertices in the layer
    for (const l of this.y) counts[l]++

    this.layers = new Array<number[]>(nOfLayers)

    for (let i = 0; i < nOfLayers; i++) {
      this.layers[i] = new Array<number>(counts[i])
      counts[i] = 0 //we reuse these counts below
    }

    for (let i = 0; i < this.y.length; i++) {
      const l = this.y[i]
      this.layers[l][counts[l]++] = i
    }
    /*Assert.assert(layersAreCorrect(this))*/
  }
}
export function layersAreCorrect(layerArrays: LayerArrays): boolean {
  if (layerArrays.layers == null) return true
  for (const layer of layerArrays.layers) {
    if (layerHasDublicatesOrUndef(layer)) {
      return false
    }
  }
  return true
}

export function layerHasDublicatesOrUndef(layer: number[]) {
  const s = new Set<number>()
  for (const v of layer) {
    if (v == null) {
      return true
    }
    if (s.has(v)) return true
    s.add(v)
  }
  return false
}
