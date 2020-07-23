import * as _ from 'lodash'
export const Log = (action: string, value: any = {}) => {
  console.log(action, JSON.stringify(_.cloneDeep(value)))
}
