import { Alexa, ProfileUser } from '../interface'
import { v4 as uuidv4 } from 'uuid'
import * as _ from 'lodash'
import axios from 'axios'
import { DynamoDB, AWSError } from 'aws-sdk'

export const findUser = (token: string): Promise<ProfileUser> => {
  return new Promise(async (resolve, reject) => {
    try {
      const profile = await axios.get('https://api.amazon.com/user/profile', {
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
      console.log(profile)
      resolve(_.get(profile, 'data') as ProfileUser)
    } catch (err) {
      reject({
        message: _.get(err, 'response.message', _.get(err, 'message')),
        code: err.status,
      })
    }
  })
}
export default (payload: Alexa.Interface): Promise<Alexa.Response> => {
  return new Promise(async (resolve, reject) => {
    try {
      const dynamoDB = new DynamoDB.DocumentClient()
      const profile = await findUser(
        _.get(payload, 'directive.payload.grantee.token')
      )
      dynamoDB.put(
        {
          TableName: 'iot-users',
          Item: {
            email: profile.email,
            name: profile.name,
            user_id: profile.user_id,
            auth_code: _.get(payload, 'directive.payload.grant.code'),
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
      reject({
        message: _.get(err, 'response.message', _.get(err, 'message')),
        code: err.status,
      })
    }
  })
}
