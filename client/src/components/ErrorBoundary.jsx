import { Component } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home, WifiOff, ServerCrash, FileQuestion, ShieldX, Bug } from 'lucide-react'

// Error type configurations
const errorConfigs = {
  404: {
    icon: FileQuestion,
    title: 'Page Not Found',
    description: "Oops! The page you're looking for seems to have wandered off.",
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500'
  },
  401: {
    icon: ShieldX,
    title: 'Unauthorized',
    description: "You don't have permission to access this page.",
    gradient: 'from-red-500 to-rose-500',
    bgGradient: 'from-red-500/10 to-rose-500/10',
    iconBg: 'bg-gradient-to-br from-red-400 to-rose-500'
  },
  403: {
    icon: ShieldX,
    title: 'Access Denied',
    description: "You don't have the required permissions for this resource.",
    gradient: 'from-red-500 to-pink-500',
    bgGradient: 'from-red-500/10 to-pink-500/10',
    iconBg: 'bg-gradient-to-br from-red-400 to-pink-500'
  },
  500: {
    icon: ServerCrash,
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-500/10 to-indigo-500/10',
    iconBg: 'bg-gradient-to-br from-purple-400 to-indigo-500'
  },
  network: {
    icon: WifiOff,
    title: 'Connection Lost',
    description: "Can't reach the server. Check your internet connection.",
    gradient: 'from-slate-500 to-zinc-500',
    bgGradient: 'from-slate-500/10 to-zinc-500/10',
    iconBg: 'bg-gradient-to-br from-slate-400 to-zinc-500'
  },
  default: {
    icon: Bug,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    gradient: 'from-rose-500 to-red-500',
    bgGradient: 'from-rose-500/10 to-red-500/10',
    iconBg: 'bg-gradient-to-br from-rose-400 to-red-500'
  }
}

function getErrorConfig(error) {
  if (isRouteErrorResponse(error)) {
    return errorConfigs[error.status] || errorConfigs.default
  }
  
  // Check for network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Network')) {
    return errorConfigs.network
  }
  
  return errorConfigs.default
}

// Animated background shapes
function FloatingShapes({ gradient }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${gradient} rounded-full opacity-20 blur-3xl animate-pulse`} />
      <div className={`absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br ${gradient} rounded-full opacity-15 blur-3xl animate-pulse delay-1000`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br ${gradient} rounded-full opacity-5 blur-3xl`} />
    </div>
  )
}

// Error display component
function ErrorDisplay({ error, reset }) {
  const navigate = useNavigate()
  const config = getErrorConfig(error)
  const IconComponent = config.icon
  
  const statusCode = isRouteErrorResponse(error) ? error.status : null
  const errorMessage = isRouteErrorResponse(error) 
    ? error.statusText 
    : error?.message || 'Unknown error'

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative`}>
      <FloatingShapes gradient={config.gradient} />
      
      <div className="relative z-10 max-w-lg w-full">
        {/* Glass card */}
        <div className={`bg-gradient-to-br ${config.bgGradient} backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl`}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`${config.iconBg} p-5 rounded-2xl shadow-lg shadow-black/20`}>
              <IconComponent className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
          </div>
          
          {/* Status code badge */}
          {statusCode && (
            <div className="flex justify-center mb-4">
              <span className={`px-4 py-1.5 rounded-full text-sm font-mono font-bold bg-gradient-to-r ${config.gradient} text-white shadow-lg`}>
                Error {statusCode}
              </span>
            </div>
          )}
          
          {/* Title */}
          <h1 className={`text-3xl font-bold text-center mb-3 bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {config.title}
          </h1>
          
          {/* Description */}
          <p className="text-slate-400 text-center mb-6 leading-relaxed">
            {config.description}
          </p>
          
          {/* Error details (collapsible in production) */}
          {import.meta.env.DEV && errorMessage && (
            <details className="mb-6 group">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400 transition-colors flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-auto">
                <code className="text-xs text-red-400 font-mono break-all">
                  {errorMessage}
                </code>
              </div>
            </details>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>
        </div>
        
        {/* Help text */}
        <p className="text-center text-slate-600 text-sm mt-6">
          If this keeps happening, please contact support
        </p>
      </div>
    </div>
  )
}

// Route error boundary (for react-router errors)
export function RouteErrorBoundary() {
  const error = useRouteError()
  console.error('Route Error:', error)
  
  return <ErrorDisplay error={error} />
}

// Class component error boundary (for React component errors)
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          reset={() => this.setState({ hasError: false, error: null })} 
        />
      )
    }

    return this.props.children
  }
}

// Functional error fallback (for use outside router context)
export function ErrorFallback({ error, reset }) {
  const config = getErrorConfig(error)
  const IconComponent = config.icon
  const errorMessage = error?.message || 'Unknown error'

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative`}>
      <FloatingShapes gradient={config.gradient} />
      
      <div className="relative z-10 max-w-lg w-full">
        <div className={`bg-gradient-to-br ${config.bgGradient} backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl`}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`${config.iconBg} p-5 rounded-2xl shadow-lg shadow-black/20`}>
              <IconComponent className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
          </div>
          
          {/* Title */}
          <h1 className={`text-3xl font-bold text-center mb-3 bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {config.title}
          </h1>
          
          {/* Description */}
          <p className="text-slate-400 text-center mb-6 leading-relaxed">
            {config.description}
          </p>
          
          {/* Error details */}
          {import.meta.env.DEV && errorMessage && (
            <details className="mb-6 group">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400 transition-colors flex items-center gap-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Technical Details
              </summary>
              <div className="mt-3 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-auto">
                <code className="text-xs text-red-400 font-mono break-all">
                  {errorMessage}
                </code>
              </div>
            </details>
          )}
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            {reset && (
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20"
              >
                <Home className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </div>
        
        <p className="text-center text-slate-600 text-sm mt-6">
          If this keeps happening, please contact support
        </p>
      </div>
    </div>
  )
}

export default ErrorBoundary
