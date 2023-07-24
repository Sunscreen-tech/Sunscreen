// Type definitions for ngraph.events v1.0.0
// Project: https://github.com/anvaka/ngraph.graph
// Definitions by: Tobias Kopelke <https://github.com/lordnox>

declare module "ngraph.events" {
  // define keys that are allowed as event names
  export type EventKey = string | number | Symbol
  // define basic function that is allowed for event listeners
  export type EventCallback = (...args: any[]) => void

  // defined additional event properties that will be added by eventify
  export interface EventedType {
    on: (eventName: EventKey, callback: EventCallback, ctx?: any) => this
    off: (eventName?: EventKey, callback?: EventCallback) => this
    fire: (eventName: EventKey, ...args: any[]) => this
  }

  // extend generic object type as Generic but remove the on, off, fire properties
  export default function eventify<Type extends {}>(subject: Type & {
    on?: never
    off?: never
    fire?: never
  }): EventedType & Type
}
