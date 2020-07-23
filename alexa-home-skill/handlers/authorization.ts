import { Alexa, ProfileUser } from '../interface'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import axios from 'axios'
import { DynamoDB, AWSError } from 'aws-sdk'

const dynamoDB = new DynamoDB.DocumentClient()
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
const saveTokens = (code: string, userId: string) => {
  return new Promise(async (resolve, reject) => {
    axios
      .post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      })
      .then(data => {
        dynamoDB.put(
          {
            TableName: 'iot-users-tokens',
            Item: {
              code,
              access_token: _.get(data, 'data.access_token'),
              refresh_token: _.get(data, 'data.refresh_token'),
              expires_in: _.get(data, 'data.expires_in'),
              token_type: _.get(data, 'data.token_type'),
              created_at: new Date().toISOString(),
              user_id: userId,
            },
          },
          (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          }
        )
      })
      .catch(err => {
        console.log('Falha ao gerar tokens de acesso usuário', err)
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
      await saveTokens(code, profile.user_id)
      dynamoDB.put(
        {
          TableName: 'iot-users',
          Item: {
            email: profile.email,
            name: profile.name,
            user_id: profile.user_id,
            updatedAt: new Date().toISOString(),
          },
        },
        (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
          if (err) {
            reject({
              message: err.message,
              code: err.code,
            })
          } else {
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
          }
        }
      )
    } catch (err) {
      console.log(err)
      reject({
        message: _.get(err, 'response.message', _.get(err, 'message')),
        code: err.status,
      })
    }
  })
}
