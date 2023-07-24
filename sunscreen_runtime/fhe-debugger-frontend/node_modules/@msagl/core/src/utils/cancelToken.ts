// a place holder for the cancelled flag
export class CancelToken {
  throwIfCanceled() {
    throw new Error('Algorithm was cancelled')
  }
  canceled_: boolean

  // Set this flag to true when you want to cancel the layout.
  get canceled() {
    return this.canceled_
  }
  set canceled(value) {
    this.canceled_ = value
  }
}
