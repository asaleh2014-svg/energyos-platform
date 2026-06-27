import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Dashboard from '@/pages/Dashboard'
import Analytics from '@/pages/Analytics'
import Forecast from '@/pages/Forecast'
import Connections from '@/pages/Connections'
import Sites from '@/pages/Sites'
import Buildings from '@/pages/Buildings'
import Meters from '@/pages/Meters'
import AIAuditor from '@/pages/AIAuditor'
import Reports from '@/pages/Reports'
import Invoices from '@/pages/Invoices'
import Settings from '@/pages/Settings'
import Emissions from '@/pages/Emissions'
import Budget from '@/pages/Budget'
import Alerts from '@/pages/Alerts'
import Admin from '@/pages/Admin'

const router = createBrowserRouter([
  { path: '/login',  element: <Login /> },
  { path: '/signup', element: <Signup /> },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true,        element: <Dashboard /> },
          { path: 'analytics',  element: <Analytics /> },
          { path: 'forecast',   element: <Forecast /> },
          { path: 'connections',element: <Connections /> },
          { path: 'sites',      element: <Sites /> },
          { path: 'buildings',      element: <Buildings /> },
          { path: 'buildings/:id',  element: <Buildings /> },
          { path: 'meters',     element: <Meters /> },
          { path: 'emissions',  element: <Emissions /> },
          { path: 'budget',     element: <Budget /> },
          { path: 'alerts',     element: <Alerts /> },
          { path: 'ai',         element: <AIAuditor /> },
          { path: 'reports',    element: <Reports /> },
          { path: 'invoices',   element: <Invoices /> },
          { path: 'settings',   element: <Settings /> },
          { path: 'admin',      element: <Admin /> },
        ],
      },
    ],
  },
])

// Expose router for dev/test navigation
;(window as any).__router = router

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
