import db

queries = [
    "ALTER TABLE appointment_types ADD COLUMN image_url VARCHAR(500) NULL",
    "ALTER TABLE appointment_questions ADD COLUMN question_type ENUM('text', 'mcq') DEFAULT 'text'",
    "ALTER TABLE appointment_questions ADD COLUMN options JSON NULL"
]

for q in queries:
    try:
        db.execute(q)
        print("Success:", q)
    except Exception as e:
        print("Error:", q, "->", e)
