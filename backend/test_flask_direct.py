from app import app
import json

client = app.test_client()
response = client.post('/api/auth/signup', 
    data=json.dumps({'full_name':'Test User', 'email':'test200@slotsy.com', 'password':'Password123!', 'role':'customer'}),
    content_type='application/json'
)
print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.get_data(as_text=True))
