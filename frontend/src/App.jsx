import { useState, useEffect, useCallback } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import IngestHub from './components/IngestHub'
import Timeline from './components/Timeline'
import KnowledgeGraph from './components/KnowledgeGraph'
import SearchBar from './components/SearchBar'
import Config from './components/Config'
import { API_URL } from './api'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',        icon: 'fa-chart-line' },
  { key: 'ingestion', label: 'Ingest Hub',        icon: 'fa-cloud-arrow-up' },
  { key: 'timeline',  label: 'Journey Timeline',  icon: 'fa-timeline' },
  { key: 'graph',     label: 'Knowledge Graph',   icon: 'fa-circle-nodes' },
  { key: 'search',    label: 'Smart Retrieval',   icon: 'fa-magnifying-glass' },
  { key: 'config',    label: 'AI Settings',       icon: 'fa-sliders' },
]

const CAT_ICONS = {
  Resume:         { icon: 'fa-file-user',      color: 'var(--accent-cyan)' },
  Certificate:    { icon: 'fa-certificate',    color: 'var(--accent-gold)' },
  Certifications: { icon: 'fa-certificate',    color: 'var(--accent-gold)' },
  Internship:     { icon: 'fa-briefcase',      color: '#b47cff' },
  Internships:    { icon: 'fa-briefcase',      color: '#b47cff' },
  Project:        { icon: 'fa-code',           color: 'var(--accent-success)' },
  Projects:       { icon: 'fa-code',           color: 'var(--accent-success)' },
  Achievement:    { icon: 'fa-trophy',         color: 'var(--accent-magenta)' },
  Achievements:   { icon: 'fa-trophy',         color: 'var(--accent-magenta)' },
  Academic:       { icon: 'fa-graduation-cap', color: '#ff8c40' },
  Academics:      { icon: 'fa-graduation-cap', color: '#ff8c40' },
}

