import * as Alexa from '../interface/alexa'
import * as _ from 'lodash'
import { Log } from '../lib/log'
import { IotData, AWSError } from 'aws-sdk'
import { ThingShadowState } from '../interface/requests'

const iotdata = new IotData({ endpoint: process.env.IOT_ENDPOINT })
const updateStateDevice = (deviceId: string, property: string, value: any) => {
  return new Promise((resolve, reject) => {
    iotdata
      .updateThingShadow({
        payload: JSON.stringify({
          state: {
            desired: {
              [property]: value,
            },
          },
        }),
        thingName: deviceId,
      })
      .send((err: AWSError, data: IotData.UpdateThingShadowResponse) => {
        if (err) {
          reject(err)
        } else {
          const payload = JSON.parse(data.payload.toString())
          Log('UpdateThing', { payload, data })
          resolve(_.get(payload, ['state', 'desired', property]))
        }
      })
  })
}

const getStateDevice = (deviceId: string): Promise<ThingShadowState> => {
  return new Promise((resolve, reject) => {
    iotdata.getThingShadow(
      {
        thingName: deviceId,
      },
      (err: AWSError, data: IotData.GetThingShadowResponse) => {
        if (err) {
          reject(err)
        } else {
          const payload = JSON.parse(data.payload.toString())
          Log('getThing', { payload, data })
          resolve({
            state: _.get(payload, ['state', 'reported']),
            delta: _.get(payload, ['state', 'delta']),
            lastReports: _.get(payload, ['metadata', 'reported']),
            timestamp: _.get(payload, ['timestamp']),
          })
        }
      }
    )
  })
}
const powerControll = async (
  deviceId: string,
  action: string
): Promise<Alexa.ContextProperty> => {
  const value = action === 'TurnOn' ? 'ON' : 'OFF'
  const response = await updateStateDevice(deviceId, 'power', value)
  return {
    name: 'powerState',
    value: response,
    namespace: Alexa.DirectiveName.PowerController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const brightnessControll = async (
  deviceId: string,
  value: number
): Promise<Alexa.ContextProperty> => {
  const response = await updateStateDevice(deviceId, 'brightness', value)
  return {
    name: 'brightness',
    value: response,
    namespace: Alexa.DirectiveName.BrightnessController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const colorControll = async (
  deviceId: string,
  value: { hue: number; saturation: number; brightness: number }
): Promise<Alexa.ContextProperty> => {
  const response = await updateStateDevice(deviceId, 'color', value)
  return {
    name: 'color',
    value: response,
    namespace: Alexa.DirectiveName.ColorController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const lockControll = async (
  deviceId: string,
  action: string
): Promise<Alexa.ContextProperty> => {
  const value = action === 'Unlock' ? 'UNLOCKED' : 'LOCKED'
  const response = await updateStateDevice(deviceId, 'lock', value)
  return {
    name: 'lockState',
    value: response,
    namespace: Alexa.DirectiveName.LockController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const reportControll = async (
  deviceId: string
): Promise<Alexa.ContextProperty[]> => {
  const stateThing = await getStateDevice(deviceId)
  const properties: Alexa.ContextProperty[] = []
  for (let key in stateThing.state) {
    const itemName = _.get(Alexa.PropertyNameMap, key)
    const lastReport = _.get(stateThing, ['lastReports', key, 'timestamp'], 0)
    const diffTime = stateThing.timestamp - lastReport
    Log('Timing', { diffTime, lastReport, timestamp: stateThing.timestamp })
    if (itemName && diffTime < 600) {
      properties.push({
        namespace: _.get(
          Alexa.PropertyNamespaceMap,
          key,
          Alexa.PropertyNamespaceMap.power
        ),
        name: itemName,
        value: stateThing.state[key],
        timeOfSample: new Date().toISOString(),
        uncertaintyInMilliseconds: 6000,
      })
    }
  }
  return properties
}
export default (payload: Alexa.Interface): Promise<Alexa.Response> => {
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

      let propertiesResponse:
        | Alexa.ContextProperty
        | Alexa.ContextProperty[] = []
      switch (namespace) {
        case Alexa.DirectiveName.PowerController:
          propertiesResponse = await powerControll(endpointId, name)
          break
        case Alexa.DirectiveName.BrightnessController:
          propertiesResponse = await brightnessControll(
            endpointId,
            _.get(payload, 'directive.payload.brightness', 0)
          )
          break
        case Alexa.DirectiveName.ColorController:
          propertiesResponse = await colorControll(
            endpointId,
            _.get(payload, 'directive.payload.color')
          )
          break
        case Alexa.DirectiveName.LockController:
          propertiesResponse = await lockControll(endpointId, name)
          break
        case Alexa.DirectiveName.Alexa:
          if (name === Alexa.DirectiveName.ReportState) {
            propertiesResponse = await reportControll(endpointId)
            eventResponse.header.name = Alexa.DirectiveName.StateReport
          }
          break
        default:
      }
      resolve({
        event: eventResponse,
        context: {
          properties: Array.isArray(propertiesResponse)
            ? propertiesResponse
            : [propertiesResponse],
        },
      })
    } catch (err) {
      reject(err)
    }
  })
}
