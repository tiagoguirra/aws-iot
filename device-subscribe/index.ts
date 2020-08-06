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
} from './interface/event'
import { DeviceDB, UserToken } from './interface/db'
import * as Alexa from './interface/alexa'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { getAlexaCredentials } from './token'
import axios from 'axios'
import { Log } from './lib/log'
import { findUser, saveDevice, findDevice } from './database'

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
  const deviceEndpoint = {
    endpointId: device.device_id,
    manufacturerName: 'Guirra DIY',
    friendlyName: device.name,
    description: 'Smart Home DIY',
    displayCategories: [category],
    capabilities: [],
  }
  for (let key in payload.properties) {
    const prop = payload.properties[key]
    if (prop) {
      device.capabilities.push(key)
      deviceEndpoint.capabilities.push({
        interface: _.get(PropertyNamespaceMap, key, PropertyNamespaceMap.power),
        type: Alexa.CapacityType.AlexaInterface,
        version: '3',
        properties: {
          supported: [
            {
              name: _.get(PropertyNameMap, key, PropertyNameMap.power),
            },
          ],
          proactivelyReported: true,
          retrievable: true,
        },
      })
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
const handlerPhysicalInteraction = async (
  payload: EventPhysicalInteraction
) => {
  const device: DeviceDB = await findDevice(payload.device_id)
  const propertyChange = {
    namespace: _.get(
      PropertyNamespaceMap,
      payload.property,
      PropertyNamespaceMap.power
    ),
    name: _.get(PropertyNameMap, payload.property, PropertyNameMap.power),
    value: _.get(payload, ['state', payload.property], ''),
    timeOfSample: new Date().toISOString(),
    uncertaintyInMilliseconds: 0,
  }
  Log('Value change', _.get(payload, ['state', payload.property], ''))
  const propertiesNotChange = []
  for (let key in payload.state) {
    if (key !== payload.property) {
      const prop = payload.state[key]
      propertiesNotChange.push({
        namespace: _.get(PropertyNamespaceMap, key, PropertyNamespaceMap.power),
        name: _.get(PropertyNameMap, key, PropertyNameMap.power),
        value: prop,
        timeOfSample: new Date().toISOString(),
        uncertaintyInMilliseconds: 6000,
      })
    }
  }
  const tokens = await getAlexaCredentials(device.user_id)
  const payloadAlexa = {
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
          properties: [propertyChange],
        },
      },
    },
    context: {
      properties: propertiesNotChange,
    },
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
