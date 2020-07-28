import * as Alexa from './interface/alexa'
import { Context } from './interface/lambda'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import { Log } from './lib/log'
import authorization from './handlers/authorization'
import discover from './handlers/discover'
import controller from './handlers/controller'

const controllers = [
  Alexa.DirectiveName.BrightnessController,
  Alexa.DirectiveName.ColorController,
  Alexa.DirectiveName.LockController,
  Alexa.DirectiveName.PowerController,
]

export const handler = async (payload: Alexa.Interface, context: Context) => {
  let response: Alexa.Response | null = null
  try {
    Log('payload', payload)
    const directive = payload.directive.header.namespace
    if (
      controllers.includes(directive) ||
      directive === Alexa.DirectiveName.Alexa
    ) {
      response = await controller(payload)
    } else {
      switch (directive) {
        case Alexa.DirectiveName.Authorization:
          response = await authorization(payload)
          break
        case Alexa.DirectiveName.Discovery:
          response = await discover(payload)
          break
        default:
          throw new Error('Namespace não suportado')
      }
    }
  } catch (err) {
    console.log(err)
    Log('Falha ao interna', {
      code: _.get(err, 'state', _.get(err, 'code')),
      message: _.get(err, 'message'),
      data: _.get(err, 'response.data', ''),
    })
    response = {
      event: {
        header: {
          messageId: uuidv4(),
          name: Alexa.DirectiveName.ErrorResponse,
          namespace: Alexa.DirectiveName.Alexa,
          payloadVersion: '3',
        },
        payload: {
          type: Alexa.ErrorEnum.INTERNAL_ERROR,
          message: _.get(err, 'message', 'Falha interna'),
        },
      },
    }
  }
  Log('response', response)
  return context.succeed(response)
}
