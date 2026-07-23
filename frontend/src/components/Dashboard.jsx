import { useState, useEffect } from 'react'
import { API_URL } from '../api'

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

export default function Dashboard({ documents, onDelete, onNavigate, onViewDoc }) {
  const [careerPaths, setCareerPaths] = useState([])
  const allSkills = [...new Set(documents.flatMap(d => d.skills || []))]
  const certCount = documents.filter(d => ['Certificate','Certifications'].includes(d.category)).length
  const projCount = documents.filter(d => ['Project','Projects'].includes(d.category)).length

  useEffect(() => {
    async function loadPaths() {
      try {
        const res = await fetch(`${API_URL}/api/career-path`)
        const data = await res.json()
        setCareerPaths(data)
      } catch {
        setCareerPaths([])
      }
    }
    loadPaths()
  }, [documents])


  const recentDocs = [...documents].reverse().slice(0, 5)

  return (
    <>
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Your Intelligent Digital Identity</h1>
          <p>Welcome back, Arasu. MemoryVerse AI has parsed your records to reconstruct your academic and professional growth timeline.</p>
        </div>
        <div className="welcome-illustration">
          <i className="fa-solid fa-microchip" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><i className="fa-solid fa-file-invoice" /></div>
          <div className="stat-details">
            <span className="stat-value">{documents.length}</span>
            <span className="stat-label">Ingested Files</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><i className="fa-solid fa-award" /></div>
          <div className="stat-details">
            <span className="stat-value">{certCount}</span>
            <span className="stat-label">Certifications</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><i className="fa-solid fa-diagram-project" /></div>
          <div className="stat-details">
            <span className="stat-value">{projCount}</span>
            <span className="stat-label">Connected Projects</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold"><i className="fa-solid fa-code" /></div>
          <div className="stat-details">
            <span className="stat-value">{allSkills.length}</span>
            <span className="stat-label">Identified Skills</span>
          </div>
        </div>
      </div>

      {/* Dashboard Panels */}
      <div className="dashboard-layout">
        {/* Recent Activity */}
        <div className="dashboard-panel panel-left">
          <div className="panel-header">
            <h2><i className="fa-solid fa-clock-rotate-left" /> Recent Activity</h2>
            <button className="panel-link-btn" onClick={() => onNavigate('ingestion')}>View Ingest Hub</button>
          </div>

          {recentDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
              <i className="fa-solid fa-inbox" style={{ display: 'block', fontSize: 28, marginBottom: 10, opacity: 0.4 }} />
              No documents yet. Upload from Ingest Hub.
            </div>
          ) : (
            <div className="recent-list">
              {recentDocs.map(doc => {
                const meta = CAT_META[doc.category] || { icon: 'fa-file', color: 'var(--text-muted)', cls: '' }
                return (
                  <div key={doc.id} className="recent-item" onClick={() => onViewDoc && onViewDoc(doc)}>
                    <i className={`fas ${meta.icon} recent-item-icon`} style={{ color: meta.color }} />
                    <div className="recent-item-info">
                      <div className="recent-item-name">{doc.filename}</div>
                      <div className="recent-item-meta">
                        <span className={`cat-badge ${meta.cls}`}>{doc.category}</span>
                        {' · '}{doc.year}
                      </div>
                    </div>
                    {doc.file_path && (
                      <a
                        className="btn-doc-action open"
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 10, padding: '3px 9px' }}
                      >
                        <i className="fas fa-external-link-alt" /> Open
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Skills & Career */}
        <div className="dashboard-panel panel-right">
          <div className="panel-header">
            <h2><i className="fa-solid fa-bolt" /> Key Core Skills</h2>
            <button className="panel-link-btn" onClick={() => onNavigate('graph')}>Explore Relationships</button>
          </div>

          <div className="skills-wordmap-container">
            <div className="skills-cloud">
              {allSkills.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Skills will appear after ingesting documents...</span>
              ) : allSkills.slice(0, 20).map((skill, i) => (
                <span key={skill} className={`skill-tag${i < 5 ? ' large' : ''}`}>{skill}</span>
              ))}
            </div>
          </div>

          {careerPaths.length > 0 && allSkills.length > 0 ? (
            <div className="career-advisor-section" style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
                <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }} /> AI Career Path Readiness
              </h3>
              {careerPaths.map(path => (
                <div key={path.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{path.name}</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{path.percentage}% Ready</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${path.percentage}%`, background: 'linear-gradient(90deg, #00f2fe 0%, #b47cff 100%)', borderRadius: 3 }} />
                  </div>
                  {path.percentage > 0 && path.missing_skills.length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      Next target skills: {path.missing_skills.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="career-prediction-box">
              <div className="career-icon"><i className="fa-solid fa-compass" /></div>
              <div className="career-info">
                <h3>AI Career Path Target</h3>
                <p>Upload documents to predict your career path readiness</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
