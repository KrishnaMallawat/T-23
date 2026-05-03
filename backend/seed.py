import db
from utils.auth import hash_password
from utils.helpers import generate_share_token
from datetime import datetime, timedelta, date
import random

# ── Indian Name Generator ─────────────────────────────────────────────────────
FIRST = ["Aarav","Aditi","Aditya","Akshay","Amit","Ananya","Aniket","Anjali","Arjun","Aryan",
    "Bhavna","Chetan","Deepa","Deepak","Dev","Diya","Gaurav","Harsh","Isha","Ishaan",
    "Jaya","Kabir","Kajal","Karan","Kavya","Krish","Lakshmi","Manish","Meera","Mohit",
    "Nandini","Neha","Nikhil","Nisha","Pooja","Priya","Rahul","Raj","Riya","Rohan",
    "Sakshi","Sanjay","Shreya","Siddharth","Sneha","Tanvi","Varun","Vikram","Vishal","Zara"]
LAST = ["Agarwal","Bhat","Chopra","Desai","Dubey","Ghosh","Gupta","Iyer","Jain","Joshi",
    "Kapoor","Khan","Kumar","Malhotra","Mehta","Mishra","Nair","Pandey","Patel","Rao",
    "Reddy","Shah","Sharma","Singh","Srinivasan","Tiwari","Trivedi","Varma","Verma","Yadav"]

REVIEWS = [
    "Great experience, very professional!", "Loved it, will come back again.",
    "Good service but a bit delayed.", "Excellent quality and ambiance.",
    "Average experience, nothing special.", "Highly recommended!",
    "The staff was very friendly.", "Clean and well-maintained place.",
    "Value for money!", "Could be better, but overall okay.",
    "Absolutely fantastic service!", "Will definitely recommend to friends.",
    "Punctual and efficient.", "A bit crowded but good service.",
    "Top-notch quality!", "Needs improvement in cleanliness.",
    "Very relaxing and calming.", "Professional and courteous staff.",
    "Best in the city!", "Decent experience overall."
]

STYLES = ["professional", "friendly", "technical", "casual"]

