# MemoryVerse AI — Intelligent Digital Identity System

MemoryVerse AI is a next-generation full-stack digital identity system designed for hackathon showcases. It moves beyond standard folder storage to organize a student's academic and career accomplishments into an **interactive knowledge graph** and a **chronological growth timeline** with **natural language semantic search**.

---

## ⚡ Key Features

1. **Futuristic Security Gateway (Auth Card)**: Encrypted logins guarded by progressive cybersecurity decryption status visualizations.
2. **Auto-Organize / Document Categorization**: Automatically extracts text, identifies keywords/skills, determines categories (`Resume`, `Certificate`, `Internship`, `Project`, `Achievement`, `Academic`), and resolves years using heuristics or true LLM parsing.
3. **Interactive Knowledge Graph (Force-Directed Simulation)**: Color-coded nodes linking skills, certificates, and projects together in an HTML5 canvas simulation with dragging, scroll zooming, and hover state inspection.
4. **Growth Timeline**: A chronological growth roadmap tracking accomplishments year-by-year with quick category toggle filters.
5. **Semantic Retrieval**: Natural language search query parser running cosine similarity scores against local TF-IDF matrices (or true multi-modal vector embeddings if upgraded).
6. **Gemini AI Multi-Modal Upgrade**: Built-in API Key section allowing a simple key drop-in to upgrade Heuristics to state-of-the-art Generative AI parsing and true vector embeddings.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Vanilla CSS (Premium Glassmorphic styling with micro-animations).
- **Backend**: FastAPI, Python 3.13, SQLite, SQLAlchemy.
- **AI/NLP**: Heuristic tokenizers, stopword filtering, numpy-accelerated Cosine Similarity search, and Google Gemini API integration.

---

## 🚀 How to Run the Project

### Prerequisites
- Python 3.13+
- Node.js v24+

### 1. Launch the Backend Server
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - On Windows:
     ```powershell
     .\venv\Scripts\activate
     ```
   - On Mac/Linux:
     ```bash
     source venv/bin/activate
     ```
3. Start the FastAPI uvicorn server:
   ```bash
   python -m uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
   ```

The backend API will run at `http://127.0.0.1:8000`.

### 2. Launch the Frontend Dev Server
1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```

The app will launch at `http://localhost:3001` (or `http://localhost:3000` depending on port availability).


