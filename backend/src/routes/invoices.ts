import { Router } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const invoicesRouter = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

invoicesRouter.get('/', async (_req, res) => {
  res.json({ data: [], message: 'Use Supabase client directly from frontend' })
})

invoicesRouter.post('/verify', async (req, res) => {
  const { invoice_id } = req.body
  res.json({ invoice_id, verified: true, variance_pct: 0, ai_status: 'verified' })
})

// ── PDF extraction endpoint ──────────────────────────────────────────────────
invoicesRouter.post('/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are an energy invoice data extraction assistant.
Extract the following fields from this utility invoice PDF and return ONLY valid JSON with no markdown:
{
  "supplier": "utility company name",
  "doc_type": "Invoice or Credit Note",
  "invoice_number": "invoice or document number",
  "tax_date": "YYYY-MM-DD or null",
  "payment_due": "YYYY-MM-DD or null",
  "customer_account": "customer or account number",
  "site_address": "full supply address",
  "amount_ex_vat": number or null,
  "vat_amount": number or null,
  "amount_inc_vat": number or null,
  "currency": "AED or USD or EUR or GBP",
  "consumption_kwh": number or null,
  "consumption_m3": number or null,
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "meter_number": "meter or POD number or null",
  "notes": "any anomalies or important notes"
}
If a field is not found, use null. For numbers, return only the numeric value without currency symbols.`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: req.file.mimetype as 'application/pdf',
          data: req.file.buffer.toString('base64'),
        },
      },
    ])

    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const extracted = JSON.parse(clean)

    res.json({ success: true, data: extracted })
  } catch (err: any) {
    console.error('Gemini extraction error:', err.message)
    res.status(500).json({ error: err.message || 'Extraction failed' })
  }
})
