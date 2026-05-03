import requests

resp = requests.get("http://127.0.0.1:5000/api/providers/53")
print("Status:", resp.status_code)
print("Response:", resp.text[:200])
