import requests

# Test with a known seeded user email
resp = requests.post("http://127.0.0.1:5000/api/auth/forgot-password", json={
    "email": "infernodeadly224@gmail.com"
})
print("Status:", resp.status_code)
print("Response:", resp.text)

