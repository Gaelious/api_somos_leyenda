import { Router } from 'express'
import { NftController } from '../controller/nftC.js'
import { verifyToken } from '../authMiddleware.js'

export const NftRouter = Router()

NftRouter.post('/create', verifyToken, NftController.createNft)

// NftRouter.post('/create', verifyToken, NftController.mintNft)

NftRouter.post('/send', verifyToken, NftController.sendNft)

NftRouter.post('/list', verifyToken, NftController.listNft)
