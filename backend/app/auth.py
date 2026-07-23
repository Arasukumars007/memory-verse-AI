import os
import hashlib
import secrets
import time
from typing import Optional, Tuple

# Secret key for token signature
SECRET_KEY = os.environ.get("JWT_SECRET", "memoryverse-secure-identity-secret-2026")

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hash a password using PBKDF2 with SHA-256 and a 16-byte random salt.
    Returns (hashed_hex, salt_hex).
    """
    if not salt:
        salt = secrets.token_hex(16)
    
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        100000
    )
    return key.hex(), salt

def verify_password(password: str, hashed_hex: str, salt_hex: str) -> bool:
    """
    Verify password against stored PBKDF2 hash and salt.
    """
    try:
        calculated_hash, _ = hash_password(password, salt_hex)
        return secrets.compare_digest(calculated_hash, hashed_hex)
    except Exception:
        return False

def generate_token(username: str) -> str:
    """
    Generate a secure signed token containing timestamp and signature.
    """
    timestamp = str(int(time.time()))
    payload = f"{username}:{timestamp}"
    signature = hashlib.sha256(f"{payload}:{SECRET_KEY}".encode('utf-8')).hexdigest()
    return f"{payload}:{signature}"

def verify_token(token: str) -> Optional[str]:
    """
    Verify a signed token and return the username if valid.
    Tokens expire after 7 days (604800 seconds).
    """
    if not token or ":" not in token:
        return None
    
    parts = token.split(":")
    if len(parts) != 3:
        return None
    
    username, timestamp_str, signature = parts
    try:
        timestamp = int(timestamp_str)
        # Token expiration check (7 days)
        if time.time() - timestamp > 604800:
            return None
            
        expected_payload = f"{username}:{timestamp_str}"
        expected_sig = hashlib.sha256(f"{expected_payload}:{SECRET_KEY}".encode('utf-8')).hexdigest()
        
        if secrets.compare_digest(signature, expected_sig):
            return username
    except Exception:
        pass
        
    return None
