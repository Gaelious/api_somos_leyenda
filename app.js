import express from 'express'
import cookieParser from 'cookie-parser'
import { userRouter } from './routes/userR.js'
import { NftRouter } from './routes/nftR.js'

const app = express()

app.use(express.json())
app.use(cookieParser())
app.disable('x-powered-by')

const PORT = process.env.PORT ?? 3000

app.get('/', async (req, res) => {
  res.send('bienvenido a la pagina pricipal de Somos Leyenda API')
})

app.use('/auth', userRouter)

app.use('/nfts', NftRouter)

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto: ${PORT}`)
})
