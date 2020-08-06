import * as Alexa from '../interface/alexa'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { buscaDevices } from '../database/database'
import { DeviceDB, ProfileUser } from '../interface/database'
import { findUser } from './authorization'

const normalizeDevice = (device: DeviceDB): Alexa.Device => {
  const category = _.get(
    Alexa.DeviceCategoryMap,
    device.device_template,
    Alexa.DeviceCategoryMap.switch
  )
  const deviceEndpoint = {
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
          proactivelyReported: false,
          retrievable: true,
        },
      },
    ],
  }
  for (let key in device.capabilities) {
    const prop = device.capabilities[key]
    deviceEndpoint.capabilities.push({
      interface: _.get(
        Alexa.PropertyNamespaceMap,
        prop,
        Alexa.PropertyNamespaceMap.power
      ),
      type: Alexa.CapacityType.AlexaInterface,
      version: '3',
      properties: {
        supported: [
          {
            name: _.get(
              Alexa.PropertyNamespaceMap,
              prop,
              Alexa.PropertyNamespaceMap.power
            ),
          },
        ],
        proactivelyReported: true,
        retrievable: true,
      },
    })
  }
  return deviceEndpoint
}
export default (payload: Alexa.Interface): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile: ProfileUser = await findUser(
        _.get(
          payload,
          'directive.endpoint.scope.token',
          _.get(payload, 'directive.payload.scope.token')
        )
      )
      const devices = await buscaDevices(profile.user_id)
      const deviceMap: Alexa.Device[] = devices.Items.map(device =>
        normalizeDevice(device as DeviceDB)
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
      reject(err)
    }
  })
}
