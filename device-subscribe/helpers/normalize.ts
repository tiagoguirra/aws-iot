import { PropertyNamespaceMap, PropertyNameMap } from '../interface/event'
import * as Alexa from '../interface/alexa'
import * as _ from 'lodash'
import { ModeFriendlyNames, ModeFriendlyValues } from '../interface/modes'

const ModeController = (modeName: string, values: string[]) => {
  const supportedModes = values.map((value) => {
    return {
      value: value,
      modeResources: {
        friendlyNames: [
          {
            '@type': 'text',
            value: {
              text: _.get(ModeFriendlyValues, value, value),
              locale: 'pt_BR',
            },
          },
        ],
      },
    }
  })

  return {
    interface: Alexa.CapacityInterface.ModeController,
    type: Alexa.CapacityType.AlexaInterface,
    instance: modeName,
    version: '3',
    properties: {
      supported: [
        {
          name: 'mode',
        },
      ],
      retrievable: true,
      proactivelyReported: true,
      nonControllable: false,
    },
    capabilityResources: {
      friendlyNames: [
        {
          '@type': 'text',
          value: {
            text: _.get(ModeFriendlyNames, modeName, modeName),
            locale: 'pt_BR',
          },
        },
      ],
    },
    configuration: {
      ordered: true,
      supportedModes: supportedModes,
    },
  }
}
const DefaultController = (propertyName: string) => {
  return {
    interface: _.get(
      PropertyNamespaceMap,
      propertyName,
      PropertyNamespaceMap.power
    ),
    type: Alexa.CapacityType.AlexaInterface,
    version: '3',
    properties: {
      supported: [
        {
          name: _.get(PropertyNameMap, propertyName, PropertyNameMap.power),
        },
      ],
      proactivelyReported: true,
      retrievable: true,
    },
  }
}

export default { DefaultController, ModeController }
export { DefaultController, ModeController }
