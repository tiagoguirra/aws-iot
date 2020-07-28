export interface RequestTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface ThingShadowState {
  state: {
    [property: string]: any
  }
  delta?: {
    [property: string]: any
  }
  lastReports: {
    [property: string]: any
  }
  timestamp: number
}
