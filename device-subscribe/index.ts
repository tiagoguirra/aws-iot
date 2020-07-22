import { DynamoDB, AWSError } from 'aws-sdk'
import { LambdaContext, EventDeviceInterface, EventPayload, EventDeviceReport } from './interface'
import { Device } from 'aws-sdk/clients/batch'

const dynamoDB = new DynamoDB.DocumentClient()
const findDevice = (deviceId: string): Promise<Device> => {
  return new Promise((resolve, reject) => {
    dynamoDB.get(
      {
        TableName: 'iot-devices',
        Key: {
          deviceId,
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
    if (payload.interface === EventDeviceInterface.report) {
      const device: Device = await findDevice(payload.device_id)
      const event: EventDeviceReport = payload as EventDeviceReport
      switch(event.capability){
        case ''
      }
    } else {
      throw new Error('Interface não suportada')
    }
  } catch (err) {
    console.log('Falha ao resolver evento device', err)
    callback(err)
  }
}
