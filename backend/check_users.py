import mysql.connector

conn = mysql.connector.connect(host="localhost", user="root", password="Passwordd_123", database="curatedslot")
cur = conn.cursor(dictionary=True)

# Check which users exist and their verification status
cur.execute("SELECT email, is_verified, is_active, role FROM users ORDER BY id DESC LIMIT 10")
rows = cur.fetchall()
print("Recent users:")
for r in rows:
    status = "VERIFIED" if r["is_verified"] else "NOT VERIFIED"
    print(f"  {r['email']} | {r['role']} | {status} | active={r['is_active']}")

cur.close()
conn.close()
