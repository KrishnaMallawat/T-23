import db
from utils.auth import hash_password
from utils.helpers import generate_share_token
from datetime import datetime, timedelta, date

def reset_db():
    print("Clearing existing data...")
    db.execute("SET FOREIGN_KEY_CHECKS = 0")
    tables = [
        "provider_behavioral_scores", "appointment_feedback", "booking_answers",
        "bookings", "slots", "appointment_questions", "working_hours",
        "appointment_types", "provider_info", "user_preferences",
        "password_reset_tokens", "otp_verifications", "users"
    ]
    for table in tables:
        db.execute(f"DELETE FROM {table}")
    db.execute("SET FOREIGN_KEY_CHECKS = 1")
    
    # Recreate default admin
    db.execute("""
        INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified)
        VALUES ('System Admin', 'admin@curatedslot.com', %s, 'admin', 1, 1)
    """, (hash_password("Admin@123"),))

def seed():
    print("Seeding CuratedSlot database...")
    reset_db()

    # Providers data
    providers = [
        {
            "name": "GreenBox Turf", "email": "turf@curatedslot.com", "role": "organiser",
            "bio": "Premium 5v5 and 7v7 artificial grass football and cricket turf.",
            "parking": 1, "wheelchair": 1, "noise": "loud",
            "punc": 4.8, "qual": 4.5, "env": 4.9, "reviews": 120,
            "services": [
                {"title": "1 Hour Turf Booking", "duration": 60, "price": 1200, "capacity": 1},
                {"title": "2 Hour Turf Booking", "duration": 120, "price": 2000, "capacity": 1}
            ]
        },
        {
            "name": "Smash Badminton Court", "email": "badminton@curatedslot.com", "role": "organiser",
            "bio": "Professional wooden indoor badminton courts with LED lighting.",
            "parking": 1, "wheelchair": 1, "noise": "moderate",
            "punc": 4.9, "qual": 4.7, "env": 4.8, "reviews": 85,
            "services": [
                {"title": "Court 1 (Singles/Doubles)", "duration": 60, "price": 400, "capacity": 1}
            ]
        },
        {
            "name": "Ace Pickleball Arena", "email": "pickleball@curatedslot.com", "role": "organiser",
            "bio": "Dedicated outdoor pickleball courts for all skill levels.",
            "parking": 1, "wheelchair": 0, "noise": "loud",
            "punc": 4.5, "qual": 4.2, "env": 4.5, "reviews": 40,
            "services": [
                {"title": "Open Play Session", "duration": 90, "price": 250, "capacity": 4}
            ]
        },
        {
            "name": "Dr. Smith Dental Clinic", "email": "dentist@curatedslot.com", "role": "organiser",
            "bio": "Advanced dental care, root canals, and cosmetic dentistry.",
            "parking": 0, "wheelchair": 1, "noise": "quiet",
            "punc": 4.1, "qual": 4.9, "env": 4.8, "reviews": 210,
            "services": [
                {"title": "General Checkup", "duration": 30, "price": 500, "capacity": 1},
                {"title": "Teeth Cleaning", "duration": 45, "price": 1500, "capacity": 1}
            ]
        },
        {
            "name": "Mindful Therapy Center", "email": "therapy@curatedslot.com", "role": "organiser",
            "bio": "Safe, confidential space for cognitive behavioral therapy and counseling.",
            "parking": 1, "wheelchair": 1, "noise": "quiet",
            "punc": 4.9, "qual": 5.0, "env": 5.0, "reviews": 95,
            "services": [
                {"title": "Initial Consultation", "duration": 60, "price": 2000, "capacity": 1},
                {"title": "Follow-up Session", "duration": 45, "price": 1500, "capacity": 1}
            ]
        },
        {
            "name": "Elite Salon & Spa", "email": "salon@curatedslot.com", "role": "organiser",
            "bio": "Luxury hair styling, coloring, and spa treatments.",
            "parking": 1, "wheelchair": 1, "noise": "moderate",
            "punc": 3.8, "qual": 4.6, "env": 4.7, "reviews": 320,
            "services": [
                {"title": "Haircut & Styling", "duration": 45, "price": 800, "capacity": 1},
                {"title": "Full Spa Package", "duration": 120, "price": 3500, "capacity": 1}
            ]
        },
        {
            "name": "Classic Barber Shop", "email": "barber@curatedslot.com", "role": "organiser",
            "bio": "Old-school straight razor shaves and modern fades.",
            "parking": 0, "wheelchair": 0, "noise": "moderate",
            "punc": 4.5, "qual": 4.8, "env": 4.2, "reviews": 150,
            "services": [
                {"title": "Men's Fade", "duration": 30, "price": 300, "capacity": 1},
                {"title": "Beard Trim & Shape", "duration": 15, "price": 150, "capacity": 1}
            ]
        }
    ]

    pw_hash = hash_password("Password_123")
    today = date.today()

    for p in providers:
        # Create user
        uid = db.execute(
            "INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified) VALUES (%s,%s,%s,%s,1,1)",
            (p["name"], p["email"], pw_hash, "organiser"), fetch="lastrowid"
        )
        
        # Create provider info
        db.execute(
            "INSERT INTO provider_info (provider_id, bio, has_parking, is_wheelchair_accessible, noise_level) VALUES (%s,%s,%s,%s,%s)",
            (uid, p["bio"], p["parking"], p["wheelchair"], p["noise"])
        )
        
        # Create scores
        db.execute(
            "INSERT INTO provider_behavioral_scores (provider_id, punctuality_score, quality_score, environment_score, total_reviews) VALUES (%s,%s,%s,%s,%s)",
            (uid, p["punc"], p["qual"], p["env"], p["reviews"])
        )

        # Working hours (Mon-Sun 9 AM to 8 PM)
        for day in range(7):
            db.execute(
                "INSERT INTO working_hours (organiser_id, day_of_week, start_time, end_time, is_active) VALUES (%s,%s,'09:00','20:00',1)",
                (uid, day)
            )

        # Services and Slots
        for s in p["services"]:
            sid = db.execute(
                """
                INSERT INTO appointment_types 
                (organiser_id, title, description, duration_mins, is_published, requires_payment, payment_amount, max_capacity, share_token) 
                VALUES (%s,%s,%s,%s,1,%s,%s,%s,%s)
                """,
                (uid, s["title"], "Book your " + s["title"].lower(), s["duration"], 
                 1 if s["price"] > 0 else 0, s["price"], s["capacity"], generate_share_token()),
                fetch="lastrowid"
            )

            # Add a question for specific ones
            if "Badminton" in p["name"]:
                db.execute("INSERT INTO appointment_questions (appointment_type_id, question_text, is_required) VALUES (%s, 'What is your skill level? (Beginner/Intermediate/Pro)', 1)", (sid,))
            if "Therapy" in p["name"]:
                db.execute("INSERT INTO appointment_questions (appointment_type_id, question_text, is_required) VALUES (%s, 'Is there a specific topic you would like to focus on today?', 0)", (sid,))
            
            # Generate slots for the next 3 days (10 AM and 2 PM just as samples to save DB space)
            for day_offset in range(3):
                target_date = today + timedelta(days=day_offset)
                
                # Morning slot
                slot1_start = datetime.combine(target_date, datetime.strptime("10:00", "%H:%M").time())
                slot1_end = slot1_start + timedelta(minutes=s["duration"])
                db.execute(
                    "INSERT INTO slots (appointment_type_id, organiser_id, slot_start, slot_end, capacity, status) VALUES (%s,%s,%s,%s,%s,'available')",
                    (sid, uid, slot1_start, slot1_end, s["capacity"])
                )

                # Afternoon slot
                slot2_start = datetime.combine(target_date, datetime.strptime("14:00", "%H:%M").time())
                slot2_end = slot2_start + timedelta(minutes=s["duration"])
                db.execute(
                    "INSERT INTO slots (appointment_type_id, organiser_id, slot_start, slot_end, capacity, status) VALUES (%s,%s,%s,%s,%s,'available')",
                    (sid, uid, slot2_start, slot2_end, s["capacity"])
                )

    print("✅ Seed completed! Log in with turf@curatedslot.com / Password_123 or explore as a customer.")

if __name__ == "__main__":
    seed()
