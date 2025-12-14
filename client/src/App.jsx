import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'sonner'
import { useEffect, useState, Suspense, lazy, useMemo } from 'react'
import { api } from './services'

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Auth/Login'))
const Signup = lazy(() => import('./pages/Auth/Signup'))
const VerifyEmail = lazy(() => import('./pages/Auth/Verify/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/Auth/Password/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/Auth/Password/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const Room = lazy(() => import('./pages/Room/Room'))
const JoinRoom = lazy(() => import('./pages/Room/JoinRoom'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const AdminPanel = lazy(() => import('./pages/Admin'))
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'))
const AdminUsers = lazy(() => import('./pages/Admin/Users'))
const AdminRooms = lazy(() => import('./pages/Admin/Rooms'))
const AdminSettings = lazy(() => import('./pages/Admin/Settings'))

// Loader for Room page - fetches room data before render
async function roomLoader({ params }) {
  try {
    const { data } = await api.get(`/rooms/${params.code}`)
    return { room: data.data.room }
  } catch (error) {
    throw new Response('Room not found', { status: 404 })
  }
}

// Loading spinner component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}

// Redirect logged-in users away from auth pages
function PublicRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (token && user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Private route guard component
function PrivateRouteGuard({ children }) {
  const token = useAuthStore((state) => state.token)
  const isGuest = useAuthStore((state) => state.isGuest)
  const user = useAuthStore((state) => state.user)

  if (token || isGuest || user) {
    return <>{children}</>
  }
  
  return <Navigate to="/login" replace />
}

// Admin route guard component
function AdminRouteGuard({ children }) {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Wrapper to wait for hydration before rendering routes
function HydratedApp() {
  const [hasHydrated, setHasHydrated] = useState(useAuthStore.persist.hasHydrated())

  useEffect(() => {
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true)
    })
    return () => unsubFinishHydration()
  }, [])

  // Create router with loaders - memoized to prevent recreation
  const router = useMemo(() => createBrowserRouter([
    {
      path: '/',
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/login',
          element: <Suspense fallback={<PageLoader />}><PublicRoute><Login /></PublicRoute></Suspense>
        },
        {
          // Support both /register and /signup for user convenience
          path: '/register',
          element: <Suspense fallback={<PageLoader />}><PublicRoute><Signup /></PublicRoute></Suspense>
        },
        {
          path: '/verify-email',
          element: <Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>
        },
        {
          path: '/forgot-password',
          element: <Suspense fallback={<PageLoader />}><PublicRoute><ForgotPassword /></PublicRoute></Suspense>
        },
        {
          path: '/reset-password',
          element: <Suspense fallback={<PageLoader />}><PublicRoute><ResetPassword /></PublicRoute></Suspense>
        },
        {
          path: '/join/:code',
          element: <Suspense fallback={<PageLoader />}><JoinRoom /></Suspense>
        },
        {
          path: '/dashboard',
          element: <Suspense fallback={<PageLoader />}><PrivateRouteGuard><Dashboard /></PrivateRouteGuard></Suspense>
        },
        {
          path: '/room/:code',
          loader: roomLoader,
          errorElement: <RouteErrorBoundary />,
          element: <Suspense fallback={<PageLoader />}><PrivateRouteGuard><Room /></PrivateRouteGuard></Suspense>
        },
        {
          path: '/profile',
          element: <Suspense fallback={<PageLoader />}><PrivateRouteGuard><Profile /></PrivateRouteGuard></Suspense>
        },
        {
          path: '/admin',
          element: <Suspense fallback={<PageLoader />}><AdminRouteGuard><AdminPanel /></AdminRouteGuard></Suspense>,
          children: [
            {
              index: true,
              element: <AdminDashboard />
            },
            {
              path: 'users',
              element: <AdminUsers />
            },
            {
              path: 'rooms',
              element: <AdminRooms />
            },
            {
              path: 'settings',
              element: <AdminSettings />
            }
          ]
        },
        {
          index: true,
          element: <Navigate to="/dashboard" replace />
        }
      ]
    },
    {
      path: '*',
      element: <RouteErrorBoundary />
    }
  ], {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_skipActionErrorRevalidation: true
    }
  }), [])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <Toaster richColors position="top-center" />
          <HydratedApp />
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
