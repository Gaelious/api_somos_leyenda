import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { validateUser, loginSchema } from './validations.js'
import { SECRET_JWT_KEY } from './config.js'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())
app.use(cookieParser())
app.disable('x-powered-by')

const PORT = process.env.PORT ?? 3000

app.use((req, res, next) => {
  const token = req.cookies.access_token
  req.session = { user: null }

  try {
    const data = jwt.verify(token, SECRET_JWT_KEY)
    req.session.user = data
  } catch { }

  next()
})

app.get('/', async (req, res) => {
  const { user } = req.session
  if (!user) return res.status(403).send('Access not authorized')
  res.send(`bienvenido a la pagina pricipal: ${user.id} ${user.username}`)
})

app.post('/register', async (req, res) => {
  try {
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

    const hashedPassword = await bcrypt.hash(result.data.password, 10)

    const newUser = await prisma.users.create({
      data: {
        username: result.data.username,
        email: result.data.email,
        password: hashedPassword,
        wallet: result.data.walletaddress,
        level: result.data.level || 1
      }
    })

    const { password: _, ...publicUser } = newUser
    res.status(201).json({ message: 'Usuario registrado exitosamente', user: publicUser })
  } catch (err) {
    console.log(err)
    res.status(403).json({ error: 'Error al registrar al usuario' })
  }
})

app.post('/login', async (req, res) => {
  try {
    const result = loginSchema.parse(req.body)

    const user = await prisma.users.findUnique({
      where: {
        email: result.email
      }
    })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const isValid = await bcrypt.compare(result.password, user.password)
    if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' })

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_JWT_KEY, { expiresIn: '1h' })

    res.cookie('access_token', token, {
      httpOnly: true, // La cookie solo se puede acceder desde el servidor
      secure: process.env.NODE_ENV === 'production', // la cookie solo se puede acceder en https
      sameSite: 'strict' // la cookie soo se puede acceder desde el mismo dominio
    })
    res.send('Logeado con exito', { user, token })
  } catch (err) {
    console.log(err)
    res.status(403).json({ error: 'Error al logear al usuario' })
  }
})

app.post('/logout', (req, res) => {
  res.clearCookie('access_token')
  res.send('Sesion cerrada correctamente')
})
app.get('/protected', (req, res) => {
  const token = req.cookies.access_token
  if (!token) {
    return res.status(401).send('Access not authorized')
  }

  try {
    const data = jwt.verify(token, SECRET_JWT_KEY)
    res.send(`<h1>protected PAGE, ${data.username}</h1>`)
  } catch (err) {
    return res.status(401).send('Access not authorized')
  }
})

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto: ${PORT}`)
})
