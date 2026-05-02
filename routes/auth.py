import re
import mysql.connector.errors
from flask import Blueprint, request
import db
import random
from utils.auth import hash_password, check_password, create_token
from utils.email import send_otp_email, send_password_reset_email
from utils.helpers import generate_otp, generate_reset_token, in_minutes, success, error

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── POST /api/auth/signup ─────────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data      = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email     = (data.get("email") or "").strip().lower()
    password  = data.get("password") or ""
    role      = (data.get("role") or "customer").strip().lower()
    user_id = (full_name.upper()[:1] + role.upper()[:1] + random.randit(0,999) for _ in range(3))
    
    if not full_name or not email or not password:
        return error("full_name, email, and password are required")
    if not EMAIL_RE.match(email):
        return error("Invalid email format")
    if len(password) < 8:
        return error("Password must be at least 8 characters")
    if role not in ("customer", "organiser"):
        return error("Role must be 'customer' or 'organiser'")

    existing = db.execute("SELECT id FROM users WHERE email = %s", (email,), fetch="one")
    if existing:
        return error("An account with this email already exists", 409)

    pw_hash = hash_password(password)
    user_id = db.execute(
        "INSERT INTO users (id, full_name, email, password_hash, role) VALUES (%s, %s, %s, %s, %s)",
        (user_id, full_name, email, pw_hash, role),
        fetch="lastrowid",
    )
    user = db.execute("SELECT id, full_name, email, role FROM users WHERE id=%s", (user_id,), fetch="one")

    # Invalidate old OTPs
    db.execute("UPDATE otp_verifications SET is_used=1 WHERE user_id=%s", (user_id,))
    otp = generate_otp()
    db.execute(
        "INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (%s, %s, %s)",
        (user_id, otp, in_minutes(10)),
    )

    try:
        send_otp_email(email, full_name, otp)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    # Seed role-specific tables
    if role == "customer":
        db.execute("INSERT IGNORE INTO user_preferences (user_id) VALUES (%s)", (user_id,))
    if role == "organiser":
        db.execute("INSERT IGNORE INTO provider_info (provider_id) VALUES (%s)", (user_id,))
        db.execute("INSERT IGNORE INTO provider_behavioral_scores (provider_id) VALUES (%s)", (user_id,))

    return success({
        "message": "Account created. Check your email for the OTP.",
        "user_id": user["id"],
        "email": email,
    }, 201)


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data   = request.get_json(silent=True) or {}
    email  = (data.get("email") or "").strip().lower()
    otp_in = (data.get("otp") or "").strip()

    if not email or not otp_in:
        return error("email and otp are required")

    user = db.execute(
        "SELECT id, full_name, role, is_verified FROM users WHERE email=%s AND is_active=1",
        (email,), fetch="one",
    )
    if not user:
        return error("User not found", 404)
    if user["is_verified"]:
        return error("Account is already verified")

    row = db.execute(
        """
        SELECT id FROM otp_verifications
        WHERE user_id=%s AND otp_code=%s AND is_used=0 AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
        """,
        (user["id"], otp_in), fetch="one",
    )
    if not row:
        return error("Invalid or expired OTP", 401)

    db.execute("UPDATE otp_verifications SET is_used=1 WHERE id=%s", (row["id"],))
    db.execute("UPDATE users SET is_verified=1 WHERE id=%s", (user["id"],))

    token = create_token(user["id"], user["role"])
    return success({
        "message": "Email verified successfully.",
        "token": token,
        "user": {"id": user["id"], "full_name": user["full_name"], "role": user["role"]},
    })

@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return error("email is required")

    user = db.execute(
        "SELECT id, full_name, is_verified FROM users WHERE email=%s AND is_active=1",
        (email,), fetch="one",
    )
    if not user:
        return error("User not found", 404)
    if user["is_verified"]:
        return error("Account is already verified")

    recent = db.execute(
        "SELECT id FROM otp_verifications WHERE user_id=%s AND created_at > NOW() - INTERVAL 60 SECOND ORDER BY created_at DESC LIMIT 1",
        (user["id"],), fetch="one",
    )
    if recent:
        return error("Please wait 60 seconds before requesting another OTP", 429)

    db.execute("UPDATE otp_verifications SET is_used=1 WHERE user_id=%s", (user["id"],))
    otp = generate_otp()
    db.execute(
        "INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (%s,%s,%s)",
        (user["id"], otp, in_minutes(10)),
    )
    try:
        send_otp_email(email, user["full_name"], otp)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    return success({"message": "A new OTP has been sent to your email."})

@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return error("email and password are required")

    user = db.execute(
        "SELECT id, full_name, email, password_hash, role, is_active, is_verified FROM users WHERE email=%s",
        (email,), fetch="one",
    )
    if not user or not check_password(password, user["password_hash"]):
        return error("Invalid email or password", 401)
    if not user["is_active"]:
        return error("Your account has been deactivated. Contact support.", 403)
    if not user["is_verified"]:
        return error("Please verify your email before logging in.", 403)

    token = create_token(user["id"], user["role"])
    return success({
        "token": token,
        "user": {"id": user["id"], "full_name": user["full_name"],
                 "email": user["email"], "role": user["role"]},
    })


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return error("email is required")

    GENERIC = "If that email is registered, a reset link has been sent."
    user = db.execute(
        "SELECT id, full_name FROM users WHERE email=%s AND is_active=1 AND is_verified=1",
        (email,), fetch="one",
    )
    if not user:
        return success({"message": GENERIC})

    db.execute(
        "UPDATE password_reset_tokens SET is_used=1 WHERE user_id=%s AND is_used=0",
        (user["id"],),
    )
    token = generate_reset_token()
    db.execute(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (%s,%s,%s)",
        (user["id"], token, in_minutes(15)),
    )
    try:
        send_password_reset_email(email, user["full_name"], token)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    return success({"message": GENERIC})


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data         = request.get_json(silent=True) or {}
    token        = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""

    if not token or not new_password:
        return error("token and new_password are required")
    if len(new_password) < 8:
        return error("Password must be at least 8 characters")

    row = db.execute(
        "SELECT id, user_id FROM password_reset_tokens WHERE token=%s AND is_used=0 AND expires_at > NOW()",
        (token,), fetch="one",
    )
    if not row:
        return error("Reset link is invalid or has expired", 400)

    pw_hash = hash_password(new_password)
    db.execute("UPDATE users SET password_hash=%s WHERE id=%s", (pw_hash, row["user_id"]))
    db.execute("UPDATE password_reset_tokens SET is_used=1 WHERE id=%s", (row["id"],))

    return success({"message": "Password updated successfully. You can now log in."})
