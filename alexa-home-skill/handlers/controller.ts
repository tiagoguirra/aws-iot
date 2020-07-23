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
import { Log } from '../lib/log'
interface ControllerResponse {
  name: string
  value: any
}
const dynamoDB = new DynamoDB.DocumentClient()
const findDevice = (device_id: string): Promise<Device> => {
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
          resolve(_.get(data, 'Item') as Device)
        }
      }
    )
  })
}
const saveDeviceEvent = (deviceId: string, capability: string, action: any) => {
  return new Promise((resolve, reject) => {
    dynamoDB.put(
      {
        TableName: 'iot-event',
        Item: {
          event_id: uuidv4(),
          action,
          capability,
          device_id: deviceId,
          createdAt: new Date().toISOString(),
        },
      },
      (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
        if (err) {
          reject(err)
        } else {
          resolve(_.get(data, 'Item'))
        }
      }
    )
  })
}
const powerControll = async (
  endpointId: string,
  action: string
): Promise<ControllerResponse> => {
  const device = await findDevice(endpointId)
  const capabilities = device.capabilities || []
  const value = action === 'TurnOn' ? 'ON' : 'OFF'
  if (capabilities.includes('power')) {
    await saveDeviceEvent(device.device_id, 'power', value)
  }
  return {
    name: 'powerState',
    value: value,
  }
}
const brightnessControll = async (endpointId: string, value: number) => {
  const device = await findDevice(endpointId)
  const capabilities = device.capabilities || []
  if (capabilities.includes('brightness')) {
    await saveDeviceEvent(device.device_id, 'brightness', value)
  }
  return {
    name: 'brightness',
    value: value,
  }
}
const colorControll = async (
  endpointId: string,
  value: { hue: number; saturation: number; brightness: number }
) => {
  const device = await findDevice(endpointId)
  const capabilities = device.capabilities || []
  if (capabilities.includes('color')) {
    await saveDeviceEvent(device.device_id, 'color', value)
  }
  return {
    name: 'color',
    value: value,
  }
}
const lockControll = async (
  endpointId: string,
  action: string
): Promise<ControllerResponse> => {
  const device = await findDevice(endpointId)
  const capabilities = device.capabilities || []
  const value = action === 'Unlock' ? 'UNLOCK' : 'LOCKED'
  if (capabilities.includes('lock')) {
    await saveDeviceEvent(device.device_id, 'lock', value)
  }
  return {
    name: 'lockState',
    value: value,
  }
}
const reportControll = async (
  endpointId: string,
  correlation: string
): Promise<void> => {
  const device = await findDevice(endpointId)
  await saveDeviceEvent(device.device_id, 'state', correlation)
}
export default (
  payload: Alexa.Interface,
  profile: ProfileUser
): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        name,
        namespace,
        correlationToken,
        messageId,
      } = payload.directive.header
      const eventResponse = {
        header: {
          namespace: Alexa.DirectiveName.Alexa,
          name: Alexa.DirectiveName.Response,
          messageId,
          correlationToken: correlationToken,
          payloadVersion: '3',
        },
        endpoint: {
          ...payload.directive.endpoint,
        },
        payload: {},
      }
      const endpointId: string = payload.directive.endpoint.endpointId

      let result: ControllerResponse
      switch (namespace) {
        case Alexa.DirectiveName.PowerController:
          result = await powerControll(endpointId, name)
          break
        case Alexa.DirectiveName.BrightnessController:
          result = await brightnessControll(
            endpointId,
            _.get(payload, 'directive.payload.brightness', 0)
          )
          break
        case Alexa.DirectiveName.ColorController:
          result = await colorControll(
            endpointId,
            _.get(payload, 'directive.payload.color')
          )
          break
        case Alexa.DirectiveName.LockController:
          result = await lockControll(endpointId, name)
          break
        case Alexa.DirectiveName.Alexa:
          if (name === Alexa.DirectiveName.ReportState) {
            await reportControll(endpointId, correlationToken)
            return resolve({
              event: eventResponse,
            })
          }
          break
        default:
      }
      let timeOfSample = new Date().toISOString()
      resolve({
        event: eventResponse,
        context: {
          properties: [
            {
              ...result,
              namespace,
              timeOfSample,
              uncertaintyInMilliseconds: 50,
            },
          ],
        },
      })
    } catch (err) {
      Log('Falha ao controlar device', err)
      reject({
        message: err.message,
        code: err.code,
      })
    }
  })
}
