import * as Alexa from '../interface/alexa'
import * as _ from 'lodash'
import { Log } from '../lib/log'
import { IotData, AWSError } from 'aws-sdk'
import { ThingShadowState } from '../interface/requests'
import { hsbToRgb, rgbToHsb } from '../helpers/color'
import { findDevice } from '../database/database'

const iotdata = new IotData({ endpoint: process.env.IOT_ENDPOINT })
const updateStateDevice = (deviceId: string, value: any) => {
  return new Promise((resolve, reject) => {
    iotdata
      .updateThingShadow({
        payload: JSON.stringify({
          state: {
            desired: value,
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
          resolve(_.get(payload, ['state', 'desired']))
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
  const response = await updateStateDevice(deviceId, { power: value })
  return {
    name: 'powerState',
    value: _.get(response, 'power'),
    namespace: Alexa.DirectiveName.PowerController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const brightnessControll = async (
  deviceId: string,
  value: number
): Promise<Alexa.ContextProperty> => {
  const response = await updateStateDevice(deviceId, { brightness: value })
  return {
    name: 'brightness',
    value: _.get(response, 'brightness'),
    namespace: Alexa.DirectiveName.BrightnessController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}

const colorControll = async (
  deviceId: string,
  value: { hue: number; saturation: number; brightness: number }
): Promise<Alexa.ContextProperty> => {
  const rgb = hsbToRgb(value.hue, value.saturation, value.brightness)
  await updateStateDevice(deviceId, rgb)
  return {
    name: 'color',
    value,
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
  const response = await updateStateDevice(deviceId, { lock: value })
  return {
    name: 'lockState',
    value: _.get(response, 'lock'),
    namespace: Alexa.DirectiveName.LockController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const reportTranformState = (state: any, propertyName: string) => {
  switch (propertyName) {
    case 'color':
      return rgbToHsb(
        _.get(state, 'red', 0),
        _.get(state, 'green', 0),
        _.get(state, 'blue', 0)
      )
    case 'power':
      return _.get(state, 'power', 'OFF')
    case 'lock':
      return _.get(state, 'lock', 'UNLOCKED')
    case 'sensorContact':
      return _.get(state, 'sensorContact', 'NOT_DETECTED')
    case 'sensorTemperature':
      return {
        value: _.get(state, 'sensorTemperature.value', 0),
        scale: _.get(state, 'sensorTemperature.scale', 'CELSIUS'),
      }
    default:
      return _.get(state, propertyName, state)
  }
}

const modeControll = async (deviceId: string, mode: string, value: string) => {
  const response = await updateStateDevice(deviceId, { [mode]: value })
  return {
    instance: mode,
    name: 'mode',
    value: _.get(response, mode, value),
    namespace: Alexa.DirectiveName.ModeController,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 6000,
  }
}
const reportControll = async (
  deviceId: string
): Promise<Alexa.ContextProperty[]> => {
  const stateThing = await getStateDevice(deviceId)
  const device = await findDevice(deviceId)
  const properties: Alexa.ContextProperty[] = []

  const lastReport = _.get(
    stateThing,
    ['lastReports', 'config', 'user_id', 'timestamp'],
    0
  )
  const diffTime = stateThing.timestamp - lastReport
  Log('Timing', { diffTime, lastReport, timestamp: stateThing.timestamp })
  properties.push({
    namespace: Alexa.DirectiveName.EndpointHealth,
    name: Alexa.DirectiveName.connectivity,
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 0,
    value: {
      value: diffTime > 6000 ? 'UNREACHABLE' : 'OK',
    },
  })
  for (let i in device.capabilities) {
    const item = device.capabilities[i]
    Log('Get device property', item)
    const itemName = _.get(Alexa.PropertyNameMap, item)
    if (itemName) {
      properties.push({
        namespace: _.get(
          Alexa.PropertyNamespaceMap,
          item,
          Alexa.PropertyNamespaceMap.power
        ),
        name: itemName,
        value: reportTranformState(stateThing.state, item),
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
        case Alexa.DirectiveName.ModeController:
          propertiesResponse = await modeControll(
            endpointId,
            _.get(payload, 'directive.header.instance'),
            _.get(payload, 'directive.payload.mode')
          )
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
