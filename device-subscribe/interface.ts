export interface EventDevice {
  device_id: string
  interface: EventDeviceInterface
}
export interface EventDeviceReport extends EventDevice {
  interface: EventDeviceInterface.report
  capability: string
  value: any
}

export type EventPayload = EventDeviceReport | EventDevice
export enum EventDeviceInterface {
  report = 'report',
}

export interface LambdaContext {
  succeed(response: any): void
  fail(response: any): void
  done(response: any): void
  functionVersion: string
  functionName: string
}

export interface Device {
  device_id: string
  topic_pub: string
  topic_sub: string
  type: string
  name: string
  capabilities: { name: string }[]
  updatedAt: string
}
