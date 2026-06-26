import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

export const connectionsRouter = Router()

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

connectionsRouter.get('/', async (req, res) => {
  const { tenant_id, status, type } = req.query
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' })

  const db = getSupabase()
  let query = db
    .from('energy_connections')
    .select('*, meters(*), sites(name, city)')
    .eq('tenant_id', tenant_id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('connection_type', type)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

connectionsRouter.get('/:id', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('energy_connections')
    .select('*, meters(*), sites(name, city)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  res.json({ data })
})

connectionsRouter.post('/', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('energy_connections')
    .insert(req.body)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ data })
})

connectionsRouter.patch('/:id', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('energy_connections')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

connectionsRouter.delete('/:id', async (req, res) => {
  const db = getSupabase()
  const { error } = await db.from('energy_connections').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ deleted: req.params.id })
})
