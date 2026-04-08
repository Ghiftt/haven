import { Router } from 'express'
import { createIntent, reviewIntent, executePayment } from '../services/orchestrator.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const intent = await createIntent(req.body)
    res.json(intent)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:id/review', async (req, res) => {
  try {
    const result = await reviewIntent(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
