import os
import time
import shutil
from fastapi import FastAPI, Depends, UploadFile, File, Form, Header, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional, List
import json

from .database import engine, Base, get_db
from . import models, parser, search, auth

# Initialize tables and migrate schema if needed
Base.metadata.create_all(bind=engine)

def migrate_db():
    with engine.connect() as conn:
        from sqlalchemy import text
        for col, col_type in [
            ("email", "VARCHAR(255)"),
            ("hashed_password", "VARCHAR(255)"),
            ("salt", "VARCHAR(100)"),
            ("created_at", "DATETIME")
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

migrate_db()

# Create uploads directory relative to backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="MemoryVerse AI - Intelligent Digital Identity System")

# Mount static uploads directory
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development sandbox
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory indices
local_index = search.LocalSearchIndex()
gemini_embeddings_cache = {} # doc_id -> list of float (loaded at startup/upload)

def rebuild_all_relationships(db: Session):
    try:
        # Clear existing relationships
        db.query(models.Relationship).delete()
        db.commit()

        docs = db.query(models.Document).all()
        
        # 1. Document <-> Skill relationships
        for doc in docs:
            for skill in doc.skills:
                if doc.category in ["Certificate", "Certifications"]:
                    db.add(models.Relationship(
                        source_type="document",
                        source_id=f"doc_{doc.id}",
                        target_type="skill",
                        target_id=f"skill_{skill.name}",
                        rel_type="acquired"
                    ))
                elif doc.category in ["Project", "Projects"]:
                    db.add(models.Relationship(
                        source_type="skill",
                        source_id=f"skill_{skill.name}",
                        target_type="document",
                        target_id=f"doc_{doc.id}",
                        rel_type="uses"
                    ))
                elif doc.category in ["Internship", "Internships"]:
                    db.add(models.Relationship(
                        source_type="skill",
                        source_id=f"skill_{skill.name}",
                        target_type="document",
                        target_id=f"doc_{doc.id}",
                        rel_type="required_by"
                    ))
                else:
                    db.add(models.Relationship(
                        source_type="document",
                        source_id=f"doc_{doc.id}",
                        target_type="skill",
                        target_id=f"skill_{skill.name}",
                        rel_type="linked_to"
                    ))

        # 2. Project <-> Internship relationships (based on shared skills)
        projects = [d for d in docs if d.category in ["Project", "Projects"]]
        internships = [d for d in docs if d.category in ["Internship", "Internships"]]
        for proj in projects:
            proj_skills = set(s.name for s in proj.skills)
            for intern in internships:
                intern_skills = set(s.name for s in intern.skills)
                shared = proj_skills & intern_skills
                if shared:
                    db.add(models.Relationship(
                        source_type="document",
                        source_id=f"doc_{proj.id}",
                        target_type="document",
                        target_id=f"doc_{intern.id}",
                        rel_type="applies_to"
                    ))
        db.commit()
    except Exception as e:
        print(f"Error rebuilding relationships: {e}")
        db.rollback()

@app.on_event("startup")
def startup_event():
    # Sync SQLite documents with TF-IDF search index and rebuild relationships
    db = next(get_db())
    try:
        docs = db.query(models.Document).all()
        for doc in docs:
            local_index.index_document(doc.id, f"{doc.filename} {doc.category} {doc.extracted_text}")
        rebuild_all_relationships(db)
    finally:
        db.close()

# Authentication Endpoints
@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip()
    password = payload.get("password", "")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
    
    existing = db.query(models.User).filter(models.User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username is already registered")
        
    if email:
        existing_email = db.query(models.User).filter(models.User.email == email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already registered")
        
    hashed_pwd, salt = auth.hash_password(password)
    db_user = models.User(
        username=username,
        email=email or None,
        hashed_password=hashed_pwd,
        salt=salt
    )
    db.add(db_user)
    db.commit()
    return {"status": "success", "message": "Account created successfully"}

@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username", "").strip()
    password = payload.get("password", "")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password credentials"
        )
    
    authenticated = False
    # Check hashed password
    if db_user.hashed_password and db_user.salt:
        authenticated = auth.verify_password(password, db_user.hashed_password, db_user.salt)
    elif db_user.password:
        # Legacy plain password fallback - automatically upgrade to hash
        if db_user.password == password:
            authenticated = True
            h_pwd, s_val = auth.hash_password(password)
            db_user.hashed_password = h_pwd
            db_user.salt = s_val
            db.commit()

    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password credentials"
        )
        
    token = auth.generate_token(username)
    return {
        "status": "success",
        "token": token,
        "username": username
    }


# Document Ingestion Endpoint
@app.post("/api/documents/upload")
async def upload_document(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    filename_override: Optional[str] = Form(None),
    gemini_key: Optional[str] = Form(None),
    x_gemini_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    api_key = x_gemini_key or gemini_key
    extracted_text = ""
    filename = filename_override or "Unnamed Document"
    saved_file_path = None
    
    # 1. Extract raw content
    if file:
        filename = file.filename
        file_bytes = await file.read()
        
        # Save file to uploads directory
        safe_filename = "".join([c for c in filename if c.isalnum() or c in "._-"])
        if not safe_filename:
            safe_filename = "document"
        unique_filename = f"{int(time.time())}_{safe_filename}"
        local_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        try:
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            saved_file_path = f"/api/uploads/{unique_filename}"
        except Exception as e:
            print(f"Error saving uploaded file: {e}")
        
        # Read text or PDF
        if filename.lower().endswith(".pdf"):
            extracted_text = parser.extract_text_from_pdf(file_bytes)
        else:
            try:
                extracted_text = file_bytes.decode("utf-8")
            except Exception:
                extracted_text = f"Content of file: {filename}"
    elif raw_text:
        extracted_text = raw_text

    # 2. Extract entities and classify
    if api_key and len(api_key.strip()) > 10:
        meta = parser.call_gemini_parser(api_key, filename, extracted_text)
    else:
        meta = parser.classify_heuristics(filename, extracted_text)
        
    category = meta.get("category", "Project")
    year = meta.get("year", 2026)
    skills_list = meta.get("skills", [])
    summary = meta.get("summary", "")

    # 3. Save to Database
    db_doc = models.Document(
        filename=filename,
        category=category,
        file_path=saved_file_path,
        extracted_text=extracted_text,
        summary=summary,
        year=year
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # Add Skills
    for skill_name in skills_list:
        db_skill = db.query(models.Skill).filter(models.Skill.name == skill_name).first()
        if not db_skill:
            db_skill = models.Skill(name=skill_name)
            db.add(db_skill)
            db.commit()
            db.refresh(db_skill)
        
        db_doc.skills.append(db_skill)
    db.commit()

    # 4. Update search index
    doc_search_text = f"{filename} {category} {summary} {extracted_text} " + " ".join(skills_list)
    local_index.index_document(db_doc.id, doc_search_text)

    # 5. Handle Gemini embeddings if key provided
    if api_key and len(api_key.strip()) > 10:
        emb = search.get_gemini_embedding(api_key, doc_search_text)
        if emb:
            gemini_embeddings_cache[db_doc.id] = emb

    rebuild_all_relationships(db)

    doc_data = {
        "id": db_doc.id,
        "filename": db_doc.filename,
        "category": db_doc.category,
        "year": db_doc.year,
        "summary": db_doc.summary,
        "file_path": db_doc.file_path,
        "extracted_text": db_doc.extracted_text,
        "skills": [s.name for s in db_doc.skills]
    }

    return {
        "status": "success",
        "document": doc_data,
        **doc_data  # Top-level fields for direct access compatibility
    }

# URL Document Ingestion Endpoint
@app.post("/api/documents/url")
def ingest_url(payload: dict, x_gemini_key: Optional[str] = Header(None), db: Session = Depends(get_db)):
    url = payload.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    url_data = parser.fetch_url_content(url)
    filename = url_data.get("title", url)
    extracted_text = url_data.get("text", f"Online resource: {url}")

    if x_gemini_key and len(x_gemini_key.strip()) > 10:
        meta = parser.call_gemini_parser(x_gemini_key, filename, extracted_text)
    else:
        meta = parser.classify_heuristics(filename, extracted_text)

    category = meta.get("category", "Project")
    year = meta.get("year", 2026)
    skills_list = meta.get("skills", [])
    summary = meta.get("summary", f"Imported resource from {url}")

    db_doc = models.Document(
        filename=filename,
        category=category,
        file_path=url,
        extracted_text=extracted_text,
        summary=summary,
        year=year
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    for skill_name in skills_list:
        db_skill = db.query(models.Skill).filter(models.Skill.name == skill_name).first()
        if not db_skill:
            db_skill = models.Skill(name=skill_name)
            db.add(db_skill)
            db.commit()
            db.refresh(db_skill)
        db_doc.skills.append(db_skill)
    db.commit()

    doc_search_text = f"{filename} {category} {summary} {extracted_text} " + " ".join(skills_list)
    local_index.index_document(db_doc.id, doc_search_text)

    rebuild_all_relationships(db)

    doc_data = {
        "id": db_doc.id,
        "filename": db_doc.filename,
        "category": db_doc.category,
        "year": db_doc.year,
        "summary": db_doc.summary,
        "file_path": db_doc.file_path,
        "extracted_text": db_doc.extracted_text,
        "skills": [s.name for s in db_doc.skills]
    }

    return {
        "status": "success",
        "document": doc_data,
        **doc_data
    }

# Update Document Metadata Endpoint
@app.patch("/api/documents/{doc_id}")
def update_document(doc_id: int, payload: dict, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if "title" in payload or "filename" in payload:
        doc.filename = payload.get("title") or payload.get("filename")
    if "category" in payload:
        doc.category = payload["category"]
    if "year" in payload:
        doc.year = int(payload["year"])
    if "content" in payload or "extracted_text" in payload:
        doc.extracted_text = payload.get("content") or payload.get("extracted_text")
    if "summary" in payload:
        doc.summary = payload["summary"]

    if "skills" in payload:
        skills_input = payload["skills"]
        if isinstance(skills_input, str):
            skills_list = [s.strip() for s in skills_input.split(",") if s.strip()]
        else:
            skills_list = skills_input
            
        doc.skills.clear()
        for skill_name in skills_list:
            db_skill = db.query(models.Skill).filter(models.Skill.name == skill_name).first()
            if not db_skill:
                db_skill = models.Skill(name=skill_name)
                db.add(db_skill)
                db.commit()
                db.refresh(db_skill)
            doc.skills.append(db_skill)

    db.commit()
    db.refresh(doc)

    doc_search_text = f"{doc.filename} {doc.category} {doc.summary} {doc.extracted_text} " + " ".join([s.name for s in doc.skills])
    local_index.index_document(doc.id, doc_search_text)
    rebuild_all_relationships(db)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "category": doc.category,
        "year": doc.year,
        "summary": doc.summary,
        "file_path": doc.file_path,
        "extracted_text": doc.extracted_text,
        "skills": [s.name for s in doc.skills]
    }

# Retrieve Documents List
@app.get("/api/documents")
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(models.Document).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "category": d.category,
            "year": d.year,
            "summary": d.summary,
            "file_path": d.file_path,
            "extracted_text": d.extracted_text,
            "skills": [s.name for s in d.skills]
        } for d in docs
    ]

# Delete Document
@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(doc)
    db.commit()
    rebuild_all_relationships(db)
    local_index.remove_document(doc_id)
    if doc_id in gemini_embeddings_cache:
        del gemini_embeddings_cache[doc_id]
        
    return {"status": "success", "message": "Document deleted"}

# Knowledge Graph Mapping
@app.get("/api/graph")
def get_graph(db: Session = Depends(get_db)):
    docs = db.query(models.Document).all()
    skills = db.query(models.Skill).all()
    
    nodes = []
    links = []
    
    # 1. Document Nodes
    for d in docs:
        nodes.append({
            "id": f"doc_{d.id}",
            "label": d.filename,
            "type": "document",
            "category": d.category,
            "year": d.year,
            "summary": d.summary
        })
        
    # 2. Skill Nodes
    active_skills = set()
    for s in skills:
        if s.documents:
            active_skills.add(s.name)
            nodes.append({
                "id": f"skill_{s.name}",
                "label": s.name,
                "type": "skill"
            })

    # 3. DB Relationships (Certification -> Skill, Skill -> Project, Project -> Internship)
    rels = db.query(models.Relationship).all()
    for r in rels:
        links.append({
            "source": r.source_id,
            "target": r.target_id,
            "type": r.rel_type
        })

    # 4. Career Paths (Dynamic nodes and links)
    career_paths = {
        "AI/ML Engineer": ["Python", "Machine Learning", "NLP", "RAG", "Embeddings", "Vector Databases", "Semantic Search", "TensorFlow", "PyTorch", "Deep Learning"],
        "Full Stack Developer": ["Javascript", "React", "Node.js", "Express", "SQL", "NoSQL", "TypeScript", "HTML", "CSS", "MongoDB", "PostgreSQL"],
        "Cloud Solutions Architect": ["AWS", "GCP", "Cloud Computing", "Docker", "Kubernetes"],
        "Data Scientist / Analyst": ["Python", "Machine Learning", "Data Science", "SQL", "Data Analytics", "Data Structures"]
    }

    for path, req_skills in career_paths.items():
        matched = [s for s in req_skills if s in active_skills]
        if len(matched) >= 2: # Show career path if user has at least 2 relevant skills
            path_id = f"path_{path.replace(' ', '_').lower()}"
            nodes.append({
                "id": path_id,
                "label": path,
                "type": "career_path"
            })
            for s in matched:
                links.append({
                    "source": f"skill_{s}",
                    "target": path_id,
                    "type": "prepares_for"
                })

    return {"nodes": nodes, "links": links}

# Career Path recommendation API
@app.get("/api/career-path")
def get_career_path(db: Session = Depends(get_db)):
    skills = db.query(models.Skill).all()
    user_skills = set(s.name for s in skills if s.documents)
    
    career_paths = {
        "AI/ML Engineer": ["Python", "Machine Learning", "NLP", "RAG", "Embeddings", "Vector Databases", "Semantic Search", "TensorFlow", "PyTorch", "Deep Learning"],
        "Full Stack Developer": ["Javascript", "React", "Node.js", "Express", "SQL", "NoSQL", "TypeScript", "HTML", "CSS", "MongoDB", "PostgreSQL"],
        "Cloud Solutions Architect": ["AWS", "GCP", "Cloud Computing", "Docker", "Kubernetes"],
        "Data Scientist / Analyst": ["Python", "Machine Learning", "Data Science", "SQL", "Data Analytics", "Data Structures"]
    }
    
    results = []
    for path, req_skills in career_paths.items():
        matched = [s for s in req_skills if s in user_skills]
        pct = round((len(matched) / len(req_skills)) * 100) if req_skills else 0
        results.append({
            "name": path,
            "matched_skills": matched,
            "missing_skills": [s for s in req_skills if s not in user_skills],
            "percentage": pct
        })
    results.sort(key=lambda x: x["percentage"], reverse=True)
    return results

# Year-wise Timeline
@app.get("/api/timeline")
def get_timeline(db: Session = Depends(get_db)):
    docs = db.query(models.Document).order_by(models.Document.year.asc()).all()
    timeline = []
    for d in docs:
        timeline.append({
            "id": d.id,
            "filename": d.filename,
            "category": d.category,
            "year": d.year,
            "summary": d.summary,
            "file_path": d.file_path,
            "extracted_text": d.extracted_text,
            "skills": [s.name for s in d.skills]
        })
    return timeline

# Category keyword detection map
CATEGORY_KEYWORDS = {
    "Certificate": ["certificate", "certificates", "certification", "certifications", "certified", "cert"],
    "Internship": ["internship", "internships", "intern", "interns"],
    "Project": ["project", "projects"],
    "Achievement": ["achievement", "achievements", "award", "awards", "honor", "honours"],
    "Academic": ["academic", "academics", "degree", "education", "course", "semester"],
    "Resume": ["resume", "cv"],
}

# Direct category filter endpoint
@app.get("/api/documents/filter")
def filter_documents(category: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Return all documents matching a given category name.
    If no category provided, returns all documents.
    """
    q = db.query(models.Document)
    if category:
        # Match both singular and plural forms
        cat_lower = category.lower()
        matched_cat = None
        for canonical, keywords in CATEGORY_KEYWORDS.items():
            if cat_lower in keywords or cat_lower == canonical.lower():
                matched_cat = canonical
                break
        if matched_cat:
            # Match both "Certificate" and "Certifications" style variants
            alt = matched_cat + "s" if not matched_cat.endswith("s") else matched_cat[:-1]
            q = q.filter(
                (models.Document.category == matched_cat) | 
                (models.Document.category == alt)
            )
    docs = q.all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "category": d.category,
            "year": d.year,
            "summary": d.summary,
            "file_path": d.file_path,
            "extracted_text": d.extracted_text,
            "skills": [s.name for s in d.skills]
        } for d in docs
    ]

# Smart Retrieval Search
@app.post("/api/search")
def search_documents(payload: dict, x_gemini_key: Optional[str] = Header(None), db: Session = Depends(get_db)):
    query = payload.get("query", "")
    if not query:
        return []

    q_lower = query.lower().strip()
    results = []
    category_docs = []

    # ── Step 1: Detect category keywords in query ──────────────────────────
    detected_category = None
    for canonical, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in q_lower for kw in keywords):
            detected_category = canonical
            break

    if detected_category:
        # Pull all documents matching this category from DB
        alt = detected_category + "s" if not detected_category.endswith("s") else detected_category[:-1]
        category_docs = db.query(models.Document).filter(
            (models.Document.category == detected_category) |
            (models.Document.category == alt)
        ).all()

    # ── Step 2: Vector search (Gemini Embeddings) ──────────────────────────
    if x_gemini_key and len(x_gemini_key.strip()) > 10:
        query_emb = search.get_gemini_embedding(x_gemini_key, query)
        if query_emb:
            scores = []
            for doc_id, emb in gemini_embeddings_cache.items():
                sim = search.cosine_similarity(query_emb, emb)
                if sim > 0.05:
                    scores.append((doc_id, sim))
            scores.sort(key=lambda x: x[1], reverse=True)
            results = scores

    # ── Step 3: TF-IDF fallback ────────────────────────────────────────────
    if not results:
        results = local_index.search(query)

    # ── Step 4: Merge category docs + scored results ───────────────────────
    seen_ids = set()
    search_hits = []

    # First: add category-matched docs with a high base score
    for doc in category_docs:
        seen_ids.add(doc.id)
        # Check if there's also a TF-IDF/vector score for this doc
        extra_score = next((s for did, s in results if did == doc.id), 0)
        # Build remaining query terms (remove category words) for skill/keyword matching
        remaining_terms = [w for w in q_lower.split() if w not in [
            'show', 'all', 'my', 'list', 'get', 'find', 'display', 'give', 'me',
        ] + (CATEGORY_KEYWORDS.get(detected_category, []))] if detected_category else []
        
        # Boost score if doc matches remaining terms
        bonus = 0
        if remaining_terms:
            doc_text = f"{doc.filename} {doc.summary} {doc.extracted_text} " + " ".join(
                s.name for s in doc.skills
            )
            doc_text_lower = doc_text.lower()
            matched_terms = sum(1 for t in remaining_terms if t in doc_text_lower)
            bonus = matched_terms / max(len(remaining_terms), 1)
            # If we have remaining terms and none match, reduce score
            score = 0.6 + bonus * 0.35 + extra_score * 0.05
        else:
            # Pure category query - all docs in category are equally relevant
            score = 0.85 + extra_score * 0.15

        search_hits.append({
            "id": doc.id,
            "filename": doc.filename,
            "category": doc.category,
            "year": doc.year,
            "summary": doc.summary,
            "file_path": doc.file_path,
            "extracted_text": doc.extracted_text,
            "skills": [s.name for s in doc.skills],
            "score": min(round(score * 100), 99)
        })

    # Then: add TF-IDF/vector results not already included
    for doc_id, score in results:
        if doc_id in seen_ids:
            continue
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            seen_ids.add(doc.id)
            search_hits.append({
                "id": doc.id,
                "filename": doc.filename,
                "category": doc.category,
                "year": doc.year,
                "summary": doc.summary,
                "file_path": doc.file_path,
                "extracted_text": doc.extracted_text,
                "skills": [s.name for s in doc.skills],
                "score": round(score * 100)
            })

    # Sort by score descending
    search_hits.sort(key=lambda x: x["score"], reverse=True)
    return search_hits

# Serve React Frontend Build (SPA fallback)
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DIST_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")

if os.path.exists(DIST_DIR):
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

