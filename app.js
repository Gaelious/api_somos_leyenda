import express from 'express'

const app = express()

const PORT = process.env.PORT ?? 3000

app.get('/', (req, res) => {
  res.send('<h1>SOMOS LEYENDA</h1>')
})

app.post('/register', (req, res) => {
  res.send('<h1>LOGIN PAGE</h1>')
})
app.post('/login', (req, res) => {
  res.send('<h1>LOGIN PAGE</h1>')
})

app.post('/logout', (req, res) => {
  res.send('<h1>LOGIN PAGE</h1>')
})
app.post('/protected', (req, res) => {
  res.send('<h1>LOGIN PAGE</h1>')
})

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto: ${PORT}`)
})
