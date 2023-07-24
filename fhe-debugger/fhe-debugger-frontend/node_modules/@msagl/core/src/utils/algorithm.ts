import {CancelToken} from './cancelToken'

export abstract class Algorithm {
  ProgressStep() {
    // todo: Implement
  }
  constructor(cancelToken: CancelToken) {
    this.cancelToken = cancelToken
  }
  abstract run(): void
  cancelToken: CancelToken
}
