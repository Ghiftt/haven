import 'dotenv/config'
import express from 'express'
import intentRoutes  from './routes/intent.js'
import paymentRoutes from './routes/payment.js'
import policyRoutes  from './routes/policy.js'
import txRoutes from './routes/tx.js'
import auditRoutes   from './routes/audit.js'

const app = express()
app.use(express.json())

app.use('/intent',  intentRoutes)
app.use('/payment', paymentRoutes)
app.use('/policy',  policyRoutes)
app.use('/tx', txRoutes)
app.use('/audit',   auditRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.API_PORT || 3002
app.listen(PORT, () => console.log(`HAVEN API on :${PORT}`))


