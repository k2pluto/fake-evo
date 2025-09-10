// import { env } from '@service/src/vendor/env'
// 히스토리에서 STAGE_ENV를 다르게 적용해서 PROD 만 넣게 수정
import PROD from '@service/src/vendor/env/prod'

import { ThirdPartyHonorLink } from '@service/src/vendor/honorlink/index'
import { ThirdPartyCX } from '@service/src/vendor/cx'
import { ThirdPartyAlpha } from '@service/src/vendor/alpha'
import { ThirdPartyUnionGame } from '@service/src/vendor/union-game'
import { VendorCode } from '@service/src/lib/common/types/vendor-code'
import { ThirdPartyEvolution } from '@service/src/vendor/evolution'

export const honorlink = new ThirdPartyHonorLink({ env: PROD.FAKEHONOR_ENV })

export const alpha = new ThirdPartyAlpha({ env: PROD.ALPHA_CIDER_ENV })

export const star_cx = new ThirdPartyCX({ env: PROD.FAKECX_ENV })

export const cider_cx = new ThirdPartyCX({ env: PROD.CX_ENV })

export const uniongame = new ThirdPartyUnionGame({ env: PROD.UNIONGAME_COOL_ENV })
export const evolution = new ThirdPartyEvolution({ env: PROD.CHOI_EVOLUTION_ENV })

export const fakeVendors = {
  [VendorCode.UnionGame_Cool_Evolution]: uniongame,
  [VendorCode.Alpha_Cider_Evolution]: alpha,
  [VendorCode.CX_Star_Evolution]: star_cx,
  [VendorCode.FakeChoi_Evolution]: evolution,
  [VendorCode.HonorLink_KSlot3_Evolution]: honorlink,
}
