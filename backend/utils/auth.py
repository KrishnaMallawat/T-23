import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from config import JWT_SECRET, JWT_EXPIRY_HOURS


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


# ── Route decorators ──────────────────────────────────────────────────────────

def _extract_payload():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, jsonify({"error": "Missing or invalid Authorization header"}), 401
    try:
        payload = decode_token(auth.split(" ", 1)[1])
        return payload, None, None
    except jwt.ExpiredSignatureError:
        return None, jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return None, jsonify({"error": "Invalid token"}), 401


def login_required(f):
    """Require any authenticated user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        payload, err_resp, status = _extract_payload()
        if err_resp:
            return err_resp, status
        request.user_id   = int(payload["sub"])
        request.user_role = payload["role"]
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Require the JWT role to be one of the specified roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            payload, err_resp, status = _extract_payload()
            if err_resp:
                return err_resp, status
            if payload["role"] not in roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            request.user_id   = int(payload["sub"])
            request.user_role = payload["role"]
            return f(*args, **kwargs)
        return decorated
    return decorator
