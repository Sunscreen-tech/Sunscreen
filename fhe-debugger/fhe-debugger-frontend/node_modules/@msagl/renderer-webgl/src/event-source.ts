export interface Event {
  type: string
  target?: any
}

type Listener = (evt: Event) => any

type ListenerRegistry = {[type: string]: Listener[]}

function addEventListener(type: string, listener: Listener, registry: ListenerRegistry) {
  registry[type] = registry[type] || []
  if (registry[type].indexOf(listener) < 0) {
    // Does not exist
    registry[type].push(listener)
  }
}

function removeEventListener(type: string, listener: Listener, registry: ListenerRegistry) {
  if (registry[type]) {
    const index = registry[type].indexOf(listener)
    if (index >= 0) {
      registry[type].splice(index, 1)
    }
  }
}

/**
 * An event source can emit events and register event listeners
 */
export default class EventSource {
  _listeners: ListenerRegistry = {}
  _onceListeners: ListenerRegistry = {}

  /**
   * Adds a listener to a event type.
   */
  on(type: string, listener: Listener) {
    addEventListener(type, listener, this._listeners)
  }

  /**
   * Adds a listener that will be called only once to a event type.
   */
  once(type: string, listener: Listener) {
    addEventListener(type, listener, this._onceListeners)
  }

  /**
   * Removes a previously registered event listener.
   */
  off(type: string, listener: Listener) {
    removeEventListener(type, listener, this._listeners)
    removeEventListener(type, listener, this._onceListeners)
  }

  emit(eventOrType: string | Event) {
    let event: Event
    if (typeof eventOrType === 'string') {
      event = {type: eventOrType}
    } else {
      event = eventOrType
    }

    const type = event.type

    if (!this._listens(type)) {
      return
    }
    event.target = this

    // adding or removing listeners inside other listeners may cause an infinite loop
    const listeners = this._listeners[type]?.slice() || []

    for (const listener of listeners) {
      listener.call(this, event)
    }

    const onceListeners = this._onceListeners[type]?.slice() || []
    for (const listener of onceListeners) {
      removeEventListener(type, listener, this._onceListeners)
      listener.call(this, event)
    }
  }

  /**
   * Returns true if we have a listener for the event type.
   */
  private _listens(type: string): boolean {
    return (
      (this._listeners[type] && this._listeners[type].length > 0) || (this._onceListeners[type] && this._onceListeners[type].length > 0)
    )
  }
}
