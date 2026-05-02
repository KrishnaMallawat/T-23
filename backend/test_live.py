from app import app
import threading, time
import urllib.request, json

def run_server():
    app.run(host="127.0.0.1", port=5001, debug=False, use_reloader=False)

t = threading.Thread(target=run_server)
t.daemon = True
t.start()

time.sleep(2) # wait for server to start

req = urllib.request.Request('http://127.0.0.1:5001/api/auth/login', 
    data=json.dumps({'email':'admin@slotsy.com', 'password':'Password123!'}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req).read().decode('utf-8')
    print('SUCCESS:', resp)
except Exception as e:
    print('ERROR:', getattr(e, 'read', lambda: str(e))())
