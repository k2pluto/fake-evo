//import AWS from 'aws-sdk'

import { WAFV2 } from '@aws-sdk/client-wafv2'
import { S3 } from '@aws-sdk/client-s3'
import { CloudFront } from '@aws-sdk/client-cloudfront'

import { v4 } from 'is-ip'
import { plutoCredential } from '../common/credential'
import { UserSQL } from '../interface/sql'
import { ApiStatusCode } from '../../lib/common/types/status-code'

export const waf = new WAFV2(plutoCredential)
export const s3 = new S3(plutoCredential)
export const cf = new CloudFront(plutoCredential)

const { STAGE_ENV } = process.env

export const stagingPlutoAPIIPSet = {
  Name: 'prod-pluto-api-whitelists',
  Id: '20bd2642-0351-479d-aa9b-1881855cd385',
}

export const prodPlutoAPIIPSet = {
  Name: 'prod-pluto-api-whitelists',
  Id: '20bd2642-0351-479d-aa9b-1881855cd385',
}

export const prodPlutoBOIPSet = {
  Name: 'pluto-agent-whitelists',
  Id: '9757e27c-18b4-4f25-9f85-6fb0b890bc71',
}

export const prodPlutoBlacklistIPSet = {
  Name: 'pluto-blacklists',
  Id: '4cc73ecc-4be2-43b2-98ae-e9b159af014b',
}

export async function getAwsIpSet() {
  const ipSetResponse = await waf.getIPSet({
    ...(STAGE_ENV === 'test' ? stagingPlutoAPIIPSet : prodPlutoAPIIPSet),
    Scope: 'REGIONAL',
  })

  return ipSetResponse?.IPSet?.Addresses
}

export async function updatePlutoAPIWhiteList(mainSQL: UserSQL) {
  const agentWhitelists = await mainSQL.repos.agentWhitelist.find({})

  const whitelist: { [id: string]: 1 } = {}

  let validIps = true
  for (const data of agentWhitelists) {
    if (data.api_whitelist.length <= 0) {
      continue
    }

    const ips = data.api_whitelist.split(',')

    for (const ip of ips) {
      if (ip === '') {
        continue
      }

      if (v4(ip) === false) {
        validIps = false
      }

      whitelist[ip] = 1
    }
  }

  if (validIps) {
    try {
      const ipSetResponse = await waf.getIPSet({
        ...(STAGE_ENV === 'test' ? stagingPlutoAPIIPSet : prodPlutoAPIIPSet),
        Scope: 'REGIONAL',
      })
      await waf.updateIPSet({
        ...(STAGE_ENV === 'test' ? stagingPlutoAPIIPSet : prodPlutoAPIIPSet),
        Scope: 'REGIONAL',
        Addresses: Object.keys(whitelist).map((value) => value + '/32'),
        LockToken: ipSetResponse.LockToken,
      })
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  }

  return false
}
export async function updatePlutoBOWhiteList(mainSQL: UserSQL) {
  const agentWhitelists = await mainSQL.repos.agentWhitelist.find({})

  const whitelist: { [id: string]: 1 } = {}

  let validIps = true
  let reason = ''
  for (const data of agentWhitelists) {
    if (data.bo_whitelist.length <= 0) {
      continue
    }

    const ips = data.bo_whitelist.split(',')

    for (const ip of ips) {
      if (ip === '') {
        continue
      }

      if (v4(ip) === false) {
        validIps = false
        reason = `Invalid IP : ${data.agentId} ${ip}`
      }

      whitelist[ip] = 1
    }
  }

  if (validIps) {
    try {
      const ipSetResponse = await waf.getIPSet({
        ...prodPlutoBOIPSet,
        Scope: 'REGIONAL',
      })
      await waf.updateIPSet({
        ...prodPlutoBOIPSet,
        Scope: 'REGIONAL',
        Addresses: Object.keys(whitelist).map((value) => value + '/32'),
        LockToken: ipSetResponse.LockToken,
      })
      return {
        status: ApiStatusCode.Success,
      }
    } catch (err) {
      console.log(err)
      return {
        status: ApiStatusCode.InternalServerError,
        reason: err.toString(),
      }
    }
  }

  return {
    status: ApiStatusCode.InternalServerError,
    reason,
  }
}

export async function addIpToPlutoBlacklistsIPSet(ip: string) {
  if (ip === '' || v4(ip) === false) {
    throw new Error('Invalid IP')
  }

  const ipSetResponse = await waf.getIPSet({
    ...prodPlutoBlacklistIPSet,
    Scope: 'REGIONAL',
  })

  const res = await waf.updateIPSet({
    ...prodPlutoBlacklistIPSet,
    Scope: 'REGIONAL',
    Addresses: [...ipSetResponse.IPSet.Addresses, ip + '/32'],
    LockToken: ipSetResponse.LockToken,
  })

  return res
}
export async function getPlutoBalcklistsIPSet() {
  return await waf.getIPSet({
    ...prodPlutoBlacklistIPSet,
    Scope: 'REGIONAL',
  })
}
