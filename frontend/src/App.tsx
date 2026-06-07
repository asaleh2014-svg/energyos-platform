import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,        element: <Dashboard /> },
      { path: 'analytics',  element: <Analytics /> },
      { path: 'forecast',   element: <Forecast /> },
      { path: 'connections',element: <Connections /> },
      { path: 'sites',      element: <Sites /> },
      { path: 'meters',     element: <Meters /> },
      { path: 'emissions',  element: <Emissions /> },
      { path: 'budget',     element: <Budget /> },
      { path: 'ai',         element: <AIAuditor /> },
      { path: 'reports',    element: <Reports /> },
      { path: 'invoices',   element: <Invoices /> },
      { path: 'settings',   element: <Settings /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