# ── Business Data ─────────────────────────────────────────────────────────────
BUSINESSES = [
    # SPORTS (5)
    {"name":"GreenBox Turf","email":"turf@curatedslot.com","cat":"Sports","bio":"Premium 5v5 and 7v7 artificial grass football and cricket turf.","parking":1,"wheelchair":1,"noise":"loud",
     "services":[{"t":"1 Hour Turf Booking","d":60,"p":1200,"c":1},{"t":"2 Hour Turf Booking","d":120,"p":2000,"c":1},{"t":"Kids Football Camp","d":90,"p":500,"c":10}]},
    {"name":"Smash Badminton Court","email":"badminton@curatedslot.com","cat":"Sports","bio":"Professional wooden indoor badminton courts with LED lighting.","parking":1,"wheelchair":1,"noise":"moderate",
     "services":[{"t":"Court 1 (Singles/Doubles)","d":60,"p":400,"c":1},{"t":"Coaching Session","d":90,"p":800,"c":4}]},
    {"name":"Ace Pickleball Arena","email":"pickleball@curatedslot.com","cat":"Sports","bio":"Dedicated outdoor pickleball courts for all skill levels.","parking":1,"wheelchair":0,"noise":"loud",
     "services":[{"t":"Open Play Session","d":90,"p":250,"c":4},{"t":"Private Court Rental","d":60,"p":600,"c":1}]},
    {"name":"Striker Cricket Academy","email":"cricket@curatedslot.com","cat":"Sports","bio":"Indoor cricket nets with bowling machines and coaching.","parking":1,"wheelchair":0,"noise":"loud",
     "services":[{"t":"Net Practice (1 hr)","d":60,"p":350,"c":1},{"t":"Bowling Machine Session","d":30,"p":200,"c":1},{"t":"Group Coaching","d":120,"p":500,"c":8}]},
    {"name":"AquaZone Swimming Pool","email":"swim@curatedslot.com","cat":"Sports","bio":"Olympic-size heated pool with certified trainers.","parking":1,"wheelchair":1,"noise":"moderate",
     "services":[{"t":"Lap Swimming (1 hr)","d":60,"p":300,"c":1},{"t":"Swimming Lesson","d":45,"p":700,"c":4},{"t":"Pool Party Booking","d":180,"p":5000,"c":20}]},
    # HEALTHCARE (5)
    {"name":"Dr. Smith Dental Clinic","email":"dentist@curatedslot.com","cat":"Healthcare","bio":"Advanced dental care, root canals, and cosmetic dentistry.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"General Checkup","d":30,"p":500,"c":1},{"t":"Teeth Cleaning","d":45,"p":1500,"c":1},{"t":"Root Canal Consultation","d":60,"p":2000,"c":1}]},
    {"name":"Mindful Therapy Center","email":"therapy@curatedslot.com","cat":"Healthcare","bio":"Safe, confidential space for cognitive behavioral therapy and counseling.","parking":1,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Initial Consultation","d":60,"p":2000,"c":1},{"t":"Follow-up Session","d":45,"p":1500,"c":1},{"t":"Group Therapy","d":90,"p":800,"c":6}]},
    {"name":"VisionCare Eye Hospital","email":"eye@curatedslot.com","cat":"Healthcare","bio":"Complete eye care from checkups to LASIK surgery consultations.","parking":1,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Eye Exam","d":30,"p":600,"c":1},{"t":"Contact Lens Fitting","d":45,"p":1200,"c":1}]},
    {"name":"PhysioFit Rehab Center","email":"physio@curatedslot.com","cat":"Healthcare","bio":"Sports injury rehab, post-surgery recovery, and chronic pain management.","parking":1,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Assessment Session","d":45,"p":1000,"c":1},{"t":"Physiotherapy Session","d":60,"p":1500,"c":1},{"t":"Dry Needling","d":30,"p":800,"c":1}]},
    {"name":"Dr. Mehta Dermatology","email":"derma@curatedslot.com","cat":"Healthcare","bio":"Skin care, acne treatment, laser therapy, and hair fall solutions.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Skin Consultation","d":30,"p":700,"c":1},{"t":"Laser Treatment","d":45,"p":3000,"c":1},{"t":"Chemical Peel","d":60,"p":2500,"c":1}]},
    # BEAUTY (4)
    {"name":"Elite Salon & Spa","email":"salon@curatedslot.com","cat":"Beauty","bio":"Luxury hair styling, coloring, and spa treatments.","parking":1,"wheelchair":1,"noise":"moderate",
     "services":[{"t":"Haircut & Styling","d":45,"p":800,"c":1},{"t":"Full Spa Package","d":120,"p":3500,"c":1},{"t":"Bridal Makeup","d":90,"p":5000,"c":1}]},
    {"name":"Classic Barber Shop","email":"barber@curatedslot.com","cat":"Beauty","bio":"Old-school straight razor shaves and modern fades.","parking":0,"wheelchair":0,"noise":"moderate",
     "services":[{"t":"Men's Fade","d":30,"p":300,"c":1},{"t":"Beard Trim & Shape","d":15,"p":150,"c":1},{"t":"Hot Towel Shave","d":30,"p":250,"c":1}]},
    {"name":"Glow Skin Studio","email":"glow@curatedslot.com","cat":"Beauty","bio":"Facials, threading, waxing, and premium skincare treatments.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Gold Facial","d":60,"p":1200,"c":1},{"t":"Full Body Waxing","d":90,"p":2000,"c":1},{"t":"Eyebrow Threading","d":15,"p":100,"c":1}]},
    {"name":"NailArt Lounge","email":"nails@curatedslot.com","cat":"Beauty","bio":"Gel nails, nail art, manicures, and pedicures.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Gel Manicure","d":45,"p":600,"c":1},{"t":"Pedicure","d":45,"p":500,"c":1},{"t":"Nail Art Design","d":60,"p":900,"c":1}]},
    # EDUCATION (4)
    {"name":"BrightMind Tutors","email":"tutor@curatedslot.com","cat":"Education","bio":"JEE, NEET, and board exam coaching with top-ranked faculty.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"JEE Maths (1-on-1)","d":60,"p":1000,"c":1},{"t":"NEET Biology Batch","d":90,"p":600,"c":10},{"t":"Board Exam Doubt Session","d":45,"p":400,"c":1}]},
    {"name":"CodeCraft Academy","email":"code@curatedslot.com","cat":"Education","bio":"Learn Python, Web Dev, Data Science, and AI with hands-on projects.","parking":1,"wheelchair":1,"noise":"moderate",
     "services":[{"t":"Python Fundamentals","d":90,"p":800,"c":8},{"t":"Web Dev Bootcamp","d":120,"p":1200,"c":6},{"t":"AI/ML Workshop","d":180,"p":2000,"c":10}]},
    {"name":"Raga Music School","email":"music@curatedslot.com","cat":"Education","bio":"Classical and modern music lessons: guitar, tabla, vocals, and piano.","parking":0,"wheelchair":0,"noise":"loud",
     "services":[{"t":"Guitar Lesson","d":45,"p":500,"c":1},{"t":"Vocal Training","d":60,"p":600,"c":1},{"t":"Tabla Class","d":45,"p":400,"c":1}]},
    {"name":"Canvas Art Studio","email":"art@curatedslot.com","cat":"Education","bio":"Painting, sketching, pottery, and creative workshops for all ages.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Sketching Workshop","d":90,"p":700,"c":6},{"t":"Oil Painting Class","d":120,"p":1200,"c":4},{"t":"Pottery Session","d":90,"p":900,"c":4}]},
    # LIFESTYLE (4)
    {"name":"ZenYoga Studio","email":"yoga@curatedslot.com","cat":"Lifestyle","bio":"Hatha, Vinyasa, and meditation sessions in a serene environment.","parking":1,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Morning Yoga","d":60,"p":300,"c":15},{"t":"Power Yoga","d":75,"p":400,"c":10},{"t":"Meditation & Breathwork","d":45,"p":250,"c":12}]},
    {"name":"IronPulse Gym","email":"gym@curatedslot.com","cat":"Lifestyle","bio":"Fully equipped gym with personal trainers and group fitness classes.","parking":1,"wheelchair":1,"noise":"loud",
     "services":[{"t":"Personal Training","d":60,"p":800,"c":1},{"t":"CrossFit Class","d":45,"p":400,"c":12},{"t":"Zumba Session","d":60,"p":300,"c":15}]},
    {"name":"Serenity Spa & Wellness","email":"wellness@curatedslot.com","cat":"Lifestyle","bio":"Ayurvedic massages, aromatherapy, and holistic wellness programs.","parking":1,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Abhyanga Massage","d":60,"p":1500,"c":1},{"t":"Aromatherapy","d":45,"p":1200,"c":1},{"t":"Shirodhara","d":75,"p":2000,"c":1}]},
    {"name":"NutriLife Diet Clinic","email":"diet@curatedslot.com","cat":"Lifestyle","bio":"Personalized diet plans, weight management, and sports nutrition.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Diet Consultation","d":45,"p":800,"c":1},{"t":"Body Composition Analysis","d":30,"p":500,"c":1},{"t":"Follow-up Plan","d":30,"p":400,"c":1}]},
    # OTHER (3)
    {"name":"SnapShot Photography","email":"photo@curatedslot.com","cat":"Other","bio":"Professional photography studio for portraits, products, and events.","parking":1,"wheelchair":1,"noise":"moderate",
     "services":[{"t":"Portrait Session","d":60,"p":2000,"c":1},{"t":"Product Photography","d":120,"p":5000,"c":1}]},
    {"name":"PetCare Vet Clinic","email":"vet@curatedslot.com","cat":"Other","bio":"Complete veterinary care, vaccinations, grooming, and pet boarding.","parking":1,"wheelchair":0,"noise":"moderate",
     "services":[{"t":"General Checkup","d":30,"p":500,"c":1},{"t":"Vaccination","d":15,"p":300,"c":1},{"t":"Pet Grooming","d":60,"p":800,"c":1}]},
    {"name":"LegalEase Consultants","email":"legal@curatedslot.com","cat":"Other","bio":"Property law, startup registration, contracts, and legal advisory.","parking":0,"wheelchair":1,"noise":"quiet",
     "services":[{"t":"Legal Consultation","d":60,"p":2000,"c":1},{"t":"Document Review","d":45,"p":1500,"c":1}]},
]

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
    db.execute("""
        INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified)
        VALUES ('System Admin', 'admin@curatedslot.com', %s, 'admin', 1, 1)
    """, (hash_password("Admin@123"),))

