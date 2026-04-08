import { Router } from 'express'
import { getLog, verifyChain } from '../services/logService.js'

const router = Router()

router.get('/log', async (req, res) => {
  try {
    const entries = await getLog(req.query.intentId)
    res.json({ entries })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/verify', async (req, res) => {
  try {
    const result = await verifyChain()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
