import { Alexa } from '../interface'
import * as _ from 'lodash'

export default (payload: Alexa.Interface): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (err) {
      reject({
        message: _.get(err, 'response.message', _.get(err, 'message')),
        code: err.status,
      })
    }
  })
}
