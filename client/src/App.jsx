import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import { Toaster } from 'sonner'
import { useEffect, useState, Suspense, lazy } from 'react'

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

function PrivateRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const isGuest = useAuthStore((state) => state.isGuest)
  const user = useAuthStore((state) => state.user)

  // Debug log
  console.log('PrivateRoute check:', { token, isGuest, hasUser: !!user })
  
  // Allow access if user has token OR is a guest OR has user object
  if (token || isGuest || user) {
    console.log('PrivateRoute: ALLOWING ACCESS')
    return <>{children}</>
  }
  
  console.log('PrivateRoute: REDIRECTING TO LOGIN')
  return <Navigate to="/login" replace />
}

// Redirect logged-in users away from auth pages
function PublicRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  // If user is logged in, redirect to dashboard
  if (token && user) {
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

    return () => {
      unsubFinishHydration()
    }
  }, [])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/join/:code" element={<JoinRoom />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/room/:code"
            element={
              <PrivateRoute>
                <Room />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Toaster richColors position="top-center" />
        <HydratedApp />
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
