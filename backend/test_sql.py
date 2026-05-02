import db
print(db.execute("SELECT u.id FROM users u JOIN provider_info pi ON pi.provider_id=u.id WHERE u.id=6 AND u.role='organiser' AND u.is_active=1", fetch='one'))
