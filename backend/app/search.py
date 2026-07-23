import re
import math
import numpy as np
import requests
from typing import List, Dict, Tuple

# Simple stopwords set
STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 
    'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 
    'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 
    'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'im', 'ive', 'if', 'in', 'into', 'is', 
    'isnt', 'it', 'its', 'itself', 'let', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 
    'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats', 'the', 
    'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 
    'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 
    'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 
    'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 
    'your', 'yours', 'yourself', 'yourselves'
}

def preprocess_text(text: str) -> List[str]:
    if not text:
        return []
    cleaned = re.sub(r'[^a-z0-9\s+#\-]', ' ', text.lower())
    tokens = [t for t in cleaned.split() if len(t) > 1]
    return [t for t in tokens if t not in STOPWORDS]

class LocalSearchIndex:
    """
    TF-IDF Vector Space Model search index.
    """
    def __init__(self):
        self.doc_tokens = {}  # doc_id -> list of tokens
        self.df = {}          # term -> doc count
        self.idf = {}         # term -> idf value
        self.doc_vectors = {} # doc_id -> dict of term: tf-idf
        
    def clear(self):
        self.doc_tokens = {}
        self.df = {}
        self.idf = {}
        self.doc_vectors = {}
        
    def index_document(self, doc_id: int, text: str):
        tokens = preprocess_text(text)
        self.doc_tokens[doc_id] = tokens
        self._recompute()

    def remove_document(self, doc_id: int):
        if doc_id in self.doc_tokens:
            del self.doc_tokens[doc_id]
            self._recompute()

    def _recompute(self):
        self.df = {}
        self.idf = {}
        self.doc_vectors = {}
        N = len(self.doc_tokens)
        if N == 0:
            return

        # Compute Document Frequency
        for tokens in self.doc_tokens.values():
            for term in set(tokens):
                self.df[term] = self.df.get(term, 0) + 1

        # Compute IDF
        for term, df_val in self.df.items():
            self.idf[term] = math.log(1 + (N / df_val))

        # Compute TF-IDF vectors
        for doc_id, tokens in self.doc_tokens.items():
            if not tokens:
                continue
            tf = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            
            vector = {}
            doc_len = len(tokens)
            for term, count in tf.items():
                vector[term] = (count / doc_len) * self.idf.get(term, 0)
            self.doc_vectors[doc_id] = vector

    def search(self, query: str, limit: int = 10) -> List[Tuple[int, float]]:
        query_tokens = preprocess_text(query)
        if not query_tokens or not self.doc_vectors:
            return []

        # Build query vector
        query_tf = {}
        for t in query_tokens:
            query_tf[t] = query_tf.get(t, 0) + 1
        
        query_vector = {}
        q_len = len(query_tokens)
        for term, count in query_tf.items():
            query_vector[term] = (count / q_len) * self.idf.get(term, 0)

        # Calculate cosine similarity
        results = []
        q_norm = math.sqrt(sum(v * v for v in query_vector.values()))
        if q_norm == 0:
            return []

        for doc_id, doc_vec in self.doc_vectors.items():
            # Dot product
            dot = 0.0
            for term, q_val in query_vector.items():
                if term in doc_vec:
                    dot += q_val * doc_vec[term]
            
            d_norm = math.sqrt(sum(v * v for v in doc_vec.values()))
            if d_norm == 0:
                similarity = 0.0
            else:
                similarity = dot / (q_norm * d_norm)
            
            if similarity > 0.0:
                results.append((doc_id, similarity))
        
        # Sort by similarity descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]

# Vector Embedding helpers via Gemini API
def get_gemini_embedding(api_key: str, text: str) -> List[float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{
                "text": text[:2000]
            }]
        }
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            return response.json()["embedding"]["values"]
        else:
            print(f"Gemini Embedding error: {response.text}")
    except Exception as e:
        print(f"Failed to fetch embedding: {e}")
    return []

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    arr1, arr2 = np.array(v1), np.array(v2)
    norm1 = np.linalg.norm(arr1)
    norm2 = np.linalg.norm(arr2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(arr1, arr2) / (norm1 * norm2))
