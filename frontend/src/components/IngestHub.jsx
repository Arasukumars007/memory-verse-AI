import { useState, useRef } from 'react'
import { API_URL } from '../api'

const PIPELINE_STEPS = [
  { id: 'step-extract', label: 'OCR & Text Extraction',               icon: 'fa-file-magnifying-glass' },
  { id: 'step-ner',     label: 'Named Entity Classification (NER)',    icon: 'fa-tags' },
  { id: 'step-relation',label: 'Relationship Discovery Engine',        icon: 'fa-circle-nodes' },
  { id: 'step-index',   label: 'Semantic Indexing & Vector Storage',   icon: 'fa-database' },
]

const CAT_META = {
  Resume:         { icon: 'fa-file-user',      color: 'var(--accent-cyan)',     cls: 'cat-resume' },
  Certificate:    { icon: 'fa-certificate',    color: 'var(--accent-gold)',     cls: 'cat-certifications' },
  Certifications: { icon: 'fa-certificate',    color: 'var(--accent-gold)',     cls: 'cat-certifications' },
  Internship:     { icon: 'fa-briefcase',      color: '#b47cff',               cls: 'cat-internships' },
  Internships:    { icon: 'fa-briefcase',      color: '#b47cff',               cls: 'cat-internships' },
  Project:        { icon: 'fa-code',           color: 'var(--accent-success)', cls: 'cat-projects' },
  Projects:       { icon: 'fa-code',           color: 'var(--accent-success)', cls: 'cat-projects' },
  Achievement:    { icon: 'fa-trophy',         color: 'var(--accent-magenta)', cls: 'cat-achievements' },
  Achievements:   { icon: 'fa-trophy',         color: 'var(--accent-magenta)', cls: 'cat-achievements' },
  Academic:       { icon: 'fa-graduation-cap', color: '#ff8c40',              cls: 'cat-academics' },
  Academics:      { icon: 'fa-graduation-cap', color: '#ff8c40',              cls: 'cat-academics' },
}

