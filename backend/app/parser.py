import re
import datetime
import json
import requests
from io import BytesIO

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

KNOWN_SKILLS = [
    "Python", "Machine Learning", "NLP", "RAG", "Embeddings", "Vector Databases", "Semantic Search",
    "Javascript", "HTML Canvas", "Algorithms", "Data Structures", "Leadership", "Data Science", "APIs",
    "GCP", "AWS", "Cloud Computing", "Docker", "Kubernetes", "React", "Node.js", "Express", "SQL",
    "NoSQL", "Git", "GitHub", "Java", "C++", "C#", "TypeScript", "TensorFlow", "PyTorch", "UI Design",
    "CSS", "HTML", "MongoDB", "PostgreSQL", "Data Analytics", "Deep Learning", "System Design"
]

def extract_text_from_pdf(file_bytes: bytes) -> str:
    if not PdfReader:
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return "PDF content"

    try:
        reader = PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def classify_heuristics(filename: str, text: str) -> dict:
    """
    Fallback Heuristic parsing when no LLM key is configured.
    """
    content = (filename + " " + text).lower()
    
    # 1. Determine Category
    category = "Project"
    if "resume" in content or "cv" in content or "curriculum vitae" in content:
        category = "Resume"
    elif "certificate" in content or "certify" in content or "certified" in content or "courseera" in content or "udemy" in content:
        category = "Certificate"
    elif "intern" in content or "placement" in content or "experience letter" in content:
        category = "Internship"
    elif "achievement" in content or "award" in content or "hackathon winner" in content or "won" in content or "trophy" in content:
        category = "Achievement"
    elif "transcript" in content or "grade sheet" in content or "report card" in content or "semester" in content or "exam" in content:
        category = "Academic"

    # 2. Extract Year
    current_year = datetime.datetime.now().year
    years = re.findall(r"\b(20\d{2}|19\d{2})\b", text)
    valid_years = [int(y) for y in years if 1990 <= int(y) <= current_year + 1]
    year = max(valid_years) if valid_years else current_year

    # 3. Extract Skills
    skills = []
    for skill in KNOWN_SKILLS:
        # Match word boundaries or special characters like C++, .NET
        pattern = r"\b" + re.escape(skill) + r"\b"
        if skill in ["C++", "C#", "Node.js", "React.js"]:
            pattern = re.escape(skill)
        if re.search(pattern, text, re.IGNORECASE):
            skills.append(skill)
    
    # 4. Generate Simple Summary
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    summary = ""
    if lines:
        summary = lines[0]
        if len(lines) > 1:
            summary += " - " + lines[1]
    if len(summary) > 200:
        summary = summary[:197] + "..."
    if not summary:
        summary = f"Uploaded file: {filename}"

    return {
        "category": category,
        "year": year,
        "skills": list(set(skills)),
        "summary": summary
    }

def call_gemini_parser(api_key: str, filename: str, text: str) -> dict:
    """
    Call Gemini API to structure the document details.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    Analyze the following document named "{filename}".
    Extract:
    1. Category: Must be one of ["Project", "Certificate", "Internship", "Resume", "Achievement", "Academic"].
    2. Year: The year of this achievement/document (integer).
    3. Skills: A list of relevant technical skills/tools or soft skills mentioned. Keep them concise.
    4. Summary: A short 1-2 sentence description of what the document is about.
    
    Return the response ONLY as a JSON object with this schema:
    {{
      "category": "string",
      "year": number,
      "skills": ["string", "string"],
      "summary": "string"
    }}

    Document Text:
    {text[:4000]}
    """
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code == 200:
            res_json = response.json()
            content = res_json["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(content.strip())
        else:
            print(f"Gemini API returned error: {response.text}")
    except Exception as e:
        print(f"Failed to query Gemini API: {e}")
    
    # Fallback to heuristics
    return classify_heuristics(filename, text)

def fetch_url_content(url: str) -> dict:
    """
    Fetch text content and title from a web URL for document ingestion.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        if resp.status_code == 200:
            html = resp.text
            # Extract basic title
            title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else url.split("/")[-1] or url
            
            # Clean HTML tags to get text
            text = re.sub(r'<script.*?>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style.*?>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return {"title": title, "text": text[:5000], "url": url}
    except Exception as e:
        print(f"Error fetching URL content: {e}")

    # Fallback title & text
    domain = url.split("//")[-1].split("/")[0]
    return {"title": f"Resource from {domain}", "text": f"Online resource link: {url}", "url": url}

