import { DynamoDB, AWSError } from 'aws-sdk'
import * as _ from 'lodash'
import { UserToken, UserDB, DeviceDB } from './interface/db'

const dynamoDB = new DynamoDB.DocumentClient()

const findTokens = (userId: string): Promise<UserToken> => {
  return new Promise((resolve, reject) => {
    dynamoDB.get(
      {
        TableName: 'iot-users-tokens',
        Key: {
          user_id: userId,
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.GetItemOutput) => {
        if (err) {
          console.log('Falha ao buscar tokens do usuário', err)
          reject(err)
        } else {
          resolve(_.get(data, 'Item') as UserToken)
        }
      }
    )
  })
}

const findUser = (userId: string): Promise<UserDB> => {
  return new Promise((resolve, reject) => {
    dynamoDB.get(
      {
        TableName: 'iot-users',
        Key: {
          user_id: userId,
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.GetItemOutput) => {
        if (err) {
          console.log('Falha ao buscar usuário', err)
          reject(err)
        } else {
          resolve(_.get(data, 'Item') as UserDB)
        }
      }
    )
  })
}
const saveDevice = (device: DeviceDB) => {
  return new Promise((resolve, reject) => {
    dynamoDB.put(
      {
        TableName: 'iot-devices',
        Item: {
          device_id: device.device_id,
          ...device,
        },
      },
      function(err, data) {
        if (err) {
          console.log('Falha ao salvar device', err)
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}
const findDevice = (deviceId: string): Promise<DeviceDB> => {
  return new Promise((resolve, reject) => {
    dynamoDB.get(
      {
        TableName: 'iot-devices',
        Key: {
          device_id: deviceId,
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

export default { findTokens, findUser, saveDevice, findDevice }
export { findTokens, findUser, saveDevice, findDevice }
