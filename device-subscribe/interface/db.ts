export interface DeviceDB {
  device_id: string
  topic_events: string
  device_template: string
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

export interface UserDB {
  email: string
  name: string
  user_id: string
  updatedAt: Date
}
