import app
from utils.auth import create_token
client = app.app.test_client()
token = create_token(2, 'customer')
res = client.get('/api/providers/6', headers={'Authorization': f'Bearer {token}'})
print("STATUS:", res.status_code)
print("BODY:", res.get_data(as_text=True))
