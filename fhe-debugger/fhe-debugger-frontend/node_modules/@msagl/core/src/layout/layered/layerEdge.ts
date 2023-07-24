import {String} from 'typescript-string-operations'
export class LayerEdge {
  Weight: number
  CrossingWeight: number
  Source: number
  Target: number
  constructor(source: number, target: number, crossingWeight: number, weight = 1) {
    this.Source = source
    this.Target = target
    this.CrossingWeight = crossingWeight
    this.Weight = weight
  }
  toString() {
    return String.Format('{0}->{1}', this.Source, this.Target)
  }
}
