import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from './config.js'

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token

  if (!token) {
    return res.status(401).send('Access not authorized')
  }

  try {
    const user = jwt.verify(token, SECRET_JWT_KEY)

    req.userId = user.id

    next()
  } catch (err) {
    return res.status(401).send('Access not authorized')
  }
}
