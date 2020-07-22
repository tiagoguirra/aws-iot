import { Alexa, Context, ProfileUser } from './interface'
import { v4 as uuidv4 } from 'uuid'
import handlers from './handlers'
import * as _ from 'lodash'
import { findUser } from './handlers/authorization'

const controllers = [
  Alexa.DirectiveName.BrightnessController,
  Alexa.DirectiveName.ColorController,
  Alexa.DirectiveName.LockController,
  Alexa.DirectiveName.PowerController,
]

export const handler = async (payload: Alexa.Interface, context: Context) => {
  let response: Alexa.Response | null = null
  let profile: ProfileUser | null = null
  const tokenProfile: string = _.get(payload, 'directive.payload.grantee.token')
  try {
    if (tokenProfile) {
      profile = await findUser(tokenProfile)
    }
    const directive = payload.directive.header.namespace
    if (controllers.includes(directive)) {
      response = await handlers.controller(payload, profile)
    } else {
      switch (directive) {
        case Alexa.DirectiveName.Authorization:
          response = await handlers.authorization(payload)
          break
        case Alexa.DirectiveName.Discovery:
          response = await handlers.discover(payload, profile)
          break
        default:
          throw new Error('Namespace não suportado')
      }
    }
  } catch (err) {
    console.log('Falha interna', err)
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
  return context.succeed(response)
}
