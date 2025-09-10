import { config } from '../config'
import { fakeBaccaratTables, fakeDragonTigerTables } from '../../common/fake-tables'
export const fakeTables = {
  ...fakeBaccaratTables,
  ...(config.fakeDragonTiger ? fakeDragonTigerTables : {}),
}
