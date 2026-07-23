import { useState, useRef } from 'react'
import { API_URL } from '../api'

export default function Auth({ onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [error, setError] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Decrypting Memory Nodes...')
  const progressRef = useRef(null)

  const STATUSES = [
    'Decrypting Memory Nodes...',
    'Validating Identity Key...',
    'Loading Knowledge Graph...',
    'Reconstructing Timeline...',
    'Identity Verified!',
  ]

  const runDecryptAnimation = (onComplete) => {
    setDecrypting(true)
    setProgress(0)
    let pct = 0
    let step = 0
    const interval = setInterval(() => {
      pct += Math.random() * 22 + 8
      if (pct > 100) pct = 100
      setProgress(Math.floor(pct))
      const idx = Math.floor((pct / 100) * (STATUSES.length - 1))
      setStatusText(STATUSES[Math.min(idx, STATUSES.length - 1)])
      if (pct >= 100) {
        clearInterval(interval)
        setTimeout(onComplete, 500)
      }
    }, 280)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    const username = document.getElementById('authUsername').value.trim()
    const password = document.getElementById('authPassword').value
    if (!username || !password) { setError('Please fill in all fields.'); return }
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setError('Cannot verify credentials: Server returned invalid content. Please ensure backend is running.')
        return
      }
      const data = await res.json()
      if (res.ok && data.status === 'success' && data.token) {
        runDecryptAnimation(() => onLogin(data.token, username))
      } else if (res.status === 401) {
        setError('Invalid credentials. If you registered before, the server may have restarted and reset accounts — please register again.')
      } else {
        setError(data.detail || 'Invalid username or password.')
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend server is running.')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    const username = document.getElementById('regUsername').value.trim()
    const email = document.getElementById('regEmail').value.trim()
    const password = document.getElementById('regPassword').value
    if (!username || !email || !password) { setError('Please fill in all fields.'); return }
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setError('Registration failed: Server returned invalid content. Please ensure backend is running.')
        return
      }
      const data = await res.json()
      if (res.ok && data.status === 'success') {
        setError('')
        setIsRegisterMode(false)
        setTimeout(() => {
          const el = document.getElementById('authUsername')
          if (el) el.value = username
        }, 100)
      } else {
        setError(data.detail || 'Registration failed.')
      }
    } catch {
      setError('Cannot connect to server.')
    }
  }

  return (
    <div id="authScreen" className="auth-overlay">
      <div className={`auth-container${isRegisterMode ? ' register-mode' : ''}`}>
        <div className="curved-shape" />
        <div className="curved-shape2" />
        <div className="auth-divider" />

        {/* Login Form */}
        <div className="form-box login">
          <h2 className="animation" style={{ '--D': 0, '--S': 21 }}>Login</h2>
          {error && !isRegisterMode && (
            <div className="auth-error"><i className="fa-solid fa-circle-exclamation" />{error}</div>
          )}
          <form onSubmit={handleLogin}>
            <div className="input-box animation" style={{ '--D': 1, '--S': 22 }}>
              <input type="text" id="authUsername" required />
              <label>Username</label>
              <i className="bx bxs-user" />
            </div>
            <div className="input-box animation" style={{ '--D': 2, '--S': 23 }}>
              <input type="password" id="authPassword" required />
              <label>Password</label>
              <i className="bx bxs-lock-alt" />
            </div>
            <div className="input-box animation" style={{ '--D': 3, '--S': 24 }}>
              <button className="btn-auth-submit" type="submit">Unlock Identity</button>
            </div>
            <div className="regi-link animation" style={{ '--D': 4, '--S': 25 }}>
              <p>Don't have an account?{' '}
                <a onClick={() => { setIsRegisterMode(true); setError('') }} className="SignUpLink">Sign Up</a>
              </p>
            </div>
          </form>
        </div>

        {/* Login Info Panel */}
        <div className="info-content login">
          <h2 className="animation" style={{ '--D': 0, '--S': 20 }}>WELCOME BACK!</h2>
          <p className="animation" style={{ '--D': 1, '--S': 21 }}>Decrypt your MemoryVerse digital identity workspace to continue mapping your career accomplishments.</p>
        </div>

        {/* Register Form */}
        <div className="form-box register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 }}>Register</h2>
          {error && isRegisterMode && (
            <div className="auth-error"><i className="fa-solid fa-circle-exclamation" />{error}</div>
          )}
          <form onSubmit={handleRegister}>
            <div className="input-box animation" style={{ '--li': 18, '--S': 1 }}>
              <input type="text" id="regUsername" required />
              <label>Username</label>
              <i className="bx bxs-user" />
            </div>
            <div className="input-box animation" style={{ '--li': 19, '--S': 2 }}>
              <input type="email" id="regEmail" required />
              <label>Email</label>
              <i className="bx bxs-envelope" />
            </div>
            <div className="input-box animation" style={{ '--li': 19, '--S': 3 }}>
              <input type="password" id="regPassword" required />
              <label>Password</label>
              <i className="bx bxs-lock-alt" />
            </div>
            <div className="input-box animation" style={{ '--li': 20, '--S': 4 }}>
              <button className="btn-auth-submit" type="submit">Create Key</button>
            </div>
            <div className="regi-link animation" style={{ '--li': 21, '--S': 5 }}>
              <p>Already have an account?{' '}
                <a onClick={() => { setIsRegisterMode(false); setError('') }} className="SignInLink">Sign In</a>
              </p>
            </div>
          </form>
        </div>

        {/* Register Info Panel */}
        <div className="info-content register">
          <h2 className="animation" style={{ '--li': 17, '--S': 0 }}>WELCOME!</h2>
          <p className="animation" style={{ '--li': 18, '--S': 1 }}>Establish a local credential key to start structuring your learning, certifications, and skills.</p>
        </div>

        {/* Decrypting Overlay */}
        {decrypting && (
          <div className="auth-decrypting-status">
            <div className="decrypt-spinner"><i className="fa-solid fa-spinner fa-spin" /></div>
            <div className="decrypt-text">{statusText}</div>
            <div className="decrypt-progress-bar">
              <div className="decrypt-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
