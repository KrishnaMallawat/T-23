import requests
import random

email = f"smoketest_{random.randint(1000,9999)}@test.com"
print(f"Testing signup with {email}")
resp = requests.post("http://127.0.0.1:5000/api/auth/signup", json={
    "full_name": "Test User",
    "email": email,
    "password": "Password123",
    "role": "customer"
})
print("Signup status:", resp.status_code)
print("Response:", resp.text)
