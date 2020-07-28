import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { DynamoDB, AWSError } from 'aws-sdk'
import { RequestTokens } from '../interface/requests'
import { ProfileUser, DeviceDB } from '../interface/database'
const dynamoDB = new DynamoDB.DocumentClient()
const findDevice = (device_id: string): Promise<DeviceDB> => {
  return new Promise((resolve, reject) => {
    dynamoDB.get(
      {
        TableName: 'iot-devices',
        Key: {
          device_id,
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.GetItemOutput) => {
        if (err) {
          reject(err)
        } else {
          resolve(_.get(data, 'Item') as DeviceDB)
        }
      }
    )
  })
}
const buscaDevices = (
  userId: string
): Promise<DynamoDB.DocumentClient.QueryOutput> => {
  return new Promise((resolve, reject) => {
    const dynamoDB = new DynamoDB.DocumentClient()
    dynamoDB.query(
      {
        TableName: 'iot-devices',
        IndexName: 'user_id-index',
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'user_id',
        },
        ExpressionAttributeValues: {
          ':id': userId,
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.QueryOutput) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}
const saveTokens = (code: string, userId: string, tokens: RequestTokens) => {
  return new Promise(async (resolve, reject) => {
    dynamoDB.put(
      {
        TableName: 'iot-users-tokens',
        Item: {
          code,
          access_token: _.get(tokens, 'access_token'),
          refresh_token: _.get(tokens, 'refresh_token'),
          expires_in: _.get(tokens, 'expires_in'),
          token_type: _.get(tokens, 'token_type'),
          created_at: new Date().toISOString(),
          user_id: userId,
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}
const saveUser = (profile: ProfileUser) => {
  return new Promise((resolve, reject) => {
    dynamoDB.put(
      {
        TableName: 'iot-users',
        Item: {
          email: profile.email,
          name: profile.name,
          user_id: profile.user_id,
          updatedAt: new Date().toISOString(),
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}
export default { findDevice, buscaDevices, saveTokens, saveUser }
export { findDevice, buscaDevices, saveTokens, saveUser }
