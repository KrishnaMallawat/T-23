import sys
sys.path.insert(0, ".")
from utils.email import send_password_reset_email

try:
    print("Sending reset email...")
    send_password_reset_email("infernodeadly224@gmail.com", "Test User", "dummytoken123")
    print("Sent successfully!")
except Exception as e:
    print(f"Error: {e}")
