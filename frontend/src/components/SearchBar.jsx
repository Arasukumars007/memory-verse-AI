import { useState } from 'react'
import { API_URL } from '../api'

const SUGGESTIONS = [
  { label: 'All Certificates', query: 'Show all certificates' },
  { label: 'Python Projects', query: 'Python projects' },
  { label: 'All Internships', query: 'Show all internships' },
  { label: 'All Projects',    query: 'Show all projects' },
  { label: 'Achievements',    query: 'Show all achievements' },
  { label: 'Academic Docs',  query: 'Show all academic documents' },
]

const CAT_COLORS = {
  Resume:         'var(--accent-cyan)',
  Certificate:    'var(--accent-gold)',
  Certifications: 'var(--accent-gold)',
  Internship:     '#b47cff',
  Internships:    '#b47cff',
  Project:        'var(--accent-success)',
  Projects:       'var(--accent-success)',
  Achievement:    'var(--accent-magenta)',
  Achievements:   'var(--accent-magenta)',
  Academic:       '#ff8c40',
  Academics:      '#ff8c40',
}

const CAT_CLSES = {
  Resume:         'cat-resume',
  Certificate:    'cat-certifications',
  Certifications: 'cat-certifications',
  Internship:     'cat-internships',
  Internships:    'cat-internships',
  Project:        'cat-projects',
  Projects:       'cat-projects',
  Achievement:    'cat-achievements',
  Achievements:   'cat-achievements',
  Academic:       'cat-academics',
  Academics:      'cat-academics',
}

export default function SearchBar({ geminiKey, onViewDoc }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (val) => {
    const q = val !== undefined ? val : query
    if (!q.trim()) return
    setLoading(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (geminiKey) headers['x-gemini-key'] = geminiKey
      const res = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q }),
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>Smart Retrieval System</h1>
          <p>Ask natural queries. The search algorithm processes TF-IDF score weights to locate relevant documents and skills instantly.</p>
        </div>
      </div>

      <div className="search-layout">
        {/* Search input panel */}
        <div className="glass-card search-card">
          <div className="search-input-wrapper">
            <i className="fa-solid fa-magnifying-glass main-search-icon" />
            <input
              type="text"
              id="smartSearchInput"
              placeholder="Try asking: 'Show my python certifications', 'internship at xyz', or 'projects from 2025'"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-primary" id="searchSubmitBtn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <i className="fa-solid fa-spinner fa-spin" /> : 'Search'}
            </button>
          </div>

          <div className="search-suggestions">
            <span className="suggest-label">Suggested Queries:</span>
            {SUGGESTIONS.map(s => (
              <button
                key={s.label}
                className="suggest-btn"
                onClick={() => { setQuery(s.query); handleSearch(s.query) }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search results panel */}
        <div className="search-results-container">
          <div className="results-meta" id="resultsCount">
            {results === null
              ? 'Type a query above to search your Digital Identity...'
              : `${results.length} result${results.length === 1 ? '' : 's'} matching "${query}"`}
          </div>

          <div className="results-list" id="searchResultsList">
            {results === null ? (
              <div className="search-empty-state">
                <i className="fa-solid fa-database" style={{ fontSize: 36, color: 'var(--accent-indigo)', opacity: 0.4 }} />
                <h3 style={{ marginTop: 12 }}>Ready to Query</h3>
                <p>Enter keywords, skills, or years to match against your records.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="search-empty-state">
                <i className="fa-solid fa-ghost" style={{ fontSize: 36, color: 'var(--accent-danger)', opacity: 0.4 }} />
                <h3 style={{ marginTop: 12 }}>No Records Located</h3>
                <p>We couldn't find any documents containing those concepts. Try a broader search.</p>
              </div>
            ) : (
              results.map((r, i) => {
                const color = CAT_COLORS[r.category] || 'var(--accent-cyan)'
                const cls = CAT_CLSES[r.category] || ''
                return (
                  <div key={i} className="search-result-card" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="search-result-score">
                      {r.score}%
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">
                        <i className="fa-solid fa-file" style={{ color }} />
                        {r.filename}
                      </div>
                      <div className="search-result-summary">
                        <span className={`cat-badge ${cls}`} style={{ marginRight: 8 }}>{r.category}</span>
                        {r.summary}
                      </div>
                      
                      <div className="doc-actions">
                        {r.file_path && (
                          <a
                            className="btn-doc-action open"
                            href={r.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="fas fa-external-link-alt" /> Open File
                          </a>
                        )}
                        <button
                          className="btn-doc-action view"
                          onClick={() => onViewDoc && onViewDoc(r)}
                        >
                          <i className="fas fa-eye" /> View Details
                        </button>
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-calendar-alt" /> {r.year}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
