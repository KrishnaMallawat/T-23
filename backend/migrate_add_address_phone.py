import sys
sys.path.insert(0, '.')
import db

# Check if columns exist first
cols = db.execute("DESCRIBE provider_info", fetch="all")
existing = {c['Field'] for c in cols}
print("Existing columns:", existing)

if 'address' not in existing:
    db.execute("ALTER TABLE provider_info ADD COLUMN address VARCHAR(300) NULL")
    print("Added: address")
else:
    print("Already exists: address")

if 'phone' not in existing:
    db.execute("ALTER TABLE provider_info ADD COLUMN phone VARCHAR(30) NULL")
    print("Added: phone")
else:
    print("Already exists: phone")

print("Done.")
