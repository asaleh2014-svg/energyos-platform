// Run this with: node run-migration.js
// Uses the backend's Supabase service key to execute DDL migration

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://fupvhiphlkekbbiqgbdb.supabase.co'
const SERVICE_KEY = 'sb_publishable_R34PP9tDi495l1rQZxeKdg_zcBj2lq_'

const SQL = fs.readFileSync(
  path.join(__dirname, 'supabase/migration_buildings_and_enriched_connections.sql'),
  'utf8'
)

// Split into individual statements (split on ; followed by newline)
const statements = SQL
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })
  return { status: res.status, body: await res.text() }
}

// Alternative: use the query endpoint
async function runQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'X-Query': sql,
    },
    body: sql,
  })
  return { status: res.status, body: await res.text().catch(() => '') }
}

async function main() {
  console.log('Running migration via Supabase REST API...')
  console.log(`Statements to execute: ${statements.length}`)

  let ok = 0, failed = 0
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i]
    if (!s || s.startsWith('SELECT')) {
      console.log(`[${i+1}] Skipping: ${s.slice(0, 60)}...`)
      continue
    }
    const result = await runSQL(s + ';')
    if (result.status === 200 || result.status === 204) {
      console.log(`[${i+1}] ✓ ${s.slice(0, 60)}...`)
      ok++
    } else {
      console.log(`[${i+1}] ✗ ${result.status} — ${result.body.slice(0, 120)}`)
      console.log(`    SQL: ${s.slice(0, 100)}`)
      failed++
    }
  }

  console.log(`\nDone: ${ok} succeeded, ${failed} failed`)
}

main().catch(console.error)
