import axios, { isAxiosError } from 'axios'

export class DevvioClient {
  baseUrl
  apiKey
  accessToken
  refreshToken
  tokenExpiresAt
  walletAddress

  // cliente de axios pre-configurado
  apiClient

  constructor (baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/+$/, '') // Remove trailing slashes
    this.apiKey = apiKey

    this.apiClient = axios.create({
      baseURL: this.baseUrl
    })
  }

  async login (username, password) {
    const payload = {
      apikey: this.apiKey,
      username,
      password
    }

    try {
      const response = await this.apiClient.post('/auth/login', payload)

      if (response.status === 200) {
        const result = response.data
        this.accessToken = result.accessToken
        this.refreshToken = result.refreshToken
        this.walletAddress = result.pub
        this.tokenExpiresAt = result.tokenExpiration * 1000

        return result
      }
    } catch (err) {
      if (isAxiosError(err)) {
        throw new Error(`Login failed: ${err.response?.data?.message || err.message}`)
      }
    }
  }

  async register (userData) {
    const payload = {
      apikey: this.apiKey,
      ...userData
    }

    try {
      const response = await this.apiClient.post('auth/register', payload)
      return response.data
    } catch (err) {
      if (isAxiosError(err)) {
        throw new Error(`Registration failed: ${err.response?.data?.message || err.message}`)
      }
    }
  }
}
