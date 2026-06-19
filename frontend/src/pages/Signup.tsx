import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

const CURRENCIES = ['AED', 'EUR', 'GBP', 'SAR', 'USD']

export default function Signup() {
  const navigate = useNavigate()
  const [step,     setStep]     = useState<1 | 2>(1)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Step 1 — company
  const [company,  setCompany]  = useState('')
  const [currency, setCurrency] = useState('AED')

  // Step 2 — user
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setError('')
    setLoading(true)

    try {
      // 1. Get or create auth user
      let userId: string

      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })

      if (authErr?.message?.toLowerCase().includes('already registered')) {
        // User exists — sign them in instead
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr || !signInData.user) throw new Error('This email is already registered. Enter the correct password to continue.')
        userId = signInData.user.id
      } else if (authErr || !authData.user) {
        throw new Error(authErr?.message ?? 'Signup failed')
      } else {
        userId = authData.user.id
      }

      // 2. Check if already linked to a tenant
      const { data: existing } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .single()
      if (existing) { navigate('/'); return }

      // 3. Create tenant row
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: company, slug: slugify(company), currency })
        .select()
        .single()
      if (tenantErr || !tenant) throw new Error(tenantErr?.message ?? 'Could not create company')

      // 4. Link user to tenant as Admin
      const { error: tuErr } = await supabase
        .from('tenant_users')
        .insert({ tenant_id: tenant.id, user_id: userId, full_name: fullName, role: 'Admin' })
      if (tuErr) throw new Error(tuErr.message)

      navigate('/')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">EnergyOS</span>
        </div>

        <div className="card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-accent' : 'bg-bg-hover'}`} />
            ))}
          </div>

          <h1 className="text-lg font-semibold text-white mb-1">
            {step === 1 ? 'Company details' : 'Your account'}
          </h1>
          <p className="text-xs text-white/40 mb-6">
            {step === 1 ? 'Step 1 of 2 — tell us about your company' : 'Step 2 of 2 — create your admin account'}
          </p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="label mb-1.5 block">Company name</label>
                  <input className="form-input w-full" placeholder="Masdar City Group" value={company}
                    onChange={e => setCompany(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label mb-1.5 block">Default currency</label>
                  <select className="form-select w-full" value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label mb-1.5 block">Your name</label>
                  <input className="form-input w-full" placeholder="Ahmad Al Saleh" value={fullName}
                    onChange={e => setFullName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label mb-1.5 block">Email</label>
                  <input type="email" className="form-input w-full" placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label mb-1.5 block">Password</label>
                  <input type="password" className="form-input w-full" placeholder="Min. 8 characters" value={password}
                    onChange={e => setPassword(e.target.value)} minLength={8} required />
                </div>
              </>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-1">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-border-subtle text-white/50 hover:text-white hover:border-border-default transition-all">
                  Back
                </button>
              )}
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {loading ? 'Creating account…' : step === 1 ? 'Continue →' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
