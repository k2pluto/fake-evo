import { Vendor } from '.'

export class ThirdPartyRedirect extends Vendor {
  constructor(params: Partial<Vendor> = {}) {
    super({ ...params, redirect: true })
  }
}
