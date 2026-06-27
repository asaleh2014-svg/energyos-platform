import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { useIsAdmin, useAuth } from '@/lib/auth'
import { ShieldCheck, Plus, Eye, Users, Building2, Loader2, X, Mail, Check } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  currency: string
  created_at: string
}

export default function Admin() {
  const navigate = useNavigate()
  const { setAdminTenant } = useAppStore()
  const isAdmin = useIsAdmin()
  const { loading: authLoading } = useAuth()

  const [tenants, setTenants]         = useState<Tenant[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [showInvite, setShowInvite]   = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [inviteSent, setInviteSent]   = useState(false)

  const [newName, setNewName]         = useState('')
  const [newSlug, setNewSlug]         = useState('')
  const [newPlan, setNewPlan]         = useState('starter')
  const [newCurrency, setNewCurrency] = useState('AED')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (isAdmin) loadTenants()
  }, [authLoading, isAdmin])

  // Show spinner while auth is still loading
  async function loadTenants() {
    setLoading(true)
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug, plan, currency, created_at')
      .order('created_at', { ascending: false })
    setTenants((data ?? []) as Tenant[])
    setLoading(false)
  }

  async function createTenant() {
    if (!newName.trim() || !newSlug.trim()) return
    setSaving(true)
    const { error } = await supabase.from('tenants').insert({
      id: crypto.randomUUID(),
      name: newName.trim(),
      slug: newSlug.trim(),
      plan: newPlan,
      currency: newCurrency,
    })
    setSaving(false)
    if (!error) {
      setShowCreate(false)
      setNewName(''); setNewSlug('')
      loadTenants()
    } else {
      alert('Error: ' + error.message)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !showInvite) return
    setSaving(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { tenant_id: showInvite },
      },
    })
    setSaving(false)
    if (!error) {
      setInviteSent(true)
      setTimeout(() => { setShowInvite(null); setInviteEmail(''); setInviteSent(false) }, 2000)
    } else {
      alert('Error: ' + error.message)
    }
  }

  function switchToTenant(tenant: Tenant) {
    setAdminTenant(tenant.id, tenant.name)
    navigate('/')
  }

  const slugify = (v: string) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  if (authLoading || !isAdmin) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/30" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
            <p className="text-xs text-white/40">Manage tenants and users</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
            <Plus size={14} /> New Tenant
          </button>
        </div>

        {/* Tenants list */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
            <Building2 size={14} className="text-white/40" />
            <span className="text-sm font-medium text-white/70">All Tenants</span>
            <span className="ml-auto text-xs text-white/30">{tenants.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-white/30" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No tenants yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-3 text-xs text-white/40 font-medium">Company</th>
                  <th className="text-left px-5 py-3 text-xs text-white/40 font-medium">Plan</th>
                  <th className="text-left px-5 py-3 text-xs text-white/40 font-medium">Currency</th>
                  <th className="text-left px-5 py-3 text-xs text-white/40 font-medium">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="border-b border-border-subtle/50 hover:bg-bg-card/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{t.name}</span>
                        {t.id === 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Demo</span>
                        )}
                      </div>
                      <div className="text-xs text-white/30">{t.slug}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent capitalize">{t.plan}</span>
                    </td>
                    <td className="px-5 py-3 text-white/60 text-xs">{t.currency}</td>
                    <td className="px-5 py-3 text-white/40 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => { setShowInvite(t.id); setInviteEmail('') }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-white/50 hover:text-white hover:border-white/30 transition-all text-xs">
                          <Users size={11} /> Invite User
                        </button>
                        <button
                          onClick={() => switchToTenant(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-medium">
                          <Eye size={11} /> View as Customer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Create New Tenant</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Company Name</label>
                <input
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)) }}
                  placeholder="Acme Energy Ltd"
                  className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Slug</label>
                <input
                  value={newSlug}
                  onChange={e => setNewSlug(slugify(e.target.value))}
                  placeholder="acme-energy"
                  className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/50 mb-1 block">Plan</label>
                  <select value={newPlan} onChange={e => setNewPlan(e.target.value)}
                    className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent">
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-white/50 mb-1 block">Currency</label>
                  <select value={newCurrency} onChange={e => setNewCurrency(e.target.value)}
                    className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent">
                    <option value="AED">AED</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="SAR">SAR</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-xl border border-border-subtle text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
              <button onClick={createTenant} disabled={saving || !newName.trim()}
                className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Invite User</h2>
              <button onClick={() => setShowInvite(null)} className="text-white/30 hover:text-white"><X size={16} /></button>
            </div>
            {inviteSent ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check size={20} className="text-green-400" />
                </div>
                <p className="text-sm text-white/70">Invite sent to <span className="text-white font-medium">{inviteEmail}</span></p>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/40 mb-4">They'll receive a magic link to set their password and access this tenant's dashboard.</p>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Customer Email</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="customer@company.com" type="email"
                    className="w-full bg-bg-primary border border-border-subtle rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setShowInvite(null)} className="flex-1 py-2 rounded-xl border border-border-subtle text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
                  <button onClick={sendInvite} disabled={saving || !inviteEmail.trim()}
                    className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    Send Invite
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