def seed():
    print("Seeding CuratedSlot database (large)...")
    reset_db()

    pw_hash = hash_password("Password_123")
    today = date.today()

    # ── 500 Customers ─────────────────────────────────────────────────────────
    print("Creating 500 customers...")
    customer_ids = []
    used_emails = set()
    for i in range(500):
        fn = random.choice(FIRST)
        ln = random.choice(LAST)
        email = f"{fn.lower()}.{ln.lower()}{i}@example.com"
        if email in used_emails:
            email = f"{fn.lower()}{i}.{ln.lower()}@example.com"
        used_emails.add(email)
        uid = db.execute(
            "INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified) VALUES (%s,%s,%s,'customer',1,1)",
            (f"{fn} {ln}", email, pw_hash), fetch="lastrowid"
        )
        db.execute("INSERT INTO user_preferences (user_id, punctuality_weight, quality_weight, environment_weight, parking_weight, accessibility_weight) VALUES (%s,%s,%s,%s,%s,%s)",
            (uid, random.randint(10,100), random.randint(10,100), random.randint(10,100), random.randint(10,100), random.randint(10,100)))
        customer_ids.append(uid)

    # ── 25 Businesses ─────────────────────────────────────────────────────────
    print("Creating 25 businesses with services and slots...")
    all_slot_ids = []  # (slot_id, service_price, organiser_id, capacity)

    for p in BUSINESSES:
        uid = db.execute(
            "INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified) VALUES (%s,%s,%s,'organiser',1,1)",
            (p["name"], p["email"], pw_hash), fetch="lastrowid"
        )
        db.execute("INSERT INTO provider_info (provider_id, bio, has_parking, is_wheelchair_accessible, noise_level) VALUES (%s,%s,%s,%s,%s)",
            (uid, p["bio"], p["parking"], p["wheelchair"], p["noise"]))
        punc = round(random.uniform(3.5, 5.0), 2)
        qual = round(random.uniform(3.5, 5.0), 2)
        env  = round(random.uniform(3.5, 5.0), 2)
        db.execute("INSERT INTO provider_behavioral_scores (provider_id, punctuality_score, quality_score, environment_score, total_reviews) VALUES (%s,%s,%s,%s,%s)",
            (uid, punc, qual, env, random.randint(20, 350)))

        for day in range(7):
            db.execute("INSERT INTO working_hours (organiser_id, day_of_week, start_time, end_time, is_active) VALUES (%s,%s,'09:00','21:00',1)", (uid, day))

        for s in p["services"]:
            sid = db.execute("""
                INSERT INTO appointment_types (organiser_id, title, description, category, duration_mins, is_published, payment_requirement, payment_amount, max_capacity, share_token)
                VALUES (%s,%s,%s,%s,%s,1,%s,%s,%s,%s)
            """, (uid, s["t"], f"Book your {s['t'].lower()}", p["cat"], s["d"],
                  'mandatory_advance' if s["p"] > 0 else 'none', s["p"], s["c"], generate_share_token()),
                fetch="lastrowid")

            # Slots: 7 days, 4 slots/day (9AM, 11AM, 2PM, 4PM)
            for day_off in range(7):
                target = today + timedelta(days=day_off - 3)  # 3 days past + today + 3 future
                for hour in [9, 11, 14, 16]:
                    start = datetime.combine(target, datetime.strptime(f"{hour}:00", "%H:%M").time())
                    end = start + timedelta(minutes=s["d"])
                    slot_id = db.execute(
                        "INSERT INTO slots (appointment_type_id, organiser_id, slot_start, slot_end, capacity, status) VALUES (%s,%s,%s,%s,%s,'available')",
                        (sid, uid, start, end, s["c"]), fetch="lastrowid")
                    all_slot_ids.append((slot_id, s["p"], uid, s["c"]))

    # ── ~800 Bookings ─────────────────────────────────────────────────────────
    print("Creating ~800 bookings...")
    random.shuffle(all_slot_ids)
    booking_count = 0
    statuses_weights = ["confirmed"] * 40 + ["completed"] * 25 + ["pending"] * 20 + ["cancelled"] * 15
    booked_pairs = set()

    for slot_id, price, org_id, capacity in all_slot_ids:
        if booking_count >= 800:
            break
        num = random.randint(1, min(capacity, 3))
        custs = random.sample(customer_ids, min(num, len(customer_ids)))
        for cid in custs:
            if booking_count >= 800:
                break
            pair = (slot_id, cid)
            if pair in booked_pairs:
                continue
            booked_pairs.add(pair)
            status = random.choice(statuses_weights)
            pay_status = "paid" if (price > 0 and status in ("confirmed", "completed")) else "unpaid"
            booked_at = today - timedelta(days=random.randint(0, 14), hours=random.randint(0, 12))
            db.execute("""
                INSERT INTO bookings (slot_id, customer_id, status, payment_status, booked_at)
                VALUES (%s,%s,%s,%s,%s)
            """, (slot_id, cid, status, pay_status, booked_at))
            db.execute("UPDATE slots SET booked_count = booked_count + 1 WHERE id=%s", (slot_id,))
            booking_count += 1

    # ── ~150 Reviews on completed bookings ────────────────────────────────────
    print("Creating reviews on completed bookings...")
    completed = db.execute("SELECT id FROM bookings WHERE status='completed'", fetch="all")
    review_count = 0
    for row in (completed or []):
        if random.random() < 0.75 and review_count < 200:
            db.execute("""
                INSERT INTO appointment_feedback (booking_id, punctuality_rating, quality_rating, environment_rating, provider_style, text_review)
                VALUES (%s,%s,%s,%s,%s,%s)
            """, (row["id"], random.randint(3,5), random.randint(3,5), random.randint(3,5),
                  random.choice(STYLES), random.choice(REVIEWS)))
            review_count += 1

    print(f"[Done] Seeded: 500 customers, {len(BUSINESSES)} businesses, ~{booking_count} bookings, {review_count} reviews")
    print("Login: admin@curatedslot.com / Admin@123 | turf@curatedslot.com / Password_123")

if __name__ == "__main__":
    seed()
