import { Router } from 'express'
import { getPolicy, setPolicy } from '../services/policyStore.js'

const router = Router()

router.get('/:agent', (req, res) => {
  const policy = getPolicy(req.params.agent)
  if (!policy) return res.status(404).json({ error: 'No policy found' })
  res.json(policy)
})

router.post('/:agent', (req, res) => {
  const { recipients, spend_cap } = req.body
  setPolicy(req.params.agent, { recipients, spend_cap })
  res.json({ ok: true })
})

export default router
