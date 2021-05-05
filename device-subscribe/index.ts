import { DynamoDB, AWSError } from 'aws-sdk'
import {
  LambdaContext,
  EventDeviceInterface,
  EventPayload,
  EventRegister,
  EventPhysicalInteraction,
  PropertyNamespaceMap,
  PropertyNameMap,
  DeviceCategoryMap,
  DeviceTemplate,
} from './interface/event'
import { DeviceDB, UserToken } from './interface/db'
import * as Alexa from './interface/alexa'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { getAlexaCredentials } from './token'
import axios from 'axios'
import { Log } from './lib/log'
import { findUser, saveDevice, findDevice } from './database'
import { rgbToHsb } from './helpers/color'
import DeviceNormalize from './helpers/normalize'

const reportAlexa = async (payload: any, tokens: UserToken) => {
  const response = await axios.post(
    'https://api.amazonalexa.com/v3/events',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + tokens.access_token,
      },
    }
  )
  Log('Alexa report', {
    payload,
    response: _.get(response, 'data'),
    status: _.get(response, 'status'),
    message: _.get(response, 'message'),
  })
}

const handlerRegister = async (payload: EventRegister) => {
  const user = await findUser(payload.user_id)
  const device: DeviceDB = {
    device_id: payload.device_id,
    name: payload.device_name || 'Device ' + payload.device_id,
    topic_events: payload.topic_events,
    device_template: payload.device_template,
    user_id: user.user_id,
    updatedAt: new Date().toISOString(),
    capabilities: [],
  }
  const category = _.get(
    DeviceCategoryMap,
    device.device_template,
    DeviceCategoryMap.switch
  )
  const deviceEndpoint: any = {
    endpointId: device.device_id,
    manufacturerName: 'Guirra DIY',
    friendlyName: device.name,
    description: 'Smart Home DIY',
    displayCategories: [category],
    capabilities: [
      {
        type: Alexa.CapacityType.AlexaInterface,
        interface: Alexa.CapacityInterface.EndpointHealth,
        version: '3',
        properties: {
          supported: [
            {
              name: Alexa.CapacitySupport.connectivity,
            },
          ],
          proactivelyReported: true,
          retrievable: true,
        },
      },
    ],
  }
  for (let key in payload.properties) {
    const prop = payload.properties[key]
    if (prop) {
      device.capabilities.push(key)
      switch (prop) {
        default:
          deviceEndpoint.capabilities.push(
            DeviceNormalize.DefaultController(key)
          )
      }
    }
  }
  if (payload.modes) {
    for (let i in payload.modes) {
      const mode = payload.modes[i]
      DeviceNormalize.ModeController(mode.name, mode.values)
      deviceEndpoint.capabilities.push(
        DeviceNormalize.ModeController(mode.name, mode.values)
      )
    }
  }
  await saveDevice(device)
  const tokens = await getAlexaCredentials(device.user_id)
  const payloadAlexa = {
    event: {
      header: {
        namespace: Alexa.DirectiveName.Discovery,
        name: Alexa.DirectiveName.AddOrUpdateReport,
        payloadVersion: '3',
        messageId: uuidv4(),
      },
      payload: {
        endpoints: [deviceEndpoint],
        scope: {
          type: 'BearerToken',
          token: tokens.access_token,
        },
      },
    },
  }
  await reportAlexa(payloadAlexa, tokens)
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

const handlerPhysicalInteraction = async (
  payload: EventPhysicalInteraction
) => {
  const device: DeviceDB = await findDevice(payload.device_id)
  const tokens = await getAlexaCredentials(device.user_id)
  let payloadAlexa = {
    event: {
      header: {
        namespace: Alexa.DirectiveName.Alexa,
        name: Alexa.DirectiveName.ChangeReport,
        messageId: uuidv4(),
        payloadVersion: '3',
      },
      endpoint: {
        scope: {
          type: 'BearerToken',
          token: tokens.access_token,
        },
        endpointId: payload.device_id,
      },
      payload: {
        change: {
          cause: {
            type: 'PHYSICAL_INTERACTION',
          },
        },
      },
    },
    change: {},
  }
  switch (device.device_template) {
    case DeviceTemplate.doorlBell:
      _.set(
        payloadAlexa,
        'event.header.namespace',
        Alexa.DirectiveName.DoorbellEventSource
      )
      _.set(
        payloadAlexa,
        'event.header.name',
        Alexa.DirectiveName.DoorbellPress
      )
      _.set(payloadAlexa, 'event.payload.timestamp', new Date().toISOString())
      break
    default:
      const propertyChange = {
        namespace: _.get(
          PropertyNamespaceMap,
          payload.property,
          PropertyNamespaceMap.power
        ),
        name: _.get(PropertyNameMap, payload.property, PropertyNameMap.power),
        value: reportTranformState(
          _.get(payload, 'state', {}),
          payload.property
        ),
        timeOfSample: new Date().toISOString(),
        uncertaintyInMilliseconds: 0,
      }
      const propertiesNotChange = []
      for (let key in payload.state) {
        if (key !== payload.property) {
          propertiesNotChange.push({
            namespace: _.get(
              PropertyNamespaceMap,
              key,
              PropertyNamespaceMap.power
            ),
            name: _.get(PropertyNameMap, key, PropertyNameMap.power),
            value: reportTranformState(_.get(payload, 'state', {}), key),
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 6000,
          })
        }
      }
      _.set(payloadAlexa, 'event.payload.change.properties', [propertyChange])
      _.set(payloadAlexa, 'context.properties', [propertiesNotChange])
      Log('Value change', _.get(payload, ['state', payload.property], ''))
      break
  }

  await reportAlexa(payloadAlexa, tokens)
}

export const handler = async (
  payload: EventPayload,
  context: LambdaContext,
  callback: Function
) => {
  try {
    Log('Event', payload)
    switch (payload.event) {
      case EventDeviceInterface.registerDevice:
        await handlerRegister(payload)
        break
      case EventDeviceInterface.physicalInteraction:
        await handlerPhysicalInteraction(payload)
        break
    }
    callback()
  } catch (err) {
    Log('Falha ao resolver evento device', {
      code: _.get(err, 'state', _.get(err, 'code')),
      message: _.get(err, 'message'),
      data: _.get(err, 'response.data', ''),
    })
    callback(err)
  }
}
