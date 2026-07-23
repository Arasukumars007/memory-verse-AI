# MemoryVerse AI — Intelligent Digital Identity System

MemoryVerse AI is a next-generation full-stack digital identity system designed for hackathons and academic showcases. It transforms student accomplishments into an **interactive knowledge graph**, a **chronological growth timeline**, and an **AI-powered semantic search engine**.

---

## 🌐 Live Application & Access Links

- **Live Application**: [https://memory-verse-ai-production.up.railway.app/](https://memory-verse-ai-production.up.railway.app/)
- **Interactive API Swagger Docs**: [https://memory-verse-ai-production.up.railway.app/docs](https://memory-verse-ai-production.up.railway.app/docs)
- **GitHub Repository**: [https://github.com/Arasukumars007/memory-verse-AI](https://github.com/Arasukumars007/memory-verse-AI)

---

## 🔑 Test Credentials

- **Sign Up / Register**: Click **"Don't have an account? Sign Up"** on the login screen to register any custom username & password.
- **Pre-created Demo Credentials**:
  - **Username**: `arasu_admin`
  - **Password**: `MemoryVerse2026!`

---

## ⚡ Key Features & Innovations

1. **Futuristic Security Gateway**: Salted & hashed passwords (`PBKDF2-HMAC-SHA256`) with signed token session authorization (`Bearer <token>`).
2. **Auto-Organize & Entity Extraction**: Automatically extracts text, identifies keywords/skills, determines categories (`Resume`, `Certificate`, `Internship`, `Project`, `Achievement`, `Academic`), and resolves dates.
3. **Interactive Force-Directed Knowledge Graph**: HTML5 canvas simulation displaying nodes for documents, skills, and matching career paths with interactive drag, zoom, and inspection capabilities.
4. **Growth Timeline**: Year-by-year chronological roadmap tracking achievements with category filters.
5. **Semantic Search & Retrieval**: TF-IDF Vector Space search engine with Cosine Similarity scoring.
6. **Gemini Multi-Modal AI Upgrade**: Optional API key drop-in to upgrade heuristics to structured LLM entity parsing and `text-embedding-004` vector embeddings.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Vanilla CSS3 (Glassmorphism design system & micro-animations), HTML5 Canvas.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLite3, SQLAlchemy ORM.
- **Security**: `hashlib.pbkdf2_hmac` password salting & hashing, Signed session authorization tokens.
- **AI/NLP**: `pypdf`, TF-IDF vectorizer, Cosine Similarity engine, Google Gemini 1.5 Flash API.
- **DevOps**: Docker (Multi-stage build), Railway, Git/GitHub.

---

## 💡 Architecture & Design Decisions

- **Single-Domain Deployment**: Multi-stage Docker build compiles the Vite React Single-Page Application (`frontend/dist`) and embeds it directly into FastAPI, serving both UI and API endpoints from a single domain (`https://memory-verse-ai-production.up.railway.app/`).
- **Cryptographic Security**: Passwords are salted and hashed with PBKDF2-HMAC-SHA256, protecting user accounts against plain-text vulnerabilities and unauthorized access.
- **Automated Database Migrations**: `migrate_db()` function automatically executes column schema updates on startup.

---

## 🚀 Setup & Running Instructions

### Prerequisites
- Python 3.10+
- Node.js v18+

### 1. Launch Backend Server
```bash
git clone https://github.com/Arasukumars007/memory-verse-AI.git
cd memory-verse-AI/backend

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at `http://127.0.0.1:8000`.*

### 2. Launch Frontend Dev Server
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite React Development Server
npm run dev
```
*Frontend app will launch at `http://localhost:3000`.*
