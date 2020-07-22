import { DynamoDB, AWSError, IotData } from 'aws-sdk'
import * as _ from 'lodash'
import {
  EventTrigger,
  LambdaContext,
  EventTriggerItem,
  DeviceEvent,
  Device,
} from './interface'

const iotdata = new IotData({ endpoint: process.env.IOT_ENDPOINT })
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
const normalizeItem = (item: EventTriggerItem): DeviceEvent => {
  const newImage = _.get(item, 'dynamodb.NewImage', {})
  return Object.keys({}).reduce((_item, key) => {
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
    iotdata.publish(
      {
        topic: device.topic_pub,
        payload: JSON.stringify(event),
        qos: 0,
      },
      (err, data) => {
        if (err) {
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
    for (const i in event.Records) {
      const item = normalizeItem(event.Records[i])
      const device = await findDevice(item.device_id)
      await sendDeviceEvent(device, {
        action: item.action,
        capability: item.capability,
      })
    }
    callback(null)
  } catch (err) {
    callback({
      message: err.message,
      code: err.code,
    })
  }
}
