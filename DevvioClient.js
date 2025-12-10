import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
// import { checkDevvioResponse } from './config.js'
const coinId = '8089685750604583936'

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
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpires = null
    this.wallet = null

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  tokenExpired () {
    if (!this.tokenExpiresAt) {
      return true
    }
  }

  async refreshAccessToken () {
    const payload = {
      refreshToken: this.refreshToken,
      apikey: this.apiKey
    }

    try {
      const response = await this.apiClient.post('/auth/refresh', payload)

      if (response.status === 200) {
        const result = response.data
        this.accessToken = result.accessToken

        if (result.tokenExpiration) {
          this.tokenExpiresAt = new Date(parseInt(result.tokenExpiration) * 1000)
        }

        return result
      } else {
        throw new Error(`Token refresh failed: ${response.data.message || response.statusText}`)
      }
    } catch (err) {
      console.error('Error refreshing token:', err.message)
      throw err
    }
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

        if (result.tokenExpiration) {
          this.tokenExpiresAt = new Date(parseInt(result.tokenExpiration) * 1000)
        }

        return result
      } else {
        throw new Error(`Login failed: ${response.data.message || response.statusText}`)
      }
    } catch (err) {
      console.error('Error during login:', err.message)
      throw err
    }
  }

  async ensureAuthenticated () {
    // Ensure we have a valid access token
    if (!this.accessToken || this.tokenExpired()) {
      if (this.refreshToken) {
        await this.refreshAccessToken()
      } else {
        throw new Error('No valid authentication. Please login first.')
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
      throw new Error(`Registration failed: ${err.response?.data?.message || err.message}`)
    }
  }

  async makeAuthenticatedRequest (endpoint, data) {
    // Make an authenticated API request with automatic token refresh
    await this.ensureAuthenticated()

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    // Add API key to request body
    data.apikey = this.apiKey

    try {
      let response = await this.apiClient.post(endpoint, data, { headers })

      // Handle token expiry and retry once
      if (response.status === 401 && this.refreshToken) {
        console.log('🔄 Token expired, refreshing...')
        await this.refreshAccessToken()
        headers.Authorization = `Bearer ${this.accessToken}`
        response = await this.apiClient.post(endpoint, data, { headers })
      }

      if (response.status === 200) {
        return response.data
      } else {
        throw new Error(`Request to ${endpoint} failed: ${response.data.message || response.statusText}`)
      }
    } catch (err) {
      console.error(`Error making request to ${endpoint}:`, err.message)
      throw err
    }
  }

  generateChecksum (coinId, amount, clientId) {
    const combined = String(coinId) + String(this.apiKey) + String(amount) + String(clientId)
    return crypto.createHash('sha256').update(combined, 'utf-8').digest('hex')
  }

  async createToken (coinId, amount, properties = null) {
    const clientId = uuidv4()
    console.log('Datos para checksum:', { coinId, apiKey: this.apiKey, amount, clientId })
    const checksum = this.generateChecksum(coinId, amount, clientId)
    console.log(checksum)
    const payload = {
      coinId,
      amount,
      clientId,
      checksum
    }

    if (properties) {
      payload.properties = properties
    }

    const result = await this.makeAuthenticatedRequest('/core/asset/create', payload)

    return result
  }

  async createNft (name, description, imageUrl, attributes = null) {
    const NftCoinId = '8089685750604583936'

    const properties = {
      name,
      description,
      image: imageUrl,
      createdAt: new Date().toISOString(),
      version: '1.0'
    }

    if (attributes) {
      properties.attributes = attributes
    }

    return this.createToken(NftCoinId, 1, properties)
  }

  async getWalletNfts () {
    const payload = {
      coinIds: ['8089685750604583936']
    }

    return this.makeAuthenticatedRequest('/core/wallet/assets', payload)
  }

  async sendNft (nftUri, recipientAddr, comment = null, amount = 0) {
    const clientId = uuidv4()

    const checksum = this.generateChecksum(0, amount, clientId)

    const payload = {
      apikey: this.apiKey,
      nftUri,
      recipientAddr,
      clientId,
      checksum
    }

    if (comment) {
      payload.comment = comment
    }
    try {
      const result = await this.makeAuthenticatedRequest('/core/nft17/send', payload)
      console.log('Resultado del send:', result)
      return result
    } catch (err) {
      throw new Error(`Error sending NFT: ${err.message}`)
    }
  }

  async modifyNft (nftUri, newProperties) {
    const clientId = uuidv4()

    const checksum = this.generateChecksum(nftUri, JSON.stringify(newProperties), clientId)

    const payload = {
      coinId,
      nftUri,
      properties: newProperties,
      clientId,
      checksum
    }

    const result = await this.makeAuthenticatedRequest('/core/asset/modify', payload)
    return result
  }

  async logout () {
    console.log(this.accessToken)
    if (!this.accessToken) throw new Error('Not logged in')

    try {
      const result = await this.makeAuthenticatedRequest('/auth/logout', { apikey: this.apiKey })
      this.clearTokens()
      return result
    } catch (err) {
      throw new Error('Error en el logout', err.message)
    }
  }

  async clearTokens () {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiresAt = null
  }

  async confirmAccount (username, verificationCode) {
    const payload = {
      apikey: this.apiKey,
      verifyCode: verificationCode,
      username
    }
    try {
      const response = await this.apiClient.post('/auth/confirmSignUp', payload)
      return response.data
    } catch (err) {
      throw new Error(`Account confirmation failed: ${err.message}`)
    }
  }

  async resendVerificationCode (username) {
    const payload = {
      apikey: this.apiKey,
      username
    }
    try {
      const response = await this.apiClient.post('/auth/verification/resend', payload)
      return response.data
    } catch (err) {
      throw new Error(`Resend verification code failed: ${err.message}`)
    }
  }

  async listNfts () {
    const payload = {
      apikey: this.apiKey
    }
    try {
      const response = await this.makeAuthenticatedRequest('/core/nft/list', payload)
      console.log('la respuesta es: ', response)
      return response
    } catch (err) {
      throw new Error(err)
    }
  }
}
