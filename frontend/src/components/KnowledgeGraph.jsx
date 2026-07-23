import { useEffect, useRef, useState, useCallback } from 'react'
import { API_URL } from '../api'

const NODE_COLORS = {
  Resume:         { fill: '#00f2fe', glow: 'rgba(0,242,254,0.5)' },
  Certificate:    { fill: '#ffd700', glow: 'rgba(255,215,0,0.5)' },
  Certifications: { fill: '#ffd700', glow: 'rgba(255,215,0,0.5)' },
  Internship:     { fill: '#b47cff', glow: 'rgba(180,124,255,0.5)' },
  Internships:    { fill: '#b47cff', glow: 'rgba(180,124,255,0.5)' },
  Project:        { fill: '#00e676', glow: 'rgba(0,230,118,0.5)' },
  Projects:       { fill: '#00e676', glow: 'rgba(0,230,118,0.5)' },
  Achievement:    { fill: '#ff007f', glow: 'rgba(255,0,127,0.5)' },
  Achievements:   { fill: '#ff007f', glow: 'rgba(255,0,127,0.5)' },
  Academic:       { fill: '#ff8c40', glow: 'rgba(255,140,64,0.5)' },
  Academics:      { fill: '#ff8c40', glow: 'rgba(255,140,64,0.5)' },
  skill:          { fill: '#7f00ff', glow: 'rgba(127,0,255,0.5)' },
  career_path:    { fill: '#ff00ff', glow: 'rgba(255,0,255,0.5)' },
}

