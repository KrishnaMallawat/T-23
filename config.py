import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", 5432))
DB_NAME     = os.getenv("DB_NAME", "slotsy")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

JWT_SECRET       = os.getenv("JWT_SECRET", "change_me")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

GMAIL_USER         = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

APP_NAME     = os.getenv("APP_NAME", "SlotSync")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")
FLASK_DEBUG  = os.getenv("FLASK_DEBUG", "false").lower() == "true"
