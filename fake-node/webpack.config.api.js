const path = require('path')
const nodeExternals = require('webpack-node-externals')
const CopyPlugin = require('copy-webpack-plugin')
const { DefinePlugin } = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

console.log(__dirname)

const STAGE_ENV = process.env.STAGE_ENV || 'dev'

console.log(STAGE_ENV)

module.exports = {
  // entry를 따로 설정하지 않아도 됨
  entry: './dist/src/fake-api/main.js',
  target: 'node',
  //mode: serverlessWebpack.lib.webpack.isLocal ? 'development' : 'production',
  //mode: 'development',
  // development로 해두면 소스 용량이 너무 커져서 cold launch 시간이 너무 오래걸림
  mode: STAGE_ENV === 'prod' ? 'production' : 'development',
  // webpack의 critical warning 메시지를 피하기 위한 용도
  externals: [nodeExternals()],
  // inline-source-map을 켜두면 소스 용량이 너무 커져서 cold launch 시간이 너무 오래걸림
  devtool: STAGE_ENV === 'prod' ? undefined : 'inline-source-map',
  // console.log 제거 설정
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // 모든 console.* 제거
            pure_funcs: ['console.log', 'console.info', 'console.debug'], // 특정 console 메서드만 제거
          },
        },
      }),
    ],
  },
  //devtool: 'inline-source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    alias: {
      '@typeorm': path.resolve(__dirname, 'src/typeorm'),
      '@service': path.resolve(__dirname, 'service'),
    },
  },
  //plugins: [new BundleAnalyzerPlugin()],
  externals: {
    'class-serializer': 'class-serializer',
    'class-transformer': 'class-transformer',
    'class-validator': 'class-validator',
    'cache-manager': 'cache-manager',
    'fastify-static': 'fastify-static',
    '@nestjs/microservices': '@nestjs/microservices',
    '@nestjs/microservices/microservices-module': '@nestjs/microservices/microservices-module',
    '@nestjs/websockets/socket-module': '@nestjs/websockets/socket-module',
    'kerberos' : 'kerberos',
    '@mongodb-js/zstd' : '@mongodb-js/zstd',
    '@aws-sdk/credential-providers': '@aws-sdk/credential-providers',
    'gcp-metadata' : 'gcp-metadata',
    'snappy' : 'snappy',
    'socks' : 'socks',
    'aws4' : 'aws4',
    'mongodb-client-encryption' : 'mongodb-client-encryption',
    'cardinal' : 'cardinal',
    'react-native-sqlite-storage' : 'react-native-sqlite-storage',
    '@google-cloud/spanner' : '@google-cloud/spanner',
    '@sap/hana-client' : '@sap/hana-client',
    '@sap/hana-client/extension/Stream' : '@sap/hana-client/extension/Stream',
    'hdb-pool' : 'hdb-pool',
    'mysql' : 'mysql',
    'oracledb' : 'oracledb',
    'pg' : 'pg',
    'pg-native' : 'pg-native',
    'pg-query-stream' : 'pg-query-stream',
    'typeorm-aurora-data-api-driver' : 'typeorm-aurora-data-api-driver',
    'redis' : 'redis',
    'ioredis' : 'ioredis',
    'better-sqlite3' : 'better-sqlite3',
    'sqlite3' : 'sqlite3',
    'sql.js' : 'sql.js',
    'mssql' : 'mssql',
    'bufferutil' : 'bufferutil',
    'utf-8-validate' : 'utf-8-validate',
    'node-libcurl': 'node-libcurl'
  },
  target: 'node',
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: './public', to: './public' }],
    }),
    new DefinePlugin({
      'process.env':{
        //'STAGE_ENV': JSON.stringify(STAGE_ENV),
        'STAGE_ENV': JSON.stringify('lemon'),
      }
    }),
  ],
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'out'),
    filename: '[name].js',
  },
}
