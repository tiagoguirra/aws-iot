import { DirectiveName, CapacitySupport } from './alexa'

export interface EventBase {
  event_id: string
  device_id: string
  event: EventDeviceInterface
}
export enum EventDeviceInterface {
  physicalInteraction = 'physical_interaction',
  registerDevice = 'register_device',
}

export interface EventRegister extends EventBase {
  event: EventDeviceInterface.registerDevice
  properties: {
    power: boolean
    color: boolean
    brightness: boolean
    lock: boolean
  }
  buttons: {
    power: boolean
    color: boolean
    brightness: boolean
    lock: boolean
  }
  device_template: DeviceTemplate
  topic_events: string
}
export interface EventPhysicalInteraction extends EventBase {
  event: EventDeviceInterface.physicalInteraction
  property: string
  state: {
    power?: boolean
    color?: {
      hue: number
      saturation: number
      brightness: number
    }
    brightness?: number
    lock?: string
  }
}

export enum DeviceTemplate {
  switch = 'switch',
  light = 'light',
  light_rgb = 'light_rgb',
  light_brightness = 'light_brightness',
  smartlock = 'smartlock',
}
export type EventPayload = EventPhysicalInteraction | EventRegister

export enum PropertyNamespaceMap {
  'power' = DirectiveName.PowerController,
  'color' = DirectiveName.ColorController,
  'lock' = DirectiveName.LockController,
  'brightness' = DirectiveName.BrightnessController,
}
export enum PropertyNameMap {
  'power' = CapacitySupport.powerState,
  'color' = CapacitySupport.color,
  'lock' = CapacitySupport.lockState,
  'brightness' = CapacitySupport.brightness,
}

export enum DeviceCategoryMap {
  light = 'LIGHT',
  light_rgb = 'LIGHT',
  light_brightness = 'LIGHT',
  smartlock = 'SMARTLOCK',
  switch = 'SWITCH',
}
export interface LambdaContext {
  succeed(response: any): void
  fail(response: any): void
  done(response: any): void
  functionVersion: string
  functionName: string
}