function DocPreviewModal({ doc, onClose }) {
  if (!doc) return null
  const meta = CAT_ICONS[doc.category] || { icon: 'fa-file', color: 'var(--accent-cyan)' }
  const catCls = `cat-${(doc.category || '').toLowerCase()}`

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-header-left">
            <i className={`fas ${meta.icon} modal-header-icon`} style={{ color: meta.color }} />
            <div>
              <div className="modal-title">{doc.filename || doc.title}</div>
              <div className="modal-subtitle">
                <span className={`cat-badge ${catCls}`} style={{ marginRight: 8 }}>{doc.category}</span>
                {doc.year && <span style={{ color: 'var(--text-muted)' }}>· {doc.year}</span>}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        {doc.file_path && (
          <div className="modal-actions-bar">
            <a className="btn-doc-action open" href={doc.file_path} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-external-link-alt" /> Open Original File
            </a>
            <a className="btn-doc-action view" href={doc.file_path} download={doc.filename}>
              <i className="fas fa-download" /> Download
            </a>
          </div>
        )}

        <div className="modal-body">
          <div className="modal-meta-row">
            <span className="modal-meta-item">
              <i className="fas fa-calendar-alt" style={{ color: 'var(--accent-cyan)' }} /> Year: {doc.year || 'Unknown'}
            </span>
            <span className="modal-meta-item">
              <i className="fas fa-tags" style={{ color: '#b47cff' }} /> {(doc.skills || []).length} Skills
            </span>
            {doc.file_path
              ? <span className="modal-meta-item" style={{ color: 'var(--accent-success)' }}><i className="fas fa-check-circle" /> File Stored</span>
              : <span className="modal-meta-item"><i className="fas fa-keyboard" /> Text Only</span>}
          </div>

          {doc.summary && (
            <>
              <div className="modal-section-label">Summary</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{doc.summary}</p>
            </>
          )}

          {(doc.skills || []).length > 0 && (
            <>
              <div className="modal-section-label">Skills Detected</div>
              <div className="modal-skills-row" style={{ marginBottom: 20 }}>
                {doc.skills.map(s => <span key={s} className="skill-chip">{s}</span>)}
              </div>
            </>
          )}

          <div className="modal-section-label">Extracted Text Content</div>
          {doc.extracted_text?.trim()
            ? <div className="modal-text-content">{doc.extracted_text}</div>
            : <div className="modal-empty-text">
                <i className="fas fa-file-slash" style={{ display: 'block', fontSize: 28, marginBottom: 10 }} />
                No extracted text available.
              </div>
          }
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('mv_auth') === '1')
  const [view, setView] = useState('dashboard')
  const [documents, setDocuments] = useState([])
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('mv_gemini_key') || '')
  const [toast, setToast] = useState(null)
  const [activeDocView, setActiveDocView] = useState(null)

  const [token, setToken] = useState(() => sessionStorage.getItem('mv_auth_token') || '')
  const [username, setUsername] = useState(() => sessionStorage.getItem('mv_username') || '')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchDocs = useCallback(async () => {
    try {
      const headers = {}
      const curToken = sessionStorage.getItem('mv_auth_token')
      if (curToken) headers['Authorization'] = `Bearer ${curToken}`
      const res = await fetch(`${API_URL}/api/documents`, { headers })
      const data = await res.json()
      setDocuments(Array.isArray(data) ? data : [])
    } catch { /* server not reachable */ }
  }, [])

  useEffect(() => { if (authed) fetchDocs() }, [authed, fetchDocs])

  const handleLogin = (userToken, uname) => {
    sessionStorage.setItem('mv_auth', '1')
    if (userToken) sessionStorage.setItem('mv_auth_token', userToken)
    if (uname) sessionStorage.setItem('mv_username', uname)
    setToken(userToken || '')
    setUsername(uname || '')
    setAuthed(true)
  }
  
  const handleLogout = () => {
    sessionStorage.removeItem('mv_auth')
    sessionStorage.removeItem('mv_auth_token')
    sessionStorage.removeItem('mv_username')
    setToken('')
    setUsername('')
    setAuthed(false)
  }

  const handleDocumentAdded = (doc) => {
    if (!doc) return
    setDocuments(prev => {
      const exists = prev.some(d => d.id === doc.id)
      if (exists) {
        return prev.map(d => d.id === doc.id ? doc : d)
      }
      return [...prev, doc]
    })
    showToast(`"${doc.filename || doc.title || 'Document'}" stored in MemoryVerse`)
  }

  const handleDeleteDoc = async (id) => {
    try {
      const headers = {}
      const curToken = sessionStorage.getItem('mv_auth_token')
      if (curToken) headers['Authorization'] = `Bearer ${curToken}`
      await fetch(`${API_URL}/api/documents/${id}`, { method: 'DELETE', headers })
      setDocuments(prev => prev.filter(d => d.id !== id))
      showToast('Document removed', 'success')
    } catch { showToast('Failed to delete', 'error') }
  }

  const handleGeminiKeyChange = (val) => {
    setGeminiKey(val)
    localStorage.setItem('mv_gemini_key', val)
  }

  const handleReset = async () => {
    try {
      const headers = {}
      const curToken = sessionStorage.getItem('mv_auth_token')
      if (curToken) headers['Authorization'] = `Bearer ${curToken}`
      for (const d of documents) {
        await fetch(`${API_URL}/api/documents/${d.id}`, { method: 'DELETE', headers })
      }
      setDocuments([])
      showToast('System reset — all records cleared', 'success')
    } catch { showToast('Reset failed', 'error') }
  }

  if (!authed) return <Auth onLogin={handleLogin} />

  const allSkills = [...new Set(documents.flatMap(d => d.skills || []))]

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon"><i className="fa-solid fa-brain" /></span>
            <span className="logo-text">MemoryVerse <span className="logo-highlight">AI</span></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`nav-item${view === item.key ? ' active' : ''}`}
              onClick={() => setView(item.key)}
            >
              <i className={`fa-solid ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar">AK</div>
            <div className="user-info">
              <div className="user-name">S Arasu Kumar</div>
              <div className="user-role">Applied AI Explorer</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Lock Identity">
              <i className="fa-solid fa-lock" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="app-header">
          <div className="header-search">
            <div className="search-box-trigger" onClick={() => setView('search')}>
              <i className="fa-solid fa-magnifying-glass" />
              <span>Ask MemoryVerse AI... "show my python skills"</span>
            </div>
          </div>
          <div className="header-actions">
            <div className="api-status-indicator">
              <span className="status-dot" />
              <span className="status-text">{geminiKey.length > 10 ? 'Gemini AI Active' : 'Client-Side AI Active'}</span>
            </div>
            <button className="action-btn upload-trigger-btn" onClick={() => setView('ingestion')}>
              <i className="fa-solid fa-plus" /> Ingest Document
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className={`tab-pane${view === 'dashboard' ? ' active' : ''}`} id="tab-dashboard">
          <Dashboard
            documents={documents}
            onDelete={handleDeleteDoc}
            onNavigate={setView}
            onViewDoc={setActiveDocView}
          />
        </div>
        <div className={`tab-pane${view === 'ingestion' ? ' active' : ''}`} id="tab-ingestion">
          <IngestHub
            geminiKey={geminiKey}
            onDocumentAdded={handleDocumentAdded}
            onViewDoc={setActiveDocView}
            documents={documents}
            onDelete={handleDeleteDoc}
          />
        </div>
        <div className={`tab-pane${view === 'timeline' ? ' active' : ''}`} id="tab-timeline">
          <Timeline documents={documents} onViewDoc={setActiveDocView} />
        </div>
        <div className={`tab-pane${view === 'graph' ? ' active' : ''}`} id="tab-graph">
          <KnowledgeGraph documents={documents} />
        </div>
        <div className={`tab-pane${view === 'search' ? ' active' : ''}`} id="tab-search">
          <SearchBar geminiKey={geminiKey} onViewDoc={setActiveDocView} />
        </div>
        <div className={`tab-pane${view === 'config' ? ' active' : ''}`} id="tab-config">
          <Config
            geminiKey={geminiKey}
            onGeminiKeyChange={handleGeminiKeyChange}
            onReset={handleReset}
          />
        </div>
      </main>

      {/* Doc Preview Modal */}
      {activeDocView && (
        <DocPreviewModal doc={activeDocView} onClose={() => setActiveDocView(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
