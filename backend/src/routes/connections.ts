import { Router } from 'express'
export const connectionsRouter = Router()

// These will query Supabase in production
// For now, routes are structured and ready for DB integration

connectionsRouter.get('/', async (req, res) => {
  const { tenant_id, status, type } = req.query
  // TODO: const { data } = await supabase.from('energy_connections').select('*,meters(*),sites(name,city)').eq('tenant_id', tenant_id)
  res.json({ data: [], message: 'Connect Supabase to get live data' })
})

connectionsRouter.get('/:id', async (req, res) => {
  res.json({ data: null, id: req.params.id })
})

connectionsRouter.post('/', async (req, res) => {
  const body = req.body
  // TODO: insert into energy_connections
  res.status(201).json({ data: body, message: 'Created (mock)' })
})

connectionsRouter.patch('/:id', async (req, res) => {
  res.json({ data: req.body, id: req.params.id })
})

connectionsRouter.delete('/:id', async (req, res) => {
  res.json({ deleted: req.params.id })
})
