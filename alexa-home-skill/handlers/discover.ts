import {
  Alexa,
  ProfileUser,
  Device,
  DeviceType,
  DeviceCategory,
} from '../interface'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { DynamoDB, AWSError } from 'aws-sdk'

const buscaDevices = (
  userId: string
): Promise<DynamoDB.DocumentClient.QueryOutput> => {
  return new Promise((resolve, reject) => {
    const dynamoDB = new DynamoDB.DocumentClient()
    dynamoDB.query(
      {
        TableName: 'iot-devices',
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

const normalizeDeviceCapatibilities = (
  device: Device
): Alexa.DeviceCapacity[] => {
  const capabilities: Alexa.DeviceCapacity[] = []

  for (const i in device.capabilities || []) {
    const item = device.capabilities[i]
    switch (item) {
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
const normalizeDevice = (device: Device): Alexa.Device => {
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
export default (
  payload: Alexa.Interface,
  profile: ProfileUser
): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
      const devices = await buscaDevices(profile.user_id)
      const deviceMap: Alexa.Device[] = devices.Items.map(device =>
        normalizeDevice(device as Device)
      )
      const response: Alexa.Response = {
        event: {
          header: {
            name: Alexa.DirectiveName.DiscoverResponse,
            namespace: Alexa.DirectiveName.Discovery,
            messageId: uuidv4(),
            payloadVersion: '3',
          },
          payload: {
            endpoints: deviceMap,
          },
        },
      }
      resolve(response)
    } catch (err) {
      reject({
        message: err.message,
        code: err.code,
      })
    }
  })
}
