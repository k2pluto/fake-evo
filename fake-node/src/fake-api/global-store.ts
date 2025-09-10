class GlobalStore {
  streamHost1: string = 'live1.egcvi.com'

  setStreamHost1(streamHost1: string) {
    this.streamHost1 = streamHost1
  }
  getStreamHost1() {
    return this.streamHost1
  }

  cdn: string = 'https://static.egcdn.com'
  getCdn() {
    return this.cdn
  }
}

export const globalStore = new GlobalStore()
