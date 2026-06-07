import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Analytics from '@/pages/Analytics'
import Forecast from '@/pages/Forecast'
import Connections from '@/pages/Connections'
import Sites from '@/pages/Sites'
import Meters from '@/pages/Meters'
import AIAuditor from '@/pages/AIAuditor'
import Reports from '@/pages/Reports'
import Invoices from '@/pages/Invoices'
import Settings from '@/pages/Settings'
import Emissions from '@/pages/Emissions'
import Budget from '@/pages/Budget'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/analytics"   element={<Analytics />} />
            <Route path="/forecast"    element={<Forecast />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/sites"       element={<Sites />} />
            <Route path="/meters"      element={<Meters />} />
            <Route path="/emissions"   element={<Emissions />} />
            <Route path="/budget"      element={<Budget />} />
            <Route path="/ai"          element={<AIAuditor />} />
            <Route path="/reports"     element={<Reports />} />
            <Route path="/invoices"    element={<Invoices />} />
            <Route path="/settings"    element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
