// var isEqual = require('lodash.isequal');
// import { isEqual } from 'lodash.isequal';
import { Column, Entity, ObjectIdColumn } from 'typeorm'

export interface EvolutionConfigData {
  table_id: string //  'puu43e6c5uvrfikr'
  casinoId: string //  'skylinemtgsea101'
  wait_for_video: string //  'false'
  session: string // 'online'
  playerId: string //  'qu2auabcbcjvo6r6'
  userType: 0
  lang: string // 'ko'
  client: string //  'generic'
  tippingEnabled: false
  newHistoryApi: false
  currencyCode: string // 'KRW'
  currencySymbol: string // '₩'
  currencyMult: number // 1000
  currencyDecimals: number // 0
  chipAmounts: string // '1000,2000,5000,25000,100000,500000,1000000,5000000'
  tableName: string //  '엠퍼러 스피드 바카라 B'
  table_name_id: string // 'Baccarat Kilat Emperor B'
  table_name_hi: string // 'एम्परर स्पीड बैकारेट बी'
  table_name_th: string //  'สปีดบาคาร่าจักรพรรดิบี'
  table_name_ko: string //  '엠퍼러 스피드 바카라 B'
  table_name_ja: string //  'エンペラー スピードバカラB'
  table_name_ms: string // 'Baccarat Emperor Speed B'
  table_name_cn: string //  '巨富中文极速百家乐B'
  table_name_b5: string // '巨富中文極速百家樂B'
  table_name_vi: string //  'Emperor Baccarat Nhanh B'
  table_type: string // 'bacpro:newhd'
  table_details_key: string // 'speed'
  player_min_bet: string // '1000.00'
  banker_min_bet: string // '1000.00'
  tie_min_bet: string // '1000.00'
  player_pair_min_bet: string // '1000.00'
  banker_pair_min_bet: string // '1000.00'
  either_pair_min_bet: string // '1000.00'
  perfect_pair_min_bet: string // '1000.00'
  player_bonus_min_bet: string // '1000.00'
  banker_bonus_min_bet: string //  '1000.00'
  super_six_min_bet: string // "500.00" 극상의 6 최소 베팅
  player_max_bet: string // '11000000.00'
  banker_max_bet: string // '11000000.00'
  tie_max_bet: string // '2500000.00'
  player_pair_max_bet: string // '2500000.00'
  banker_pair_max_bet: string // '2500000.00'
  either_pair_max_bet: string // '2500000.00'
  perfect_pair_max_bet: string // '100000.00'
  banker_bonus_max_bet: string // '500000.00'
  player_bonus_max_bet: string // '500000.00'
  super_six_max_bet: string // "250000.00" 극상의 6 최대 베팅
  ignoreNoDealer: false
  videoConfigUrl: string // '/player/games/assets/settings.xml'
  hideJoinLeftNotifications: string // 'false'
  sendMonitoringInfo: string // 'false'
  monsterDebugger: string // 'false'
  userActive: string // 'true'
  userBlocked: string // 'false'
  aams: string // 'false'
  idle_limit_games: string // '15'
  'view1-static-desktop': string //  'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bs_auto/manifest-ws.json'
  baccarat_type: string // 'quickup'
  bonus_main_bets_percentage: string // '50'
  'view1-mobile': string // 'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bi_auto/manifest-ws.json?minBitrate=LOW'
  priority: string // '1510'
  flipbook_stream_host_MY: string // 'sina-ufb01.hj8926.com'
  streamBaseName: string // 'eprca2_b'
  'view1-desktop': string // 'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bi_auto/manifest-ws.json'
  $$BaseCurrency: string // 'IDR'
  between_games_time: string // '5000'
  player_pair_reductions: string // '0:0.2'
  enable_flipbook: string // 'false'
  isDraggableChipSupported: string // 'true'
  'video-master-host_MY': string // 'live1.hj8926.com'
  'view2-desktop': string // 'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bi_auto/manifest-ws.json'
  result_delay: string // '1000'
  branded_menu_gradient_dark: string // '40,0,8'
  game_variant: string // 'quickup'
  use_new_help: string // 'true'
  default_view: string // 'hd1'
  appVersion: string // '4'
  'video-master-host_CN': string //  'ws.cheerstek.com'
  betting_time_long: string // '13000'
  game_type: string // 'baccarat'
  gameSubType?: string // 'lightning'
  faceLiftEnabledRelease: string // 'true'
  lobby_stream_url: string //  'wss://live2-lufb.egcvi.com/ws/video/30/eprca2_bi_med'
  burn_on_new_shoe: string //  'multi'
  graphical_mobileLoadingScreen: string // 'baccarat-speed_ba_loading-logo.e405554.svg'
  branded_cloth_gradient_dark: string // '40,0,8'
  multiplay_widget_available: string // 'true'
  'red_envelope.tie_reductions': string // '0:0.2'
  'default-chip': string // '1'
  baccarat_pro: string // 'true'
  card_delay: string // '1000'
  betting_time: string // '13000'
  enable_flipbook_desktop: string // 'false'
  bets_closing_time: string // '2000'
  flipbook_stream_host_CN: string // 'ws.gzqlzm.com'
  'view2-mobile': string // 'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bi_auto/manifest-ws.json?minBitrate=LOW'
  enable_cdn_skip_CN: string // 'true'
  'UNHIDE.FOR': string // 'LATVIA.LITHUANIA.ROMANIA.MADRID.MALTA'
  cards_out_to_trigger_main_only: string // '260'
  bet_acceptance_time: string // '3000'
  lobby_stream: string // 'eprca2_bs_med'
  bets_closing_delay: string // '500'
  winners_list_all: string // 'true'
  graphical_desktopLoadingScreen: 'string // speed-darkred_ba_loading-screen.98aeb20.jpg'
  audio_flv_stream: string //  'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bi_med_audioonly/manifest-ws.json'
  'UNHIDE.dm.cursorStyle': string // 'm'
  tie_reductions: string // '0:0.2'
  'video.flipbook.enable': string // 'true'
  aams_game_name: string //  'Baccarat'
  'red_envelope.banker_pair_reductions': string //  '0:0.2'
  'mob-video-playlist': string // '30/eprca2_bi_auto/?minBitrate=LOW'
  frontend_app: string // 'baccarat.v0'
  'red_envelope.player_pair_reductions': string // '0:0.2'
  manual_game_start: string // 'true'
  'UNHIDE.dm.nextDealer_enabled': string // 'true'
  tie_pays_9_to_1: string // 'false'
  'view2-static-desktop': string // 'https://live2.egcvi.com/cdn/app/30/amlst:eprca2_bs_auto/manifest-ws.json'
  red_envelope: string // 'false'
  audio_hls_stream: string // '/app/30/eprca2_bi_low_audioonly/playlist.m3u8'
  branded_menu_gradient_light: string // '97,0,18'
  smallVideoViewBG: string // '5C001D,5C001D,5C001D,5C001D'
  'UNHIDE.dm.notification_show_before': string // '720000'
  flipbook_stream_url: string // 'wss://live2-ufb.egcvi.com/ws/video/30/eprca2_bi_med'
  hide_hieroglyphs_langs: string // 'cn,b5,ja,ko,th'
  enable_web_audio: string //  'false'
  banker_pair_reductions: string // '0:0.2'
  branding: string // 'view1:BacSpeed'
  branded_cloth_gradient_light: string // '97,0,18'
  display: string // 'as_physical_table'
  hide_hieroglyphs_iso_langs: string //  'zh-Hans,zh-Hant,ja,ko,th'
  game: string // 'baccarat'
  game_provider: string // 'evolution'
  game_vertical: string // 'live'
  serverHost: string // 'skylinemtgsea1.evo-games.com'
  remoteIp: string // '15.164.203.201'
  videoLoggingEnabled: string // 'true'
  videoLoggingHeartbeatRate: number //  15
  provider: string // 'evolution'
  publicChatEnabled: boolean // true
  wrapper_token: string // 'eyJraWQiOiIxNjcwOTQwNTA0MTM4IiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJjdXIiOiJLUlciLCJndHAiOiJiYWNjYXJhdCIsInBpZCI6InF1MmF1YWJjYmNqdm82cjYiLCJleHAiOjE2NzIwNjMwNDksInRpZCI6InB1dTQzZTZjNXV2cmZpa3IiLCJjaWQiOiJza3lsaW5lbXRnc2VhMTAxIiwic2lkIjoicXUyYXVhYmNiY2p2bzZyNnF1N3E2dW5seXZhYnc2bXZjYjVmOTFiOSJ9.c9GzotNlruZGLn_q5S-nXqHlu14snqXj69tbt2oRBC_kwe-CG3QtFaE99kWEkeqUJ0CGlmTjvhHODD4hw0nx6g'
}

export interface EvolutionBetLimit {
  min: number
  max: number
}

// 키 벨류 콜렉션
@Entity('data_evolution_table')
export class DataEvolutionTable {
  @ObjectIdColumn()
  _id: string

  @Column()
  name: string

  @Column()
  nameKo: string

  @Column()
  gameType: string

  @Column()
  gameTypeUnified: string

  @Column()
  gameSubType: string

  @Column()
  provider: string

  @Column()
  description: string

  // tool의 update-evolution-table에서 업데이트되고 있었는데 두 개 이상의 벤더에서는 각각 다른 betLimits이 적용되므로 더이상 사용하면 안됨
  @Column()
  betLimits: Record<string, EvolutionBetLimit>

  // config api에서 받아온 데이터
  @Column()
  configData: EvolutionConfigData
}
