import {IEdge} from './../../structs/iedge'
// keeps the basic info on an edge for sugiyama settings
export interface IIntEdge extends IEdge {
  separation: number
  weight: number
  CrossingWeight: number
}
