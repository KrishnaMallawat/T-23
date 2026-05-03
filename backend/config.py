import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", 3306))
DB_NAME     = os.getenv("DB_NAME", "curatedslot")
DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET       = os.getenv("JWT_SECRET")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required. Set it in .env")

# ── Email ─────────────────────────────────────────────────────────────────────
GMAIL_USER         = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

# ── App ───────────────────────────────────────────────────────────────────────
APP_NAME     = os.getenv("APP_NAME", "CuratedSlot")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FLASK_DEBUG  = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# ── Razorpay ──────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
