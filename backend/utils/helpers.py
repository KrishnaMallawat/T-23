import random
import secrets
from datetime import datetime, timezone, timedelta


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of given length."""
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def generate_reset_token() -> str:
    """Generate a cryptographically secure URL-safe reset token."""
    return secrets.token_urlsafe(32)


def generate_share_token() -> str:
    """Generate a UUID-like share token for unpublished appointments."""
    return secrets.token_urlsafe(24)


def now_local() -> datetime:
    return datetime.now()


def in_minutes(n: int) -> datetime:
    return now_local() + timedelta(minutes=n)


def success(data: dict | list, status: int = 200):
    from flask import jsonify
    return jsonify({"success": True, "data": data}), status


def error(message: str, status: int = 400):
    from flask import jsonify
    return jsonify({"success": False, "error": message}), status