export default function IngestHub({ geminiKey, onDocumentAdded, onViewDoc, documents, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [queueStatus, setQueueStatus] = useState('Idle')
  const [showModal, setShowModal] = useState(false)
  const [pendingDoc, setPendingDoc] = useState(null)
  const fileInputRef = useRef()

  const [errorMessage, setErrorMessage] = useState('')

  const runPipeline = async (file) => {
    setProcessing(true)
    setQueueStatus('Processing')
    setCurrentStep(0)
    setErrorMessage('')

    const delays = [400, 400, 400, 300]
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setCurrentStep(i)
      await new Promise(r => setTimeout(r, delays[i]))
    }

    // Upload to backend
    const formData = new FormData()
    formData.append('file', file)
    if (geminiKey) formData.append('gemini_key', geminiKey)

    const headers = {}
    if (geminiKey) headers['X-Gemini-Key'] = geminiKey
    const token = sessionStorage.getItem('mv_auth_token')
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Upload failed with status ${res.status}`)
      }
      const rawRes = await res.json()
      const doc = rawRes.document || rawRes
      setCurrentStep(PIPELINE_STEPS.length)
      setQueueStatus('Idle')
      setProcessing(false)

      // Set metadata confirm modal
      const pending = {
        id: doc.id,
        title: doc.filename || file.name,
        filename: doc.filename || file.name,
        category: doc.category || 'Project',
        year: doc.year || new Date().getFullYear(),
        skills: Array.isArray(doc.skills) ? doc.skills.join(', ') : (doc.skills || ''),
        content: doc.extracted_text || '',
        file_path: doc.file_path || null,
        summary: doc.summary || '',
        ...doc,
      }
      setPendingDoc(pending)
      setShowModal(true)
    } catch (err) {
      setQueueStatus('Error')
      setProcessing(false)
      setCurrentStep(-1)
      setErrorMessage(err.message || 'File upload failed. Please check the file and try again.')
      console.error(err)
    }
  }

  const handleFiles = (files) => {
    const file = files[0]
    if (!file) return
    runPipeline(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleMetaSave = async (e) => {
    e.preventDefault()
    if (!pendingDoc) return
    const updatedSkills = document.getElementById('edit-skills').value
      .split(',').map(s => s.trim()).filter(Boolean)
    const payload = {
      title:    document.getElementById('edit-title').value,
      category: document.getElementById('edit-category').value,
      year:     parseInt(document.getElementById('edit-year').value),
      skills:   updatedSkills,
      content:  document.getElementById('edit-content').value,
    }

    if (pendingDoc.id) {
      const token = sessionStorage.getItem('mv_auth_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      try {
        const res = await fetch(`${API_URL}/api/documents/${pendingDoc.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
        const updated = res.ok ? await res.json() : { ...pendingDoc, ...payload, skills: updatedSkills }
        onDocumentAdded(updated)
      } catch {
        onDocumentAdded({ ...pendingDoc, ...payload, skills: updatedSkills })
      }
    } else {
      onDocumentAdded({ ...pendingDoc, ...payload, skills: updatedSkills })
    }

    setShowModal(false)
    setPendingDoc(null)
  }

  const handleAddUrl = async () => {
    const url = document.getElementById('portfolioUrl').value.trim()
    if (!url) return
    setErrorMessage('')
    const token = sessionStorage.getItem('mv_auth_token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (geminiKey) headers['X-Gemini-Key'] = geminiKey

    try {
      const res = await fetch(`${API_URL}/api/documents/url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        const rawRes = await res.json()
        const doc = rawRes.document || rawRes
        onDocumentAdded(doc)
        document.getElementById('portfolioUrl').value = ''
      } else {
        const errData = await res.json().catch(() => ({}))
        setErrorMessage(errData.detail || 'Failed to ingest URL')
      }
    } catch {
      setErrorMessage('Cannot connect to backend server')
    }
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>AI Data Ingestion</h1>
          <p>Upload files or import URLs. Our AI parser parses content, tags years, extracts skills, and registers relationships.</p>
        </div>
      </div>

      <div className="ingest-grid">
        {/* Upload Card */}
        <div className="glass-card upload-card">
          {errorMessage && (
            <div className="auth-error" style={{ marginBottom: 12 }}>
              <i className="fa-solid fa-circle-exclamation" /> {errorMessage}
            </div>
          )}
          <div
            className={`upload-zone${dragging ? ' drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,image/*"
              onChange={e => handleFiles(e.target.files)}
            />
            <i className="fa-solid fa-cloud-arrow-up upload-icon" />
            <h3>Drag & Drop Files Here</h3>
            <p>or click to browse from device</p>
            <span className="file-limits">Supports text, markdown, certificates, or resumes</span>
          </div>

          <div className="url-input-container">
            <div className="url-input-title">Or link an Online Resource</div>
            <div className="url-input-row">
              <i className="fa-solid fa-link" />
              <input
                type="url"
                id="portfolioUrl"
                placeholder="Enter portfolio link or github URL e.g., github.com/arasu"
              />
              <button className="btn btn-primary" onClick={handleAddUrl} style={{ padding: '7px 14px', fontSize: 12 }}>
                Add Link
              </button>
            </div>
          </div>
        </div>

        {/* Processing Card */}
        <div className="glass-card processing-card">
          <div className="card-header">
            <h2>Parser Execution Queue</h2>
            <span className={`queue-status${processing ? ' processing' : ''}`}>{queueStatus}</span>
          </div>

          {processing && (
            <div className="ai-pipeline-visual">
              {PIPELINE_STEPS.map((step, i) => {
                const state = currentStep === i ? 'active' : currentStep > i ? 'done' : ''
                return (
                  <div key={step.id} id={step.id} className={`pipeline-step ${state}`}>
                    <div className="step-bullet">
                      {state === 'done'
                        ? <i className="fa-solid fa-check" />
                        : state === 'active'
                          ? <i className="fa-solid fa-spinner fa-spin" />
                          : i + 1
                      }
                    </div>
                    <div className="step-text">{step.label}</div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="document-list-container">
            <div className="list-title">Ingested Knowledge Items</div>
            <div className="ingested-items-list">
              {documents.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
                  No documents ingested yet.
                </div>
              ) : [...documents].reverse().map(doc => {
                const meta = CAT_META[doc.category] || { icon: 'fa-file', color: 'var(--text-muted)', cls: '' }
                return (
                  <div key={doc.id} className="ingested-item">
                    <i className={`fas ${meta.icon} ingested-item-icon`} style={{ color: meta.color }} />
                    <span className="ingested-item-name">{doc.filename}</span>
                    <span className={`ingested-item-cat cat-badge ${meta.cls}`}>{doc.category}</span>
                    {doc.file_path && (
                      <a
                        className="ingested-item-btn"
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open File"
                      >
                        <i className="fas fa-external-link-alt" />
                      </a>
                    )}
                    <button
                      className="ingested-item-btn"
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      title="View Details"
                    >
                      <i className="fas fa-eye" />
                    </button>
                    <button
                      className="ingested-item-btn"
                      onClick={() => onDelete && onDelete(doc.id)}
                      title="Delete"
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Edit Modal */}
      <div id="metaEditModal" className={`modal${showModal ? ' open' : ''}`}>
        <div className="modal-content glass-card">
          <h2><i className="fa-solid fa-microchip" /> Confirm Extracted Metadata</h2>
          <p className="modal-subtitle">Verify how MemoryVerse AI categorized and linked your document.</p>
          <form id="metaEditForm" onSubmit={handleMetaSave}>
            <input type="hidden" id="edit-doc-id" defaultValue={pendingDoc?.id} />
            <div className="form-group">
              <label htmlFor="edit-title">Document Title</label>
              <input type="text" id="edit-title" defaultValue={pendingDoc?.title || pendingDoc?.filename} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-category">Category</label>
                <select id="edit-category" defaultValue={pendingDoc?.category || 'Projects'}>
                  <option value="Certifications">Certification</option>
                  <option value="Projects">Project</option>
                  <option value="Internships">Internship</option>
                  <option value="Achievements">Achievement</option>
                  <option value="Academics">Academic</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-year">Extracted Year</label>
                <input type="number" id="edit-year" min="2010" max="2035" defaultValue={pendingDoc?.year} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="edit-skills">Associated Skills (comma separated)</label>
              <input type="text" id="edit-skills" defaultValue={pendingDoc?.skills} placeholder="e.g. Python, Machine Learning, UI Design" />
            </div>
            <div className="form-group">
              <label htmlFor="edit-content">Raw Text Content</label>
              <textarea id="edit-content" rows="4" defaultValue={pendingDoc?.content} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save to MemoryVerse</button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
