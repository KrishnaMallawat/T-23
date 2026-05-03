import smtplib, sys, os
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv()

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

print(f"Testing SMTP with user: {GMAIL_USER}")
print(f"App password set: {'YES' if GMAIL_APP_PASSWORD else 'NO'}")

try:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        print("LOGIN SUCCESS - SMTP works!")
        
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "CuratedSlot Test Email"
        msg["From"] = GMAIL_USER
        msg["To"] = GMAIL_USER  # send to self as test
        msg.attach(MIMEText("<h1>Test email from CuratedSlot backend</h1>", "html"))
        server.sendmail(GMAIL_USER, GMAIL_USER, msg.as_string())
        print(f"TEST EMAIL SENT to {GMAIL_USER}!")
except smtplib.SMTPAuthenticationError as e:
    print(f"AUTH FAILED: {e}")
    print("\nFix: Go to https://myaccount.google.com/apppasswords and create a new App Password")
except Exception as e:
    print(f"SMTP ERROR: {type(e).__name__}: {e}")
