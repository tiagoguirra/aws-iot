import { UserToken } from './interface/db'
import { DynamoDB, AWSError } from 'aws-sdk'
import * as _ from 'lodash'
import axios from 'axios'
import * as moment from 'moment'
import { Log } from './lib/log'
import { findTokens } from './database'

const dynamoDB = new DynamoDB.DocumentClient()
const tokenIsValid = (token: UserToken): boolean => {
  const creation = _.get(token, 'created_at')
  const expires = _.get(token, 'expires_in')
  const now = moment().unix()
  const expireAt = moment(creation)
    .add(expires, 'seconds')
    .unix()
  return expireAt > now
}

const updateTokens = (token: UserToken): Promise<UserToken> => {
  return new Promise(async (resolve, reject) => {
    axios
      .post('https://api.amazon.com/auth/o2/token', {
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      })
      .then(response => {
        const newToken = {
          code: token.code,
          access_token: _.get(response, 'data.access_token'),
          refresh_token: _.get(response, 'data.refresh_token'),
          expires_in: _.get(response, 'data.expires_in'),
          token_type: _.get(response, 'data.token_type'),
          created_at: new Date().toISOString(),
          user_id: token.user_id,
        }
        Log('new Token', newToken)
        dynamoDB.put(
          {
            TableName: 'iot-users-tokens',
            Item: newToken,
          },
          (err: AWSError, data: DynamoDB.DocumentClient.PutItemOutput) => {
            if (err) {
              reject(err)
            } else {
              resolve(newToken as UserToken)
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

const getAlexaCredentials = async (userId: string): Promise<UserToken> => {
  let token = await findTokens(userId)
  if (!tokenIsValid(token)) {
    console.log('Token is invalid', token)
    token = await updateTokens(token)
    console.log('Update token', token)
  }
  Log('Tokens', token)
  return token
}
export { getAlexaCredentials }
export default { getAlexaCredentials }
