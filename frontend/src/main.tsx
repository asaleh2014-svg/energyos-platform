import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import { Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Portfolio from '@/pages/Portfolio'
import Analytics from '@/pages/Analytics'
import MarketInsight from '@/pages/MarketInsight'
import Connections from '@/pages/Connections'
import Sites from '@/pages/Sites'
import SiteDetail from '@/pages/SiteDetail'
import Buildings from '@/pages/Buildings'
import Meters from '@/pages/Meters'
import AIAuditor from '@/pages/AIAuditor'
import Reports from '@/pages/Reports'
import Invoices from '@/pages/Invoices'
import Settings from '@/pages/Settings'
import Emissions from '@/pages/Emissions'
import CO2Forecast from '@/pages/CO2Forecast'
import Budget from '@/pages/Budget'
import Financials from '@/pages/Financials'
import './index.css'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  { path: '/login',  element: <Login /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/',                element: <Dashboard /> },
          { path: '/portfolio',       element: <Portfolio /> },
          { path: '/analytics',       element: <Analytics /> },
          { path: '/market-insight',  element: <MarketInsight /> },
          { path: '/connections',     element: <Connections /> },
          { path: '/sites',           element: <Sites /> },
          { path: '/sites/:siteId',   element: <SiteDetail /> },
          { path: '/buildings',       element: <Buildings /> },
          { path: '/buildings/:id',   element: <Buildings /> },
          { path: '/meters',          element: <Meters /> },
          { path: '/emissions',       element: <Emissions /> },
          { path: '/co2-forecast',    element: <CO2Forecast /> },
          { path: '/budget',          element: <Budget /> },
          { path: '/financials',      element: <Financials /> },
          { path: '/ai',              element: <AIAuditor /> },
          { path: '/reports',         element: <Reports /> },
          { path: '/invoices',        element: <Invoices /> },
          { path: '/settings',        element: <Settings /> },
          { path: '*',                element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: '/signup', element: <Navigate to="/login" replace /> },
  { path: '*',       element: <Navigate to="/login" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
