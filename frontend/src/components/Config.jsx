import { useState } from 'react'

export default function Config({ geminiKey, onGeminiKeyChange, onReset }) {
  const [keyInput, setKeyInput] = useState(geminiKey)
  const [model, setModel] = useState('gemini-1.5-flash')

  const handleSave = () => {
    onGeminiKeyChange(keyInput)
  }

  const handleClear = () => {
    setKeyInput('')
    onGeminiKeyChange('')
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>AI Settings & Integration</h1>
          <p>Customize the parsing settings and upgrade the intelligence layers of your MemoryVerse Digital Identity System.</p>
        </div>
      </div>

      <div className="config-grid">
        {/* Gemini Integration */}
        <div className="glass-card config-card">
          <div className="card-header">
            <h2><i className="fa-brands fa-google" style={{ color: '#4285F4' }} /> Gemini API Key (Optional)</h2>
            <span className="badge badge-indigo">Upgrade</span>
          </div>
          <div className="card-body">
            <p>Unlock <strong>Deep Contextual Processing</strong>. By default, the application runs a powerful heuristic parser client-side. Adding a Gemini API key enables true multi-modal parsing and semantic categorization.</p>

            <div className="form-group">
              <label>Gemini API Key</label>
              <div className="input-with-icon">
                <i className="fa-solid fa-key" />
                <input
                  type="password"
                  placeholder="Enter AIzaSy... key"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Gemini Model Choice</label>
              <select value={model} onChange={e => setModel(e.target.value)}>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Super Fast)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Rich Entity Linking)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSave}>Save API Configuration</button>
              {geminiKey && (
                <button className="btn btn-secondary" onClick={handleClear}>Clear Saved Key</button>
              )}
            </div>
          </div>
        </div>

        {/* Ingestion / Storage Policy */}
        <div className="glass-card config-card">
          <div className="card-header">
            <h2><i className="fa-solid fa-database" style={{ color: 'var(--accent-success)' }} /> Storage & Sandbox Rules</h2>
            <span className="badge badge-success">Local Sandbox</span>
          </div>
          <div className="card-body">
            <p>MemoryVerse AI operates fully within a secure browser environment.</p>
            <ul className="config-feature-list">
              <li><i className="fa-solid fa-shield-halved" /> <strong>100% Privacy</strong>: Original files never leave your device.</li>
              <li><i className="fa-solid fa-hard-drive" /> <strong>LocalStorage</strong>: Parsed schemas and indexes are stored in the browser cache.</li>
              <li><i className="fa-solid fa-trash-can" /> <strong>System Reset</strong>: Wipe the index to start clean.</li>
            </ul>

            <button className="btn btn-danger" onClick={onReset}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} /> Clear Index & Restore Demo
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
