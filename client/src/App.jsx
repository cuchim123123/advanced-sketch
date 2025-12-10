import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'
import JoinRoom from './pages/JoinRoom'
import Profile from './pages/Profile'

function PrivateRoute({ children }) {
  const token = useAuthStore((state) => state.token)
  const isGuest = useAuthStore((state) => state.isGuest)

  // Also check localStorage directly as fallback during hydration
  const localToken = localStorage.getItem('authToken')
  
  // Allow access if user has token OR is a guest OR has authToken in localStorage
  const isAuthenticated = token || isGuest || localToken
  return isAuthenticated ? children : <Navigate to="/login" replace />
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
