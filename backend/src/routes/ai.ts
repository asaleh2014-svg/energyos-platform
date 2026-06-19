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
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: { role: 'user', parts: [{ text: SYSTEM_PROMPT(market, context) }] },
      })
      // Gemini history must alternate user/model and start with user
      const rawHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      // Drop leading model turns so history always starts with user
      while (rawHistory.length > 0 && rawHistory[0].role === 'model') rawHistory.shift()
      const chat = model.startChat({ history: rawHistory })
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

// ── Per-invoice anomaly detection ───────────────────────────────────────────
aiRouter.post('/analyze-invoice', async (req, res) => {
  const { invoice, market = 'UAE', provider = 'claude' } = req.body
  if (!invoice) return res.status(400).json({ error: 'No invoice data provided' })

  const prompt = `You are an energy invoice auditor. Analyze this utility invoice and return ONLY valid JSON (no markdown):
{
  "status": "Approved" | "Anomaly" | "Pending",
  "confidence": 0-100,
  "findings": ["finding 1", "finding 2"],
  "anomaly_reason": "brief reason if status is Anomaly, else null",
  "recommendations": ["action 1", "action 2"]
}

Invoice data:
${JSON.stringify(invoice, null, 2)}

Market context: ${market}

Check for:
- Unusual amounts vs typical ${market} utility rates
- Missing required fields (supplier, dates, amounts)
- Suspicious VAT rates (UAE: 5%, NL: 21%, UK: 20%)
- Date inconsistencies (tax date after payment due)
- Round-number amounts that look like estimates
- Missing meter/account references`

  try {
    let reply = ''
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const result = await model.generateContent(prompt)
      reply = result.response.text().trim()
    } else {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      reply = (response.content[0] as { type: string; text: string }).text
    }
    const clean = reply.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    res.json({ success: true, analysis: JSON.parse(clean) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: 'Analysis failed', detail: msg })
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