export default function KnowledgeGraph({ documents }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const animRef = useRef(null)

  // View state
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const dragRef = useRef(null)
  const panDragRef = useRef(null)
  const hoveredNodeRef = useRef(null)

  // Inspector state
  const [inspectNode, setInspectNode] = useState(null)
  const [connections, setConnections] = useState([])

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/graph`)
      const data = await res.json()
      const { nodes: rawNodes, links: rawLinks } = data

      // Initialize positions
      const cx = 500
      const cy = 350
      const placed = rawNodes.map((n, i) => ({
        ...n,
        x: cx + (Math.random() - 0.5) * 400,
        y: cy + (Math.random() - 0.5) * 300,
        vx: 0, vy: 0,
        radius: n.type === 'skill' ? 10 : (n.type === 'career_path' ? 22 : 16),
      }))

      nodesRef.current = placed
      linksRef.current = rawLinks
    } catch {
      nodesRef.current = []
      linksRef.current = []
    }
  }, [])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph, documents])

  // Physics simulation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          canvas.width = width
          canvas.height = height
          panRef.current = { x: width / 2 - 500, y: height / 2 - 350 }
        }
      }
    })
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    const tick = () => {
      const nodes = nodesRef.current
      const links = linksRef.current
      const hoveredNode = hoveredNodeRef.current

      if (!nodes.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(110, 105, 136, 0.5)'
        ctx.font = '15px "Plus Jakarta Sans", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Upload documents to build your Knowledge Graph', canvas.width / 2, canvas.height / 2)
        animRef.current = requestAnimationFrame(tick)
        return
      }

      const nodeMap = {}
      nodes.forEach(n => { nodeMap[n.id] = n })

      // Repulsion between all nodes (Coulomb)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          let dx = b.x - a.x, dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 800 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx -= fx; a.vy -= fy
          b.vx += fx; b.vy += fy
        }
      }

      // Spring attraction for links (Hooke)
      links.forEach(link => {
        const a = nodeMap[link.source]
        const b = nodeMap[link.target]
        if (!a || !b) return
        let dx = b.x - a.x, dy = b.y - a.y
        let dist = Math.sqrt(dx * dx + dy * dy) || 1
        const idealLen = 120
        const force = (dist - idealLen) * 0.008
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      })

      // Centering gravity
      nodes.forEach(n => {
        n.vx += (500 - n.x) * 0.0004
        n.vy += (350 - n.y) * 0.0004
      })

      // Apply velocity with friction
      nodes.forEach(n => {
        if (dragRef.current?.id === n.id) return
        n.vx *= 0.88
        n.vy *= 0.88
        n.x += n.vx
        n.y += n.vy
      })

      // ---- DRAW ----
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(panRef.current.x, panRef.current.y)
      ctx.scale(zoomRef.current, zoomRef.current)

      // Draw links
      links.forEach(link => {
        const a = nodeMap[link.source]
        const b = nodeMap[link.target]
        if (!a || !b) return

        const isHighlighted = hoveredNode && (link.source === hoveredNode.id || link.target === hoveredNode.id)
        
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        
        if (hoveredNode) {
          ctx.strokeStyle = isHighlighted ? 'rgba(0, 242, 254, 0.7)' : 'rgba(0, 242, 254, 0.03)'
          ctx.lineWidth = isHighlighted ? 2.5 : 0.5
        } else {
          ctx.strokeStyle = 'rgba(0, 242, 254, 0.12)'
          ctx.lineWidth = 1
        }
        ctx.stroke()
      })

      // Draw nodes
      nodes.forEach(n => {
        const colorSet = n.type === 'skill' 
          ? NODE_COLORS.skill 
          : (n.type === 'career_path' 
              ? NODE_COLORS.career_path 
              : (NODE_COLORS[n.category] || NODE_COLORS.skill))
        const r = n.radius

        const isHovered = hoveredNode && n.id === hoveredNode.id
        const isConnected = hoveredNode && links.some(l => 
          (l.source === hoveredNode.id && l.target === n.id) || 
          (l.target === hoveredNode.id && l.source === n.id)
        )
        const isHighlighted = isHovered || isConnected

        ctx.save()
        if (hoveredNode && !isHighlighted) {
          ctx.globalAlpha = 0.25
        } else {
          ctx.globalAlpha = 1.0
        }

        // Glow (extra glow if hovered)
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (isHovered ? 8 : 4), 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + (isHovered ? 20 : 12))
        gradient.addColorStop(0, colorSet.glow)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fill()

        // Node circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (isHovered ? 2 : 0), 0, Math.PI * 2)
        ctx.fillStyle = colorSet.fill
        ctx.fill()
        ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.stroke()

        // Label
        ctx.fillStyle = isHovered ? '#00f2fe' : '#f5f4fb'
        ctx.font = `${(n.type === 'skill' ? 9 : 10) + (isHovered ? 2 : 0)}px "Plus Jakarta Sans", sans-serif`
        ctx.textAlign = 'center'
        const label = n.label?.length > 18 ? n.label.slice(0, 16) + '…' : n.label
        ctx.fillText(label || '', n.x, n.y + r + (isHovered ? 18 : 14))
        ctx.restore()
      })

      ctx.restore()
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animRef.current)
      resizeObserver.disconnect()
    }
  }, [documents])

  const getGraphPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    return {
      x: (mx - panRef.current.x) / zoomRef.current,
      y: (my - panRef.current.y) / zoomRef.current,
      mx, my,
    }
  }

  const handleMouseDown = (e) => {
    const { x, y, mx, my } = getGraphPos(e)
    const hit = nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y
      return Math.sqrt(dx * dx + dy * dy) < n.radius + 4
    })
    if (hit) {
      dragRef.current = hit
      // Inspect node
      setInspectNode(hit)
      // Find direct connections
      const direct = linksRef.current
        .filter(l => l.source === hit.id || l.target === hit.id)
        .map(l => {
          const neighborId = l.source === hit.id ? l.target : l.source
          const neighbor = nodesRef.current.find(n => n.id === neighborId)
          return neighbor ? neighbor.label : null
        })
        .filter(Boolean)
      setConnections(direct)
    } else {
      panDragRef.current = { startX: mx, startY: my, panX: panRef.current.x, panY: panRef.current.y }
    }
  }

  const handleMouseMove = (e) => {
    const { x, y, mx, my } = getGraphPos(e)
    if (dragRef.current) {
      dragRef.current.x = x
      dragRef.current.y = y
      dragRef.current.vx = 0
      dragRef.current.vy = 0
    } else if (panDragRef.current) {
      panRef.current.x = panDragRef.current.panX + (mx - panDragRef.current.startX)
      panRef.current.y = panDragRef.current.panY + (my - panDragRef.current.startY)
    } else {
      // Hover detection
      const hit = nodesRef.current.find(n => {
        const dx = n.x - x, dy = n.y - y
        return Math.sqrt(dx * dx + dy * dy) < n.radius + 6
      })
      hoveredNodeRef.current = hit || null
    }
  }

  const handleMouseUp = () => {
    dragRef.current = null
    panDragRef.current = null
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    zoomRef.current = Math.max(0.3, Math.min(3, zoomRef.current * delta))
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>Knowledge Graph Engine</h1>
          <p>Explore the semantic web linking Certifications, Skills, Projects, and Career Paths. Drag nodes to interact.</p>
        </div>
        <div className="graph-legend">
          <span className="legend-item"><span className="legend-dot project" />Project</span>
          <span className="legend-item"><span class="legend-dot certification" />Certification</span>
          <span className="legend-item"><span class="legend-dot internship" />Internship</span>
          <span className="legend-item"><span class="legend-dot skill" />Skill</span>
          <span className="legend-item"><span class="legend-dot career" style={{ background: 'var(--accent-magenta)' }} />Career Path</span>
        </div>
      </div>

      <div className="graph-container-wrapper glass-card">
        <canvas
          ref={canvasRef}
          id="graphCanvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Graph Inspector Overlay */}
        <div className={`graph-inspector${inspectNode ? ' visible' : ''}`} id="graphInspector">
          <div className="inspector-header">
            <span className="inspector-badge">{inspectNode?.type === 'skill' ? 'Skill Node' : inspectNode?.category || 'Node'}</span>
            <button className="close-inspector-btn" onClick={() => setInspectNode(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <h3>{inspectNode?.label || 'Select a node to inspect'}</h3>
          <p>{inspectNode?.summary || 'Clicking on any node inside the knowledge graph will reveal its connected documents, skills, and chronological context here.'}</p>

          {connections.length > 0 && (
            <div className="inspector-connections" id="inspect-connections-box">
              <h4>Direct Connections</h4>
              <ul id="inspect-connections-list">
                {connections.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="graph-help-tip">
          <i className="fa-solid fa-circle-info" /> Scroll to zoom. Drag to move the workspace. Hover nodes to see immediate connections.
        </div>
      </div>
    </>
  )
}
