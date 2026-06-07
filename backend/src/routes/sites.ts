import { Router } from 'express'
export const sitesRouter = Router()

sitesRouter.get('/', async (req, res) => {
  res.json({ data: [], message: 'Connect Supabase to get live data' })
})

sitesRouter.post('/', async (req, res) => {
  res.status(201).json({ data: req.body })
})

sitesRouter.patch('/:id', async (req, res) => {
  res.json({ data: req.body, id: req.params.id })
})
