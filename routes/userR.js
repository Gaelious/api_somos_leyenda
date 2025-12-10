import { Router } from 'express'
import { UserController } from '../controller/userC.js'
import { verifyToken } from '../authMiddleware.js'

export const userRouter = Router()

userRouter.post('/register', UserController.register)

userRouter.post('/logout', verifyToken, UserController.logout)

userRouter.post('/login', UserController.login)

userRouter.post('/verify', UserController.verifyaccount)

userRouter.post('/resendCode', UserController.resendCode)
