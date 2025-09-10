//import TEST from './test'
import PROD from './prod'
import { CXEnv } from '../cx'
import { HonorLinkEnv } from '../honorlink'
import { AlphaEnv } from '../alpha'
import { UnionGameEnv } from '../union-game'
import { EvolutionEnv } from '../evolution'

export interface ThirdPartyEnvironments {
  CX_ENV: CXEnv
  HONORLINK_ENV: HonorLinkEnv
  FAKEHONOR_ENV: HonorLinkEnv
  FAKECX_ENV: CXEnv

  ALPHA_CIDER_ENV: AlphaEnv

  CHOI_EVOLUTION_ENV: EvolutionEnv

  UNIONGAME_COOL_ENV: UnionGameEnv
}

const rawConfig: ThirdPartyEnvironments = {} as any

export const envTable = {
  //test: Object.assign(rawConfig, TEST),
  prod: Object.assign(rawConfig, PROD),
} satisfies { [key: string]: ThirdPartyEnvironments }

export const env: ThirdPartyEnvironments = envTable[process.env.STAGE_ENV] ?? rawConfig
