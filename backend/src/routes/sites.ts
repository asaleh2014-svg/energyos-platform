import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

export const sitesRouter = Router()

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

sitesRouter.get('/', async (req, res) => {
  const { tenant_id } = req.query
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' })

  const db = getSupabase()
  const { data, error } = await db
    .from('sites')
    .select('*, cities(name, countries(name, code))')
    .eq('tenant_id', tenant_id)
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

sitesRouter.get('/:id', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('sites')
    .select('*, cities(name, countries(name, code))')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: error.message })
  res.json({ data })
})

sitesRouter.post('/', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('sites')
    .insert(req.body)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ data })
})

sitesRouter.patch('/:id', async (req, res) => {
  const db = getSupabase()
  const { data, error } = await db
    .from('sites')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

sitesRouter.delete('/:id', async (req, res) => {
  const db = getSupabase()
  const { error } = await db.from('sites').delete().eq('id', req.params.id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ deleted: req.params.id })
})
