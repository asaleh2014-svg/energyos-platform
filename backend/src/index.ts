import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import { aiRouter } from './routes/ai'
import { connectionsRouter } from './routes/connections'
import { sitesRouter } from './routes/sites'
import { invoicesRouter } from './routes/invoices'
import { anomaliesRouter } from './routes/anomalies'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests' })
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'AI rate limit reached' })

app.use(limiter)
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/ai', aiLimiter, aiRouter)
app.use('/api/connections', connectionsRouter)
app.use('/api/sites', sitesRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/anomalies', anomaliesRouter)

app.listen(PORT, () => console.log(`EnergyOS backend running on port ${PORT}`))
