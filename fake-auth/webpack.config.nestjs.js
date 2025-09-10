const path = require('path')
const serverlessWebpack = require('serverless-webpack')
const nodeExternals = require('webpack-node-externals')
const CopyPlugin = require('copy-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

console.log(__dirname)
console.log(serverlessWebpack.lib.options.stage === 'prod')

module.exports = {
  // entry를 따로 설정하지 않아도 됨
  entry: serverlessWebpack.lib.entries,
  target: 'node',
  //mode: serverlessWebpack.lib.webpack.isLocal ? 'development' : 'production',
  //mode: 'development',
  // development로 해두면 소스 용량이 너무 커져서 cold launch 시간이 너무 오래걸림
  mode: serverlessWebpack.lib.options.stage === 'prod' ? 'production' : 'development',
  // webpack의 critical warning 메시지를 피하기 위한 용도
  externals: [nodeExternals()],
  // inline-source-map을 켜두면 소스 용량이 너무 커져서 cold launch 시간이 너무 오래걸림
  devtool: serverlessWebpack.lib.options.stage === 'prod' ? undefined : 'inline-source-map',
  //devtool: 'inline-source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
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
  },
  target: 'node',
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
}
