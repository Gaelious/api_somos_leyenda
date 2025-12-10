import { PrismaClient } from '@prisma/client'
import { DEVVE_BASE_URL, DEVVE_API_KEY } from '../config.js'
import { DevvioClient } from '../DevvioClient.js'
import { nftLevelData } from '../nftTemplate.js'

const prisma = new PrismaClient()

export class NftController {
  static async createNft (req, res) {
    const userId = req.userId

    const user = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!user || !user.devveAccessToken || !user.devveRefreshToken) return res.status(403).json({ error: 'Usuario no encontrado o no tienen tokens' })

    const userClient = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)

    userClient.accessToken = user.devveAccessToken
    userClient.refreshToken = user.devveRefreshToken
    userClient.tokenExpiresAt = user.devveTokenExpiresAt

    const userLevel = user.level

    const nftData = nftLevelData[userLevel]

    const properties = {
      tipo: nftData.tipo,
      motivo: nftData.motivo
    }

    const result = await userClient.createNft(nftData.name, nftData.description, nftData.imageUrl, properties)

    if (result.error) res.status(400).json({ error: result.error })
    console.log(result)
    console.log(result.properties.details.attributes)
    await prisma.nft.create({
      data: {
        name: result.properties.details.name,
        description: result.properties.details.description,
        imageUri: nftData.image,
        Motivo: result.properties.details.attributes.motivo,
        Tipo: result.properties.details.attributes.tipo,
        assetUri: result.assetUri,
        ownerId: userId,
        ownerWallet: user.wallet,
        createdAt: new Date(),
        level: userLevel
      }
    })

    res.send({ message: 'Nft creado exitosamente' }, { nftLevel: userLevel })
  }

  static async sendNft (req, res) {
    const userId = req.userId
    const { nftUri, recipientAddress, comment } = req.body

    if (!nftUri || !recipientAddress) {
      return res.status(400).json({ error: 'Faltan parametros (nftUri o recipientAddress)' })
    }

    try {
      // 2. Buscar NFT Local (Descomentar validación es vital)
      const assetUri = nftUri
      const localNft = await prisma.nft.findFirst({
        where: { assetUri }
      })
        /*
      if (!localNft) {
        // Si no lo tienes en tu DB, ¿deberías permitir enviarlo? 
        // Si permites enviarlo, luego no podrás hacer localNft.id abajo.
        // Por seguridad, mejor retornamos error o creamos lógica condicional abajo.
        return res.status(404).json({ error: 'NFT no encontrado en la base de datos local' })
      }*/
      /*
      // Validación opcional: Verificar si el usuario es dueño antes de intentar enviar
      if (localNft.ownerId !== userId) {
        return res.status(403).json({ error: 'No eres el propietario de este NFT' })
      }*/

      const sender = await prisma.users.findUnique({
        where: { id: userId }
      })

      // Buscar si el receptor existe en TU sistema (para actualizar DB luego)
      const receiver = await prisma.users.findFirst({
        where: { wallet: recipientAddress } // Asumo que buscas por wallet, no por ID
      })

      // Corrección de typo en mensaje de error: "Usuario NO encontrado"
      if (!sender || !sender.devveRefreshToken) {
        return res.status(401).json({ error: 'Usuario no autorizado o sin credenciales' })
      }

      console.log('Payload a enviar a Devvio:', { nftUri, recipientAddress })

      // 3. Preparar el Cliente
      const client = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)

      // Configurar tokens de sesión
      client.accessToken = sender.devveAccessToken
      client.refreshToken = sender.devveRefreshToken
      client.tokenExpiresAt = sender.devveTokenExpiresAt
      client.walletAddress = sender.walletAddress // A veces necesario

      // ¡CRUCIAL! Necesitas pasar la private key para que generateChecksum funcione
      // Asegúrate de que tu modelo de usuario tenga este campo o lo obtengas de forma segura

      // 4. Llamada a la Blockchain (Usando la versión corregida de sendNft del mensaje anterior)
      const result = await client.sendNft(nftUri, recipientAddress, comment)

      // 5. Actualizar Tokens del Sender (Refresh Token rotation)
      // Es importante hacer esto incluso si el envío falló pero los tokens se refrescaron,
      // pero aquí asumimos flujo feliz.
      await prisma.users.update({
        where: { id: userId },
        data: {
          devveAccessToken: client.accessToken,
          devveRefreshToken: client.refreshToken,
          devveTokenExpiresAt: client.tokenExpiresAt
        }
      })

      // 6. Verificar error de negocio en la respuesta
      // A veces la API devuelve 200 OK pero con { code: 1004, message: "Error" }
      if (result.code && result.code !== 0) { // Asumiendo que 0 es éxito
        throw new Error(result.message || 'Error desconocido de la API DevvE')
      }

      // 7. Actualizar Base de Datos Local (Transferencia de propiedad)
      if (receiver) {
        // Si el destinatario es un usuario de tu app, le asignamos el NFT
        await prisma.nft.update({
          where: { id: localNft.id },
          data: {
            ownerId: receiver.id,
            ownerWallet: receiver.wallet // o recipientAddress
          }
        })
      } else {
        // Si el destinatario NO es de tu app, tienes dos opciones:
        // A. Borrar el NFT de tu DB local (porque salió de tu ecosistema)
        // B. Dejarlo pero marcar el ownerId como null (Huérfano)

        // Opción A (la que tenías):
        await prisma.nft.delete({
          where: { id: localNft.id }
        })
      }

      res.status(200).json({ message: 'NFT enviado exitosamente', receipt: result.receiptUri })
    } catch (err) {
      console.error('Error en sendNft Controller:', err)
      // Devolvemos el error detallado para que puedas depurar en el frontend/postman
      res.status(400).json({
        error: 'Error al enviar el NFT',
        details: err.message,
        apiResponse: err.response?.data
      })
    }
  }

  static async listNft (req, res) {
    const userId = req.userId
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      })

      if (!user || !user.devveAccessToken || !user.devveRefreshToken) {
        return res.status(401).json({ error: 'Usuario no autenticado' })
      }

      const client = new DevvioClient(DEVVE_BASE_URL, DEVVE_API_KEY)
      client.accessToken = user.devveAccessToken
      client.refreshToken = user.devveRefreshToken
      client.tokenExpiresAt = user.devveTokenExpiresAt

      const nfts = await client.getWalletNfts()
      res.status(200).json({ nfts })
    } catch (err) {
      console.error('Error al listar NFTs:', err.response?.data || err.message)
      res.status(400).json({ error: 'Error al listar NFTs', details: err.message })
    }
  }
}
