import { DynamoDB, AWSError } from 'aws-sdk'
import {
  LambdaContext,
  EventDeviceInterface,
  EventPayload,
  Device,
  Alexa,
} from './interface'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { getAlexaCredentials } from './token'
import axios from 'axios'
import { Log } from './lib/log'

const dynamoDB = new DynamoDB.DocumentClient()
const findDevice = (deviceId: string): Promise<Device> => {
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
          resolve(_.get(data, 'Item') as Device)
        }
      }
    )
  })
}

export const handler = async (
  payload: EventPayload,
  context: LambdaContext,
  callback: Function
) => {
  try {
    Log('Event', payload)
    if (payload.event === EventDeviceInterface.report) {
      const device: Device = await findDevice(payload.device_id)
      const tokens = await getAlexaCredentials(device.user_id)
      const correlationToken = payload.correlation
      let status = {
        namespace: '',
        name: '',
        value: payload.value,
        timeOfSample: new Date().toISOString(),
        uncertaintyInMilliseconds: 500,
      }
      switch (payload.interface) {
        case 'power':
          status.namespace = Alexa.CapacityInterface.PowerController
          status.name = 'powerState'
          break
        case 'brightness':
          status.namespace = Alexa.CapacityInterface.BrightnessController
          status.name = 'brightness'
          break
        case 'color':
          status.namespace = Alexa.CapacityInterface.ColorController
          status.name = 'color'
          break
        case 'lock':
          status.namespace = Alexa.CapacityInterface.LockController
          status.name = 'lockState'
          break
      }
      let responsePayload = {}
      let responseContext: any = {
        properties: [status],
      }
      if (correlationToken) {
        responsePayload = {
          change: {
            cause: {
              type: 'PHYSICAL_INTERACTION',
            },
            properties: [status],
          },
        }
        responseContext = {}
      }
      const response = await axios.post(
        'https://api.amazonalexa.com/v3/events',
        {
          event: {
            header: {
              namespace: Alexa.DirectiveName.Alexa,
              name: correlationToken
                ? Alexa.DirectiveName.StateReport
                : Alexa.DirectiveName.ChangeReport,
              messageId: uuidv4(),
              payloadVersion: '3',
              ...(correlationToken ? { correlationToken } : {}),
            },
            endpoint: {
              scope: {
                type: 'BearerToken',
                token: tokens.access_token,
              },
              endpointId: payload.device_id,
            },
            payload: responsePayload,
          },
          context: responseContext,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + tokens.access_token,
          },
        }
      )
      Log('Alexa report', _.get(response, 'data'))
      callback()
    } else {
      throw new Error('Interface não suportada')
    }
  } catch (err) {
    Log('Falha ao resolver evento device', err)
    callback(err)
  }
}
