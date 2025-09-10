// import 'source-map-support/register'
//import { configure } from '@vendia/serverless-express'
//import { Context, Handler, Callback, APIGatewayProxyEventV2 } from 'aws-lambda'
import { initApp } from './app'
//import * as awsLambdaFastify, { PromiseHandler } from '@fastify/aws-lambda'
import awsLambdaFastify from '@fastify/aws-lambda'

let server

async function bootstrap() {
  const app = await initApp()

  //const expressApp = app.getHttpAdapter().getInstance()
  //return configure({ app: expressApp })
  return (awsLambdaFastify as any)(app)
}

export const handler = async (event, context, callback) => {
  console.log(JSON.stringify(event))
  server = server ?? (await bootstrap())
  const data = await server(event, context)
  console.log(data)
  return data
}
