import requests, json

BASE = "http://127.0.0.1:5000/api"
OK = "\033[92m OK\033[0m"
FAIL = "\033[91m FAIL\033[0m"

def chk(label, r, expected=200):
    status = OK if r.status_code == expected else FAIL
    print(f"[{r.status_code}]{status} {label}")
    if r.status_code not in (expected, 200, 201, 204):
        print("       ", r.text[:200])
    return r

# 1. Health
chk("GET /health", requests.get(f"{BASE}/health"))

# 2. Public endpoints
chk("GET /services", requests.get(f"{BASE}/services"))
chk("GET /providers", requests.get(f"{BASE}/providers"))

# 3. Sign up a fresh test user
import random, string
suffix = ''.join(random.choices(string.digits, k=6))
email = f"smoketest{suffix}@test.com"
r = chk("POST /auth/signup", requests.post(f"{BASE}/auth/signup", json={
    "full_name": "Smoke Test",
    "email": email,
    "password": "password123",
    "role": "customer"
}), 201)

# Skip OTP — directly verify the user in DB
import mysql.connector
conn = mysql.connector.connect(host="localhost", user="root", password="Passwordd_123", database="curatedslot")
cur = conn.cursor()
cur.execute("UPDATE users SET is_verified=1 WHERE email=%s", (email,))
conn.commit()
cur.close(); conn.close()

# 4. Login
r = chk("POST /auth/login", requests.post(f"{BASE}/auth/login", json={"email": email, "password": "password123"}))
token = r.json().get("data", {}).get("token", "")
auth = {"Authorization": f"Bearer {token}"}

# 5. Authenticated endpoints
chk("GET /bookings/mine", requests.get(f"{BASE}/bookings/mine", headers=auth))
chk("GET /users/me", requests.get(f"{BASE}/users/me", headers=auth))
chk("GET /users/me/preferences", requests.get(f"{BASE}/users/me/preferences", headers=auth))

# 6. Provider detail — the main crash point
providers = requests.get(f"{BASE}/providers").json().get("data", [])
if providers:
    pid = providers[0]["id"]
    chk(f"GET /providers/{pid}", requests.get(f"{BASE}/providers/{pid}", headers=auth))
else:
    print("[SKIP] No providers to test detail endpoint")

print("\nDone.")
