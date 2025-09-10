import { ApiCode } from '../../lib/common/types/api-code'
import { ThirdPartyEnvironments } from '.'

const DRAGOON_SOFT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAMHzv3HVcOiQhHi+
jeva81kYtauB/kELzSZItEYAJdjeg6BMCbKumRpi0605UkfOidxp8Qew2HNGLmuf
nr8+QyWaz9McDXFmt9/YCad0hsTMJ9SMp3Ybt195fK6Pxh+FzHo6cI0/T3hgjZD9
hQDCbWwe6jnv4+bl+gJOckqtIyrZAgMBAAECgYEAtfLdkYPDhVk1/TP+XdmsWtQU
cc3kYM8aaKTiAZ1X5AhzAOj0XBzxYlB99c6FgvmeWRlF1YowtIuNNseqnAxj3fwe
KQkTnXX3zYCAYOvJpIB4mqlYJocHTsDPjAtZJXI0EvlV7E49FmGdvh2A0+c3Y83v
7P2iQ43RSO5PNi2wSUUCQQDjn9ANKjdLeO+RBpo0/E5eOKAxrTzwT221rYrXMLhs
G3n6QP4O8T9RabEBDi9FCi9YEvOhU9F+NXRCUY2xwmfrAkEA2iFau2P/RKzpye3h
extrOVPP06w0gEd84C9OHS+/FgVW/KojKh3OEbvVPxpto7tOxp4AKwPAYN+BLbFA
kt7rSwJBAIdXQ4ZAXqZSXuc1LMVqa1JciutenQgpwgqvCAmRH2awI6Ontye9S6+l
jygYfgSn3KSaiB+ZTcukDt9LzFswQ0cCQFVyC2CsYyo7sbjv/guDShVCx35bTpWR
a1FGNosoUOoHXXPMEcpFspsvwPDfIWOp08npypcO+ST5aFjFvk3KFNECQQCW/uGG
uNoDRgJbUaouhTciZF6kJYSgTZFLCoTfGoDt8sppYuGD7x5mcdnjK+mKarmO2aof
5uwgk+EY9fhYGRPl
-----END PRIVATE KEY-----`

export default {
  JJ_EVOLUTION_ENV: {
    CASINO_ID: 'babylonrd0000001',

    API_URL: 'https://babylonrd.evo-games.com',

    UA2_TOKEN: '8dea7debf72dec7e47265e86cecbe43d260690f7',

    GAME_HISTORY_API_TOKEN: 'af548d617131c10355e25a6401ec317459bc2aef',

    EXTERNAL_LOBBY_API_TOKEN: '02d9dde68c27aefe2aec3ec534e0450ee339ccf8',

    AUTH_TOKEN: 'cef92cef0514bb134a281f6fc4b5bc4c',
  },

  CHOI_EVOLUTION_ENV: {
    CASINO_ID: 'tmkrst8000000001',

    API_URL: 'https://tmkrst8.evo-games.com',

    UA2_TOKEN: '428402a36cd99be517302d9a58e5048375183a12',

    GAME_HISTORY_API_TOKEN: '97705eda1ac601ad9cc275633d9de43b90b18339',

    EXTERNAL_LOBBY_API_TOKEN: '59bb44e76981b7d19201424b6492b9512c683da6',

    AUTH_TOKEN: 'authToken_is_unknown',
  },

  TIMELESS_EVOLUTION_ENV: {
    GAME_LAUNCH_URL: 'https://launch.timelesstech.org',
    API_URL: 'https://air.gameprovider.org',
    HISTORY_URL: 'https://hh.gameprovider.org',
    OPERATOR_ID: 'ganymede1',
    SECRET_KEY: '8QNd8hUGe6!zBINcR',
    GAME_ID: 'lobby_id=evolution_top_games',
  },
  TIMELESS_HABANERO_SLOT_ENV: {
    GAME_LAUNCH_URL: 'https://launch.timelesstech.org',
    API_URL: 'https://air.gameprovider.org',
    HISTORY_URL: 'https://hh.gameprovider.org',
    OPERATOR_ID: 'ganymede1',
    SECRET_KEY: '8QNd8hUGe6!zBINcR',
  },
  WANMEI_ENV: {
    API_URL: 'http://wmwb-001.wmapi88.com/api/wallet/Gateway.php',
    SIGNATURE: '9f1c856240f0712fee38a9d7d546c318',
    VENDOR_ID: 'RT228ag',
  },

  SEXY_CASINO_ENV: {
    API_URL: 'https://gciap.usplaynet.com',
    CERT: 'IA1S2JrvXdsQFTZnQ83',
    AGENT_ID: 'europa',
    BET_LIMIT: '120810',
    PLATFORM: 'SEXYBCRT',
    GAME_TYPE: 'LIVE',
    GAME_CODE: 'MX-LIVE-001',
  },

  SEXY_SLOT_ENV: {
    API_URL: 'https://gciap.usplaynet.com',
    CERT: 'IA1S2JrvXdsQFTZnQ83',
    AGENT_ID: 'europa',
    BET_LIMIT: '120810',
    PLATFORM: 'AWS',
  },

  ASIA_GAMING_CASINO_ENV: {
    API_URL: 'https://swapi.agingames.com/resource/',
    CREATE_API_URL: 'https://gi.liveeuropa.com/doBusiness.do',
    SESSION_API_URL: 'https://swapi.agingames.com/resource/player-tickets.ucs',
    FOWARD_API_URL: 'https://gci.liveeuropa.com/forwardGame.do',
    CAGENT: 'KF0_AGIN',

    MD5_KEY: 'kf0CThEuSYaL',
    DES_KEY: 'kf0PmGVA',
    GAME_TYPE: '0',
  },
  ASIA_GAMING_SLOT_ENV: {
    API_URL: 'https://swapi.agingames.com/resource/',
    CREATE_API_URL: 'https://gi.liveeuropa.com/doBusiness.do',
    SESSION_API_URL: 'https://swapi.agingames.com/resource/player-tickets.ucs',
    FOWARD_API_URL: 'https://gci.liveeuropa.com/forwardGame.do',
    CAGENT: 'KF0_AGIN',

    MD5_KEY: 'kf0CThEuSYaL',
    DES_KEY: 'kf0PmGVA',
    GAME_TYPE: 'FRU',
  },

  ZENITH_DREAM_GAMING_ENV: {
    AGENT_ID: 'DG08270500',
    API_KEY: 'fb1450f4e73d413e9becc19910ebc8b6',
  },

  JJ_DREAM_GAMING_ENV: {
    AGENT_ID: 'DG09040301',
    API_KEY: '3d75bc6bcb6c4a9aad46c8287a10b493',
  },

  ALLBET_ENV: {
    API_URL: 'https://sw2.absvc.net',
    API_KEY: 'vgwHN/GU1XkguGA3Erq+zff0ZLV02PnWp0DMeIWeb4tlWLhW4BjaNE2eI4Ibn//66rukaaiaCrKVXMXcg8ZRDA==',
    CALLBACK_KEY: 'JR78eet4l/XLT7tHE7faCj8xOmMBeTe48SRU+Et3W2MfVMf8aAYszBihVkUnXUTAixvLhmq5/T+ghtj5kech0A==',
    OPERATOR_ID: '0222399',
    AGENT: 'gany1y6',
    SUFFIX: '6fz',
  },

  ORIENTAL_GAMING_ENV: {
    API_URL: 'https://apollo.all5555.com',
    OPERATOR_ID: 'mog682zf228',
    PUBLIC_KEY: 'jSrqaH2Q9kQ4mcVu',
    PRIVATE_KEY: 'Z5xAJxyFAaS9Da2b',
    BET_LIMIT: 89,
  },

  PRAGMATIC_PLAY_CASINO_ENV: {
    GAME_LAUNCH_URL: 'https://europa.prerelease-env.biz/gs2c/playGame.do',
    API_URL: 'https://api-sg13.ppgames.net/IntegrationService/v3/http',
    DATAFEEDS_URL: 'https://api-sg13.ppgames.net/IntegrationService/v3/DataFeeds/gamerounds/finished',
    SECRET_KEY: '76337cD02dB54c19',
    SECURE_LOGIN: 'europa_europa2',
    SYMBOL: '101',
  },
  PRAGMATIC_PLAY_SLOT_ENV: {
    GAME_LAUNCH_URL: 'https://europa.prerelease-env.biz/gs2c/playGame.do',
    API_URL: 'https://api-sg13.ppgames.net/IntegrationService/v3/http',
    SECRET_KEY: '76337cD02dB54c19',
    SECURE_LOGIN: 'europa_ganymede',
  },
  HABANERO_SLOT_ENV: {
    API_URL: 'https://ws-a.insvr.com/jsonapi',
    LAUNCH_URL: 'https://app-a.insvr.com/go.ashx',
    API_KEY: '1B5726C2-2783-4BCD-98DC-F25F4C86FEF5',
    BRAND_ID: '1ae7cfbf-0f1d-ed11-bd6e-00155db8daba',
    PASS_KEY: 'prodkeyaabb33',
  },
  CX_ENV: {
    API_URL: 'https://api.vedaapi.com',
    OP_KEY: '4b378de64f1f1cc97866657e36dfe0a4',
  },
  BOOONGO_SLOT_ENV: {
    API_URL: 'https://gate.c2.bng.games/op',
    API_TOKEN: 'KRGs6ZsWGk',
    PROJECT_NAME: 'zfrt228',
  },
  CG_ENV: {
    API_URL: 'http://creativegame-dev.cg11systems.com:8088',
    LAUNCH_URL: 'https://creativegame-client.cg11pro.com',
    CHANNEL_ID: '32840',
    SECRET_KEY: 'SQ3fV6YXOpnOl2F3qqPfyXVGAdi0IYX/yNUMBP742vk=',
    SECRET_IV: 'en3DyENzXg8BYJNWmgmXlA==',
    WTOKEN: 'europa',
  },
  PLAYNGO_ENV: {
    API_URL: 'https://api-as.playngonetwork.com',
    LAUNCH_URL: 'https://bsicw.playngonetwork.com',
    USERNAME: 'xvtapi',
    PASSWORD: 'xPIMiESrybtxNyTozmdLhopPZ',
    PID: '1305',
    ACCESS_TOKEN: 'WadufdQujMrpugaToIUQZQHjR',
  },
  DRAGOON_SOFT_ENV: {
    API_URL: 'https://api.sysonline.club',
    CHANNEL_ID: '19354184',
    AGENT_ID: 'EEUR0001KRW',
    PRIVATE_KEY: DRAGOON_SOFT_PRIVATE_KEY,
  },
  WORLD_ENTERTAINMENT_ENV: {
    API_URL: 'https://web-game-fe-op.aeweg.com',
    APP_SECRET: 'xnGiQN5CLzcvoRaPVpKh8TyzxvAcKX8FasSQsOldFFU=',
    OPERATOR_ID: 'ganylogingt420',
  },
  CQ9_ENV: {
    API_URL: 'https://apie.cqgame.cc',
    API_TOKEN:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiI2MzRjZWFhMDlmYWI1OTY2ZDMxNjI0ZWUiLCJhY2NvdW50IjoiUlQyMjhLUldwcm9kIiwib3duZXIiOiI1YjZiZDQ5ZTUyZTI2NTAwMDE2NjExZmIiLCJwYXJlbnQiOiI1YjZiZDQ5ZTUyZTI2NTAwMDE2NjExZmIiLCJjdXJyZW5jeSI6IktSVyIsImp0aSI6IjgyMTYwMDIwMiIsImlhdCI6MTY2NTk4NTE4NCwiaXNzIjoiQ3lwcmVzcyIsInN1YiI6IlNTVG9rZW4ifQ.gpV_0IQ3VCMxtaPdeFeUPgWvDtCM2CjpJISYLG9kmv0',
  },
  HONORLINK_ENV: {
    API_TOKEN: 'E1D2IRFddcSbV4R3f8ynMe289xggHXm3KJ9sievb',
  },
  FAKEHONOR_ENV: {
    API_TOKEN: 'HzXz62mp3HZsInwTFVnJvlfsJfjZzxuFmG7bvklS',
  },
  FAKECX_ENV: {
    API_URL: 'https://api.vedaapi.com',
    OP_KEY: 'c9a83376c454d0060dc09c8801fd44f2',
    THIRDPARTY_CODE: 1,
    GAME_CODE: 'top_games',
  },
  FAKESD_ENV: {
    SECRET_KEY: '70515136585756744',
    CLIENT_ID: '1122',
  },
  MICROGAMING_ENV: {
    AGENT_CODE: 'rt228krwag',
    AGENT_PASS: '98d4b8e64b434ee1b2c02f53d580fc',
    API_URL: 'https://api-powerasiasw.k2net.io',
    API_TOKEN: 'https://sts-powerasiasw.k2net.io',
  },

  BLACKMAMBA_MICROGAMING_ENV: {
    API_CODE: ApiCode.JJ_MicroGaming,
    AGENT_CODE: 'bmagent',
    AGENT_PASS: '27ab343dd9584f3a8beb83f600c926',
    API_URL: 'https://api-blackmamba2sw.k2net.io',
    API_TOKEN: 'https://sts-blackmamba2sw.k2net.io',
  },

  SPINIX_ENV: {
    API_URL: 'https://production.spinix.com/provider/api/v2/ext',
    PLATFORM_ID: '63d8821fb09a54d5295eca06',
    SECRET_KEY: 'Basic bWFzdGVyX1pGUlQyMjg6VkQ4ckc9SC9aP0hYPCdydQ==',
    SIGNATURE_KEY: '61ed7eed705e2ae12c9e05760a077141',
  },
  YGG_ENV: {
    API_URL: 'https://atp.dcgames.asia',
    TOP_ORG: '568winGroup',
    ORG: 'ZFRT228',
    SIGN_KEY: '3FCDAAE7330F4C48B2607776C6EF5D1C',
  },
  NAGA_GAMES_ENV: {
    API_URL: 'http://api.topgames.live',
    GROUP_CODE: 'eear',
    BRAND_CODE: 'pddd',
  },
  LGD_GAMING_ENV: {
    API_URL: 'http://api-dtservice.com/dtApiV2.html',
    API_KEY: '=UB2S2XpjmMDA6EXa2mp5F+dvCHFc8',
    PLATFORM_CODE: 'NNTI_ZFRTAPI_ZFRT228',
  },
  PGSOFT_ENV: {
    LAUNCH_URL: 'https://m.pgjksjk.com',
    API_URL: 'https://api.pg-bo.net/external',
    OPERATOR_TOKEN: '6E78AC29-695C-2CE4-261D-F55FB6290F66',
    SECRET_KEY: '68938BBCFEC2956B36192A7D461B4D47',
    SALT: '963F36844CDEA8388476AEA585B1447A',
  },
  ENDORPHINA_ENV: {
    EXT_URL: 'https://google.com',
    ENDO_URL: 'https://cdna.endorphina.network',
    NODE_ID: 155,
    PID: 'pluto',
    SECRET_KEY: '694B01D5893841B1B449A2F904870CEF',
  },

  BIG_GAMING_ENV: {
    API_URL: 'http://n1api.trarot.com/open-cloud/api/',
    SN: 'qt12',
    SECRET_KEY: '9D460530D4CC45B09A3167506C852402',
    AGENT_LOGIN: 'rootagent',
    AGENT_PW: 'abcdefg123456',
  },
  QUEENMAKER_ENV: {
    API_URL: 'https://api.queenmakergames.co',
    GAME_URL: 'https://lobby.queenmakergames.co',

    CLIENT_ID: 'pluto',
    CLIENT_SECRET: '3Y445xH6LUaWQKs2VkhNcyZTvF7VkMVhVcsntb3CYAL',
  },
  BETIXON_ENV: {
    API_URL: 'https://glm.btxgames.com',
    USER: 'pluto_pd',
    PASS: 'OIuehggdDD!',
  },

  PLAYSTAR_ENV: {
    API_URL: 'http://api-sel2-g2.fzcugfwt.com',
    HOST_ID: 'de64230231c4243372a2f11b623d26c7',
  },
  ALPHA_CIDER_ENV: {
    API_URL: 'https://api.alpha333.com/api',
    API_TOKEN: '6xPeiHEcaYghKfVsvhrKyAH0odNk3z1MWIQgk1em',
  },
  UNIONGAME_COOL_ENV: {
    API_URL: 'https://api.uniongame.org',
    AGENT_NAME: 'cool',
    API_TOKEN: '7d55acaba1a6b4c846ba0b894c1fa3da',
  },
  MEGAHOLDEM_ENV: {
    API_KEY: 'bf91e542-e868-4c7c-841a-de48b643104c',
  },
  SMARTSOFT_ENV: {
    PORTAL_NAME: 'pluto',
    SECRET_KEY: '56310520-5350-72e9-c903-f79820a78375',
    API_URL: 'http://sg-server.ggravityportal.com',
  },
  GEMINI_GAMING_ENV: {
    //API_URL: 'https://uat-wallet-api.elsgame.cc/api/v1',
    API_URL: 'https://game-api.geminiservice.cc/api',
    SECRET_KEY: 'uQP85uK7bRFSFCvZ7D',
    PRODUCT_ID: 'GMM3644',
  },
  POP_OK_ENV: {
    API_URL: 'https://se1.pokgaming.com',
    PLATFORM_ID: '32',
    PARTNER_ID: '1',
    PRIVATE_KEY: 'utj3Gfrr0W9fs',
  },
  VIVO_GAMING_ENV: {
    API_URL: 'http://games.vivogaming.com',
    PASS_KEY: '7f1c5d',
    OPERATOR_ID: '3005660',
    SERVER_ID: '6401748',
  },
  BOTA_ENV: {
    API_URL: 'https://tigerapi-00.com/api/',
    //TOKEN: '22fab3483d165617490dd7909e994ea3cc684413cd9065da752f8dd0990e600a',
    TOKEN: '1a5d0f7e3073e35a1939a0e7e95445d544cc197da56df0592a8dc7ac8f943f1a',
    PREFIX: 'bibi_',
  },
  GOLDLION_ENV: {
    API_URL: 'https://api2.goldlion-casino.com/api/casinoapi',
    AGENT_CODE: 'tkdlek2000',
    API_KEY: '79356a3161616d657569346879773037',
  },
  BTI_ENV: {
    BT1_URL: 'https://prod20272-140755725.442hattrick.com',
    SLA_URL: 'https://prod20300-140755634.442hattrick.com',
  },
  REALGATES_ENV: {
    API_URL: 'https://api.real-gates.com/api',
    API_KEY: '00bf7ee4d0ae88919d26cf55961dcb52',
  },
  TRIPPLE_A_ENV: {
    API_URL: 'https://dev.triple-a.cc/api',
    API_KEY: 'gsBiDNbzSP8pya0AKLJ27Wlo',
  },
} as ThirdPartyEnvironments
