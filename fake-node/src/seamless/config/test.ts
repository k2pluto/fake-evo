import { mongo_options, rdb_options } from '@service/src/connections/test'
import { ConfigData } from '.'

export default {
  ENV: 'test',

  PORT: 9000,

  // synchronize를 끄는 이유는 AWS Lambda 콜드 런치시에 끌 때는 1.5초에서 2초 사이로 걸리는데 켜면 4초 정도로 시간차이가 많이 나서 끔

  MONGO_OPTIONS: {
    ...mongo_options,
    synchronize: false,
    //entities: mongo_use_entities,
  },

  RDB_OPTIONS: {
    ...rdb_options,
    synchronize: false,
    //entities: rdb_use_entities,
  },
} as ConfigData
