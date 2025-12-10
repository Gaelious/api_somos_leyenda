import { validateUser, loginSchema } from '../validations.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { SECRET_JWT_KEY, DEVVE_BASE_URL, DEVVE_API_KEY } from '../config.js'
import { DevvioClient } from '../DevvioClient.js'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export class UserController {
  static async register (req, res) {
    const result = validateUser(req.body)

    if (result.error) {
      return res.status(400).json({ error: JSON.parse(result.error.message) })
    }

    const existUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: result.data.username },
          { email: result.data.email },
          { wallet: result.data.walletaddress }
        ]
      }
    })

    if (existUser) {
      if (existUser.username === result.data.username) return res.status(409).json({ error: 'El usuario ya esta registrado' })
      if (existUser.email === result.data.email) return res.status(409).json({ error: 'El email ya esta registrado' })
      if (existUser.wallet === result.data.walletaddress) return res.status(409).json({ error: 'La cartera ya esta registrado' })
    }
    const userInfo = {
      username: result.data.username,
      password: result.data.password,
      email: result.data.email,
      fullName: result.data.fullname,
      phone: result.data.phone
    }
    try {
      const userClient = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)

      const response = await userClient.register(userInfo)
      const hashedPassword = await bcrypt.hash(result.data.password, 10)
      console.log('Devvio registration response:', response, result.data.username)

      if (response.code === 4030) {
        const newUser = await prisma.users.create({
          data: {
            username: result.data.username,
            password: hashedPassword,
            email: result.data.email,
            fullName: result.data.fullname,
            phone: result.data.phone,
            level: result.data.level || 0
          }
        })
        const { password: _, ...publicUser } = newUser
        return res.status(200).json({ message: 'Registro realizado con exito', publicUser })
      }
    } catch (errMessage) {
      return res.status(400).json({ error: `Error al registrar el usuario en devve: ${errMessage}` })
    }
  }

  static async logout (req, res) {
    res.clearCookie('access_token')
    res.send('Sesion cerrada correctamente')
  }

  static async login (req, res) {
    const result = loginSchema.parse(req.body)

    const user = await prisma.users.findUnique({
      where: {
        email: result.email
      }
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const isValid = await bcrypt.compare(result.password, user.password)
    if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' })

    try {
      const userClient = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)

      await userClient.login(user.username, req.body.password)

      await prisma.users.update({
        where: { id: user.id },
        data: {
          devveAccessToken: userClient.accessToken,
          devveRefreshToken: userClient.refreshToken,
          devveTokenExpiresAt: userClient.tokenExpiresAt,
          wallet: userClient.walletAddress
        }
      })
    } catch (err) {
      return res.status(401).json({ error: 'Error al iniciar sesión en Devvio' })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_JWT_KEY, { expiresIn: '1h' })

    res.cookie('access_token', token, {
      httpOnly: true, // La cookie solo se puede acceder desde el servidor
      secure: process.env.NODE_ENV === 'production', // la cookie solo se puede acceder en https
      sameSite: 'strict' // la cookie soo se puede acceder desde el mismo dominio
    })

    res.send('Logeado con exito', { user, token })
  }

  static async verifyaccount (req, res) {
    const { username, code } = req.body
    const userClient = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)
    const response = await userClient.confirmAccount(username, code)
    console.log(response)
    if (response.code === 200) {
      res.status(200).json({ message: 'Cuenta verificada con exito' })
    } else if (response.code === 1010) {
      res.status(400).json({ error: 'Error codigo de verificacion caducado' })
    } else {
      res.status(400).json({ error: 'Error al verificar la cuenta' })
    }
  }

  static async resendCode (req, res) {
    const { username } = req.body
    try {
      const userClient = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)
      await userClient.resendVerificationCode(username)
      return res.status(200).json({ message: 'Codigo de verificacion reenviado' })
    } catch (err) {
      res.status(400).json({ error: `Error al reenviar el codigo de verificacion: ${err.message}` })
    }
  }
}
