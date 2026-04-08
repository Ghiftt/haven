import { Router } from 'express'
import { executePayment } from '../services/orchestrator.js'

const router = Router()

router.post('/execute', async (req, res) => {
  try {
    const { intentId } = req.body
    if (!intentId) return res.status(400).json({ error: 'intentId required' })
    const result = await executePayment(intentId)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
