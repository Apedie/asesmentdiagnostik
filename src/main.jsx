import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', background: '#fff0f0', color: '#b3261e', fontFamily: 'monospace', borderRadius: '12px', margin: '20px', border: '1px solid #f5c6c2' }}>
          <h2 style={{ marginBottom: '10px' }}>Oops, terjadi kesalahan rendering sistem! ⚠️</h2>
          <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{this.state.error?.toString()}</p>
          <p style={{ fontSize: '0.85rem', color: '#52606d', marginTop: '10px' }}>Silakan segarkan halaman atau laporkan kesalahan ini.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '15px', padding: '10px 20px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Muat Ulang Halaman 🔄
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

