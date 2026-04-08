import { Router } from 'express'
import * as logService from '../services/logService.js'

const router = Router()

router.get('/log', (req, res) => {
  res.json({ entries: [] })
})

export default router
