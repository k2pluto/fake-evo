import type { Config } from 'jest'

const config: Config = {
  verbose: false,
  silent: false,
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  //__tests__ 폴더에 있는 .test.ts 파일만 테스트한다.
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  testTimeout: 300_000,
  //rootDir: 'src',
  //testRegex: '.spec.ts$',
  /*transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  }, */
  //coverageDirectory: './coverage',
  moduleNameMapper: {
    '^@service/(.*)$': '<rootDir>/./service/$1',
  },
  testEnvironment: 'node',
}

export default config
