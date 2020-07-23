import { DynamoDB, AWSError, IotData } from 'aws-sdk'
import * as _ from 'lodash'
import {
  EventTrigger,
  LambdaContext,
  EventTriggerItem,
  DeviceEvent,
  Device,
} from './interface'
import { Log } from './lib/log'

const findDevice = (device_id: string): Promise<Device> => {
  return new Promise((resolve, reject) => {
    const dynamoDB = new DynamoDB.DocumentClient()
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
          Log('Get device', err)
          resolve(_.get(data, 'Item') as Device)
        }
      }
    )
  })
}
const normalizeItem = (item: EventTriggerItem): DeviceEvent => {
  const newImage = _.get(item, 'dynamodb.NewImage', {})
  return Object.keys(newImage).reduce((_item, key) => {
    return {
      ..._item,
      [key]: _.get(newImage, [key, 'S']),
    }
  }, {}) as DeviceEvent
}

const sendDeviceEvent = (
  device: Device,
  event: { capability: string; action: string }
) => {
  return new Promise((resolve, reject) => {
    console.log('sendDeviceEvent', { device, event })
    const iotdata = new IotData({ endpoint: process.env.IOT_ENDPOINT })
    iotdata.publish(
      {
        topic: device.topic_pub,
        payload: JSON.stringify(event),
        qos: 0,
      },
      (err, data) => {
        if (err) {
          Log('Send device', err)
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}
export const handler = async (
  event: EventTrigger,
  context: LambdaContext,
  callback: Function
) => {
  try {
    Log('Payload event', event)
    for (let i = 0; i < event.Records.length; i++) {
      const item = normalizeItem(event.Records[i])
      const device = await findDevice(item.device_id)
      await sendDeviceEvent(device, {
        action: item.action,
        capability: item.capability,
      })
    }
    callback(null)
  } catch (err) {
    Log('Error', err)
    callback({
      message: err.message,
      code: err.code,
    })
  }
}
