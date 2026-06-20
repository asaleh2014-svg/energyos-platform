import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'
import { enterDemo } from '@/lib/demo'

function ResetPasswordForm() {
  const navigate = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setDone(true); setTimeout(() => navigate('/'), 2000) }
  }

  if (done) return (
    <div className="text-center text-sm text-success-light py-4">
      ✓ Password updated — redirecting…
    </div>
  )

  return (
    <form onSubmit={handleReset} className="flex flex-col gap-4">
      <div>
        <label className="label mb-1.5 block">New Password</label>
        <input type="password" className="form-input w-full" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label mb-1.5 block">Confirm Password</label>
        <input type="password" className="form-input w-full" placeholder="••••••••"
          value={confirm} onChange={e => setConfirm(e.target.value)} required />
      </div>
      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 disabled:opacity-50">
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    // Detect password recovery link (hash contains type=recovery)
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setIsRecovery(true)
      // Let Supabase process the tokens from the URL
      supabase.auth.getSession()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      if (event === 'SIGNED_IN' && !window.location.hash.includes('type=recovery')) navigate('/')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/')
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
          {isRecovery ? (
            <>
              <h1 className="text-lg font-semibold text-white mb-1">Set new password</h1>
              <p className="text-xs text-white/40 mb-6">Choose a new password for your account</p>
              <ResetPasswordForm />
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-white mb-1">Sign in</h1>
              <p className="text-xs text-white/40 mb-6">Enter your credentials to access your portfolio</p>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="label mb-1.5 block">Email</label>
                  <input type="email" className="form-input w-full" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="label mb-1.5 block">Password</label>
                  <input type="password" className="form-input w-full" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && (
                  <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 disabled:opacity-50">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-bg-card px-3 text-[11px] text-white/25">or</span>
                </div>
              </div>

              <button
                onClick={enterDemo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-all text-sm font-medium">
                <Zap size={14} />
                Try Live Demo — no sign-up needed
              </button>
            </>
          )}
        </div>

        {!isRecovery && (
          <p className="text-center text-xs text-white/30 mt-5">
            New company?{' '}
            <Link to="/signup" className="text-accent hover:text-accent-hover transition-colors">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
