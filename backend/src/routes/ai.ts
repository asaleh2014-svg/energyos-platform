import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

export const aiRouter = Router()

const SYSTEM_PROMPT = (market: string, context: string) => `
You are EnergyOS AI Auditor — an expert energy portfolio analyst specializing in:
- UAE (DEWA/FEWA/SEWA/ADC tariffs, Net Zero 2050 compliance)
- Netherlands (Enexis, Liander, Stedin, ACM regulations, 18-digit EAN codes)
- UK (National Grid, Ofgem, MPAN identifiers)
- Saudi Arabia (SEC tariffs)
- International markets

You perform: anomaly detection, invoice verification, capacity optimization, ESG reporting, contract analysis, regulatory compliance.

Be concise, specific, and quantitative. Use the local currency and market terminology.

Current fleet context:
${context}

Active market: ${market}
`.trim()

aiRouter.post('/chat', async (req, res) => {
  const { messages, provider = 'claude', market = 'UAE', context = '' } = req.body

  try {
    let reply = ''

    if (provider === 'claude') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT(market, context),
        messages,
      })
      reply = (response.content[0] as { type: string; text: string }).text

    } else if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
      const chat = model.startChat({
        systemInstruction: SYSTEM_PROMPT(market, context),
        history: messages.slice(0, -1).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      })
      const result = await chat.sendMessage(messages.at(-1).content)
      reply = result.response.text()

    } else if (provider === 'openai') {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT(market, context) },
          ...messages,
        ],
      })
      reply = response.choices[0].message.content || ''
    }

    res.json({ content: reply, provider })
  } catch (err: unknown) {
    console.error('AI error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: 'AI request failed', detail: msg })
  }
})

aiRouter.post('/summary', async (req, res) => {
  const { connections, consumption, market = 'UAE' } = req.body
  const prompt = `
Generate a concise executive energy portfolio summary for a ${market} portfolio.
Connections: ${JSON.stringify(connections)}
Consumption: ${JSON.stringify(consumption)}
Include: anomalies, contract inefficiencies, budget status, ESG highlights.
Format as structured Markdown with sections.
`.trim()

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    res.json({ summary: (response.content[0] as { type: string; text: string }).text })
  } catch (err) {
    res.status(500).json({ error: 'Summary generation failed' })
  }
})
