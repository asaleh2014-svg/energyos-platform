import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

export type InvoiceRow = {
  id: string
  nus_ref: string | null
  supplier: string | null
  doc_type: string | null
  tax_date: string | null
  payment_due: string | null
  customer_account: string | null
  amount_ex_vat: number | null
  vat_amount: number | null
  amount_inc_vat: number | null
  currency: string
  status: 'Pending' | 'Approved' | 'Paid' | 'Anomaly'
  file_path: string | null
  file_name: string | null
  notes: string | null
  site_id: string | null
  connection_id: string | null
  created_at: string
}
