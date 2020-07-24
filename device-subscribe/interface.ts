export interface EventPayload {
  event_id: string
  device_id: string
  event: EventDeviceInterface
  interface: string
  value: any
  correlation?: string
}
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
  capabilities: string[]
  updatedAt: string
  user_id: string
}

export interface UserToken {
  access_token: string
  refresh_token: string
  expires_in: string
  creation_token: string
  token_type: string
  created_at: string
  user_id: string
  code: string
}

export namespace Alexa {
  export interface Interface {
    directive: {
      header: {
        namespace: DirectiveName
        name: DirectiveName
        messageId: string
        payloadVersion: string
        correlationToken?: string
      }
      payload: Payload
      endpoint: {
        scope: {
          type: string
          token: string
        }
        endpointId: string
        cookie: {
          [name: string]: any
        }
      }
    }
  }

  export enum DirectiveName {
    AcceptGrant = 'AcceptGrant',
    AcceptGrantResponse = 'AcceptGrant.Response',
    ErrorResponse = 'ErrorResponse',
    Discover = 'Discover',
    DiscoverResponse = 'Discover.Response',
    AlexaInterface = 'AlexaInterface',
    PowerController = 'Alexa.PowerController',
    BrightnessController = 'Alexa.BrightnessController',
    ColorController = 'Alexa.ColorController',
    LockController = 'Alexa.LockController',
    Authorization = 'Alexa.Authorization',
    Alexa = 'Alexa',
    Discovery = 'Alexa.Discovery',
    Response = 'Response',
    AddOrUpdateReport = 'AddOrUpdateReport',
    StateReport = 'StateReport',
    ChangeReport = 'ChangeReport',
  }

  export type Payload = PayloadAuthorization | { [name: string]: any }
  export interface PayloadAuthorization {
    grant: {
      type: string
      code: string
    }
    grantee: {
      type: string
      token: string
    }
  }
  export interface Response {
    event: {
      header: {
        namespace: DirectiveName
        name: DirectiveName
        messageId: string
        payloadVersion: string
      }
      endpoint?: {
        scope?: {
          type: string
          token: string
        }
        endpointId: string
      }
      payload?: PayloadError | PayloadEndpoints | any
    }
    context?: {
      properties: {
        namespace: DirectiveName
        name: string
        value: any
        timeOfSample: string
        uncertaintyInMilliseconds: number
      }[]
    }
  }
  export interface PayloadError {
    type: ErrorEnum
    message: string
  }
  export enum ErrorEnum {
    ALREADY_IN_OPERATION = 'ALREADY_IN_OPERATION',
    BRIDGE_UNREACHABLE = 'BRIDGE_UNREACHABLE',
    CLOUD_CONTROL_DISABLED = 'CLOUD_CONTROL_DISABLED',
    ENDPOINT_BUSY = 'ENDPOINT_BUSY',
    ENDPOINT_LOW_POWER = 'ENDPOINT_LOW_POWER',
    ENDPOINT_UNREACHABLE = 'ENDPOINT_UNREACHABLE',
    EXPIRED_AUTHORIZATION_CREDENTIAL = 'EXPIRED_AUTHORIZATION_CREDENTIAL',
    FIRMWARE_OUT_OF_DATE = 'FIRMWARE_OUT_OF_DATE',
    HARDWARE_MALFUNCTION = 'HARDWARE_MALFUNCTION',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    INVALID_AUTHORIZATION_CREDENTIAL = 'INVALID_AUTHORIZATION_CREDENTIAL',
    INVALID_DIRECTIVE = 'INVALID_DIRECTIVE',
    INVALID_VALUE = 'INVALID_VALUE',
    NO_SUCH_ENDPOINT = 'NO_SUCH_ENDPOINT',
    NOT_CALIBRATED = 'NOT_CALIBRATED',
    NOT_SUPPORTED_IN_CURRENT_MODE = 'NOT_SUPPORTED_IN_CURRENT_MODE',
    NOT_IN_OPERATION = 'NOT_IN_OPERATION',
    POWER_LEVEL_NOT_SUPPORTED = 'POWER_LEVEL_NOT_SUPPORTED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    TEMPERATURE_VALUE_OUT_OF_RANGE = 'TEMPERATURE_VALUE_OUT_OF_RANGE',
    TOO_MANY_FAILED_ATTEMPTS = 'TOO_MANY_FAILED_ATTEMPTS',
    VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  }
  export interface PayloadEndpoints {
    endpoints: Device[]
  }
  export interface Device {
    endpointId: string
    manufacturerName: string
    friendlyName: string
    description: string
    displayCategories: string[]
    capabilities: DeviceCapacity[]
  }
  export interface DeviceCapacity {
    type: CapacityType
    interface: CapacityInterface
    version: string
    properties?: {
      supported: {
        name: CapacitySupport
      }[]
      retrievable?: boolean
      proactivelyReported?: boolean
    }
  }
  export enum CapacityType {
    AlexaInterface = 'AlexaInterface',
  }
  export enum CapacityInterface {
    AlexaInterface = 'AlexaInterface',
    PowerController = 'Alexa.PowerController',
    BrightnessController = 'Alexa.BrightnessController',
    ColorController = 'Alexa.ColorController',
    LockController = 'Alexa.LockController',
    Alexa = 'Alexa',
  }
  export enum CapacitySupport {
    powerState = 'powerState',
    brightness = 'brightness',
    color = 'color',
    lockState = 'lockState',
  }
}
