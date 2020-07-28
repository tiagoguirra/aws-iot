import * as Alexa from '../interface/alexa'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import axios from 'axios'
import { saveTokens, saveUser } from '../database/database'
import { ProfileUser } from '../interface/database'

export const findUser = (token: string): Promise<ProfileUser> => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile = await axios.get('https://api.amazon.com/user/profile', {
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
      resolve(_.get(profile, 'data') as ProfileUser)
    } catch (err) {
      console.log('Erro find profile', err)
      reject({
        message: _.get(err, 'response.message', _.get(err, 'message')),
        code: err.status,
      })
    }
  })
}

const createAndSaveTokens = (code: string, userId: string) => {
  return new Promise(async (resolve, reject) => {
    axios
      .post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      })
      .then(data => saveTokens(code, userId, _.get(data, 'data')))
      .then(data => resolve(data))
      .catch(err => {
        reject(err)
      })
  })
}
export default (payload: Alexa.Interface): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile = await findUser(
        _.get(payload, 'directive.payload.grantee.token')
      )
      const code = _.get(payload, 'directive.payload.grant.code')
      await createAndSaveTokens(code, profile.user_id)
      await saveUser(profile)
      resolve({
        event: {
          header: {
            namespace: Alexa.DirectiveName.Authorization,
            name: Alexa.DirectiveName.AcceptGrantResponse,
            messageId: uuidv4(),
            payloadVersion: '3',
          },
          payload: {},
        },
      })
    } catch (err) {
      reject(err)
    }
  })
}
