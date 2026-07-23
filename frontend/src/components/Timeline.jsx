import { useState, useMemo } from 'react'

const CAT_META = {
  Resume:         { color: 'var(--accent-cyan)',     cls: 'cat-resume' },
  Certificate:    { color: 'var(--accent-gold)',     cls: 'cat-certifications' },
  Certifications: { color: 'var(--accent-gold)',     cls: 'cat-certifications' },
  Internship:     { color: '#b47cff',               cls: 'cat-internships' },
  Internships:    { color: '#b47cff',               cls: 'cat-internships' },
  Project:        { color: 'var(--accent-success)', cls: 'cat-projects' },
  Projects:       { color: 'var(--accent-success)', cls: 'cat-projects' },
  Achievement:    { color: 'var(--accent-magenta)', cls: 'cat-achievements' },
  Achievements:   { color: 'var(--accent-magenta)', cls: 'cat-achievements' },
  Academic:       { color: '#ff8c40',              cls: 'cat-academics' },
  Academics:      { color: '#ff8c40',              cls: 'cat-academics' },
}

export default function Timeline({ documents, onViewDoc }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return documents
    return documents.filter(d => {
      const cat = (d.category || '').toLowerCase()
      const filt = filter.toLowerCase()
      if (filt === 'academics') return cat.startsWith('academic')
      if (filt === 'certifications') return cat.startsWith('cert')
      if (filt === 'projects') return cat.startsWith('proj')
      if (filt === 'internships') return cat.startsWith('intern')
      return cat === filt
    })
  }, [documents, filter])

  // Sort chronologically ascending for horizontal flow
  const sortedDocs = useMemo(() => {
    return [...filtered].sort((a, b) => Number(a.year || 0) - Number(b.year || 0))
  }, [filtered])

  return (
    <>
      <div className="section-header">
        <div>
          <h1>Digital Journey Timeline</h1>
          <p>A visual chronological map showing your growth, experience milestones, and key transitions over time.</p>
        </div>
        <div className="timeline-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'Academics' ? 'active' : ''}`} onClick={() => setFilter('Academics')}>Academics</button>
          <button className={`filter-btn ${filter === 'Certifications' ? 'active' : ''}`} onClick={() => setFilter('Certifications')}>Certifications</button>
          <button className={`filter-btn ${filter === 'Projects' ? 'active' : ''}`} onClick={() => setFilter('Projects')}>Projects</button>
          <button className={`filter-btn ${filter === 'Internships' ? 'active' : ''}`} onClick={() => setFilter('Internships')}>Internships</button>
        </div>
      </div>

      <div className="timeline-scroll-container">
        <div className="timeline-wrapper">
          <div className="timeline-track" />
          <div className="timeline-nodes" id="timeline-nodes-container">
            {sortedDocs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, width: '100%', textAlign: 'center', padding: '40px 0' }}>
                No milestones found for this category.
              </div>
            ) : (
              sortedDocs.map((doc, idx) => {
                const meta = CAT_META[doc.category] || { color: 'var(--accent-cyan)', cls: '' }
                return (
                  <div
                    key={doc.id}
                    className="timeline-node"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                    onClick={() => onViewDoc && onViewDoc(doc)}
                  >
                    <div className="node-dot" style={{ background: meta.color, borderColor: meta.color }} />
                    <div className="node-card">
                      <div className="node-year">{doc.year}</div>
                      <div className="node-title">{doc.filename || doc.title}</div>
                      <div className={`node-badge cat-badge ${meta.cls}`}>{doc.category}</div>
                      
                      <div className="node-actions" onClick={e => e.stopPropagation()}>
                        {doc.file_path && (
                          <a
                            className="btn-doc-action open"
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 9, padding: '3px 8px' }}
                          >
                            Open
                          </a>
                        )}
                        <button
                          className="btn-doc-action view"
                          onClick={() => onViewDoc && onViewDoc(doc)}
                          style={{ fontSize: 9, padding: '3px 8px' }}
                        >
                          Details
                        </button>
                      </div>
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
