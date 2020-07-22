export interface LambdaContext {
  succeed(response: any): void
  fail(response: any): void
  done(response: any): void
  functionVersion: string
  functionName: string
}
export interface EventTrigger {
  Records: EventTriggerItem[]
}
export interface EventTriggerItem {
  eventID: string
  eventName: string
  eventSource: string
  dynamodb: {
    Keys: {
      event_id: {
        S: string
      }
    }
    NewImage: ItemEvent
  }
}
export interface ItemEvent {
  capability: {
    S: string
  }
  event_id: {
    S: string
  }
  device_id: {
    S: string
  }
  action: {
    S: string
  }
  createdAt: {
    S: string
  }
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
export interface DeviceEvent {
  event_id: string
  action: string
  capability: string
  createdAt: string
  device_id: string
}
