import { Response } from './alexa'
export interface Context {
  succeed(response: Response | null): void
  fail(response: any): void
  done(response?: any): void
  functionVersion: string
  functionName: string
}
