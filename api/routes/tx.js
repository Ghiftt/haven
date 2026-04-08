import { Router } from 'express'
import { getIntent } from '../services/intentStore.js'

const router = Router()

router.get('/:intentId', (req, res) => {
  const intent = getIntent(req.params.intentId)
  if (!intent) return res.status(404).json({ error: 'Intent not found' })
  res.json({
    intentId: intent.id,
    state:    intent.state,
    tx_hash:  intent.tx_hash ?? null,
    blocked:  intent.state === 'BLOCKED',
    reason:   intent.fw_reason ?? null,
  })
})

export default router
