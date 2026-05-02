import sys, traceback
import db
from utils.auth import hash_password
from utils.helpers import generate_otp, in_minutes

full_name = "Test"
email = "test100@slotsy.com"
password = "Password123!"
role = "customer"

try:
    pw_hash = hash_password(password)
    user_id = db.execute(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
        (full_name, email, pw_hash, role),
        fetch="lastrowid",
    )
    user = db.execute("SELECT id, full_name, email, role FROM users WHERE id=%s", (user_id,), fetch="one")

    db.execute("UPDATE otp_verifications SET is_used=1 WHERE user_id=%s", (user_id,))
    otp = generate_otp()
    db.execute(
        "INSERT INTO otp_verifications (user_id, otp_code, expires_at) VALUES (%s, %s, %s)",
        (user_id, otp, in_minutes(10)),
    )

    if role == "customer":
        db.execute("INSERT IGNORE INTO user_preferences (user_id) VALUES (%s)", (user_id,))
    print("ALL SUCCESS")
except Exception as e:
    traceback.print_exc()
