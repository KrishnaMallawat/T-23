"""
Full end-to-end test of every auth endpoint.
Runs against the LIVE server on port 5000.
"""
import urllib.request
import json
import time
import random
import string

BASE = "http://127.0.0.1:5000"

def post(path, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

# Generate a unique email for this test
rand = ''.join(random.choices(string.ascii_lowercase, k=6))
test_email = f"test_{rand}@testmail.com"

print("=" * 60)
print(f"TEST EMAIL: {test_email}")
print("=" * 60)

# 1. SIGNUP
print("\n--- 1. SIGNUP ---")
status, data = post("/api/auth/signup", {
    "full_name": "Test User",
    "email": test_email,
    "password": "TestPass123!",
    "role": "customer"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 2. LOGIN (should fail - not verified)
print("\n--- 2. LOGIN (before verify, should fail 403) ---")
status, data = post("/api/auth/login", {
    "email": test_email,
    "password": "TestPass123!"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 3. LOGIN (wrong password, should fail 401)
print("\n--- 3. LOGIN (wrong password, should fail 401) ---")
status, data = post("/api/auth/login", {
    "email": test_email,
    "password": "WrongPassword"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 4. RESEND OTP
print("\n--- 4. RESEND OTP ---")
time.sleep(1.5)  # avoid 60s cooldown from signup
status, data = post("/api/auth/resend-otp", {
    "email": test_email
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 5. VERIFY OTP (wrong code)
print("\n--- 5. VERIFY OTP (wrong code, should fail) ---")
status, data = post("/api/auth/verify-otp", {
    "email": test_email,
    "otp": "000000"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 6. Get real OTP from DB
print("\n--- 6. GET REAL OTP FROM DB ---")
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import db
row = db.execute(
    "SELECT otp_code FROM otp_verifications WHERE user_id=(SELECT id FROM users WHERE email=%s) AND is_used=0 ORDER BY created_at DESC LIMIT 1",
    (test_email,), fetch="one"
)
real_otp = row["otp_code"] if row else "NONE"
print(f"  Real OTP: {real_otp}")

# 7. VERIFY OTP (correct)
print("\n--- 7. VERIFY OTP (correct) ---")
status, data = post("/api/auth/verify-otp", {
    "email": test_email,
    "otp": real_otp
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")
token = data.get("data", {}).get("token", "")

# 8. LOGIN (should succeed now)
print("\n--- 8. LOGIN (after verify, should succeed) ---")
status, data = post("/api/auth/login", {
    "email": test_email,
    "password": "TestPass123!"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 9. FORGOT PASSWORD
print("\n--- 9. FORGOT PASSWORD ---")
status, data = post("/api/auth/forgot-password", {
    "email": test_email
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 10. Get reset token from DB
print("\n--- 10. GET RESET TOKEN FROM DB ---")
row = db.execute(
    "SELECT token FROM password_reset_tokens WHERE user_id=(SELECT id FROM users WHERE email=%s) AND is_used=0 ORDER BY created_at DESC LIMIT 1",
    (test_email,), fetch="one"
)
reset_token = row["token"] if row else "NONE"
print(f"  Reset Token: {reset_token[:20]}...")

# 11. RESET PASSWORD
print("\n--- 11. RESET PASSWORD ---")
status, data = post("/api/auth/reset-password", {
    "token": reset_token,
    "new_password": "NewPass456!"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 12. LOGIN with new password
print("\n--- 12. LOGIN (with new password, should succeed) ---")
status, data = post("/api/auth/login", {
    "email": test_email,
    "password": "NewPass456!"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# 13. LOGIN with old password (should fail)
print("\n--- 13. LOGIN (with old password, should fail 401) ---")
status, data = post("/api/auth/login", {
    "email": test_email,
    "password": "TestPass123!"
})
print(f"  Status: {status}")
print(f"  Response: {json.dumps(data, indent=2)}")

# Cleanup
print("\n--- CLEANUP ---")
db.execute("DELETE FROM password_reset_tokens WHERE user_id=(SELECT id FROM users WHERE email=%s)", (test_email,))
db.execute("DELETE FROM otp_verifications WHERE user_id=(SELECT id FROM users WHERE email=%s)", (test_email,))
db.execute("DELETE FROM user_preferences WHERE user_id=(SELECT id FROM users WHERE email=%s)", (test_email,))
db.execute("DELETE FROM users WHERE email=%s", (test_email,))
print("  Cleaned up test user.")
print("\n" + "=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
