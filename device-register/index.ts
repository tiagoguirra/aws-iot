import {
  Device,
  LambdaContext,
  DeviceType,
  IotDevice,
  Alexa,
  DeviceCategory,
} from './interface'
import { DynamoDB, AWSError } from 'aws-sdk'
import * as _ from 'lodash'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const dynamoDB = new DynamoDB.DocumentClient()
const findUser = (userId: string) => {
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
          resolve(_.get(data, 'Item'))
        }
      }
    )
  })
}
const saveDevice = (device: IotDevice, user: any) => {
  return new Promise((resolve, reject) => {
    dynamoDB.put(
      {
        TableName: 'iot-devices',
        Item: {
          device_id: device.device_id,
          ...device,
          user_id: user.user_id,
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

const normalizeDeviceCapatibilities = (
  device: IotDevice
): Alexa.DeviceCapacity[] => {
  const capabilities: Alexa.DeviceCapacity[] = []

  for (const i in device.capabilities) {
    const item = device.capabilities[i]
    switch (item.name) {
      case 'power':
        capabilities.push({
          interface: Alexa.CapacityInterface.PowerController,
          type: Alexa.CapacityType.AlexaInterface,
          version: '3',
          properties: {
            supported: [
              {
                name: Alexa.CapacitySupport.powerState,
              },
            ],
            proactivelyReported: true,
            retrievable: true,
          },
        })
        break
      case 'brightness':
        capabilities.push({
          interface: Alexa.CapacityInterface.BrightnessController,
          type: Alexa.CapacityType.AlexaInterface,
          version: '3',
          properties: {
            supported: [
              {
                name: Alexa.CapacitySupport.brightness,
              },
            ],
            proactivelyReported: true,
            retrievable: true,
          },
        })
        break
      case 'color':
        capabilities.push({
          interface: Alexa.CapacityInterface.ColorController,
          type: Alexa.CapacityType.AlexaInterface,
          version: '3',
          properties: {
            supported: [
              {
                name: Alexa.CapacitySupport.color,
              },
            ],
            proactivelyReported: true,
            retrievable: true,
          },
        })
        break
      case 'lock':
        capabilities.push({
          interface: Alexa.CapacityInterface.LockController,
          type: Alexa.CapacityType.AlexaInterface,
          version: '3',
          properties: {
            supported: [
              {
                name: Alexa.CapacitySupport.lockState,
              },
            ],
            proactivelyReported: true,
            retrievable: true,
          },
        })
        break
    }
  }
  capabilities.push({
    type: Alexa.CapacityType.AlexaInterface,
    interface: Alexa.CapacityInterface.Alexa,
    version: '3',
  })
  return capabilities
}
const normalizeDevice = (device: IotDevice): Alexa.Device => {
  const category = _.get(DeviceCategory, device.type, DeviceCategory.SWITCH)
  return {
    endpointId: device.device_id,
    manufacturerName: 'Guirra DIY',
    friendlyName: device.name,
    description: 'Smart Home DIY',
    displayCategories: [category],
    capabilities: normalizeDeviceCapatibilities(device),
  }
}
const reportAlexa = async (device: IotDevice, user: any) => {
  try {
    const authorization = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      {
        grant_type: 'authorization_code',
        code: _.get(user, 'auth_code'),
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      }
    )
    const deviceNormalized = normalizeDevice(device)
    await axios.post(
      'https://api.amazonalexa.com/v3/events',
      {
        event: {
          header: {
            namespace: Alexa.DirectiveName.Discovery,
            name: Alexa.DirectiveName.AddOrUpdateReport,
            payloadVersion: '3',
            messageId: uuidv4(),
          },
          payload: {
            endpointId: [deviceNormalized],
            scope: {
              type: 'BearerToken',
              token: _.get(authorization, 'data.access_token'),
            },
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + _.get(authorization, 'data.access_token'),
        },
      }
    )
  } catch (err) {
    console.log('Falha ao reportar novo device a alexa', err)
  }
}
export const handler = async (
  event: Device,
  context: LambdaContext,
  callback: Function
) => {
  try {
    if (event) {
      const capabilities = []
      switch (event.device_type) {
        case DeviceType.LIGHT:
        case DeviceType.SWITCH:
          capabilities.push('power')
          break
        case DeviceType.RGB_LIGHT:
          capabilities.push('brightness')
          capabilities.push('color')
          capabilities.push('power')
          break
        case DeviceType.SMARTLOCK:
          capabilities.push('lock')
          break
      }
      const device: IotDevice = {
        device_id: event.device_id,
        name: event.device_name || 'device_' + event.device_id,
        topic_pub: event.topic_pub,
        topic_sub: event.topic_sub,
        capabilities,
        updatedAt: Date.now().toString(),
        type: event.device_type,
      }
      console.log(device)
      const user = await findUser('amzn1.account.AH7PAVEKBJHYA47ZFL3HUOHJSQ5A')
      await saveDevice(device, user)
      callback()
      reportAlexa(device, user)
    }
  } catch (err) {
    console.log('Falha ao registrar device', err)
    callback(err)
  }
}
