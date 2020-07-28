export interface ProfileUser {
  user_id: string
  email: string
  name: string
}

export interface DeviceDB {
  device_id: string
  topic_events: string
  device_template: string
  name: string
  capabilities: string[]
  updatedAt: string
  user_id: string
}
