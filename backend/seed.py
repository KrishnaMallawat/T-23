import mysql.connector
from faker import Faker
import random
import bcrypt
from datetime import datetime, timedelta

# Update with your actual credentials
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "database": "curatedslot",
    "user": "root",
    "password": "Passwordd_123"
}

fake = Faker()

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_database():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("Seeding Users...")
    users = []
    # Seed 50 users (10 Organisers, 40 Customers)
    for i in range(50):
        role = 'organiser' if i < 10 else 'customer'
        full_name = fake.name()
        email = fake.unique.email()
        password_hash = hash_password('password123')
        
        cursor.execute("""
            INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (full_name, email, password_hash, role, True, True))
        users.append((cursor.lastrowid, role))
        
    conn.commit()

    organisers = [u[0] for u in users if u[1] == 'organiser']
    customers = [u[0] for u in users if u[1] == 'customer']

    print("Seeding Preferences and Provider Info...")
    for cust_id in customers:
        cursor.execute("""
            INSERT INTO user_preferences (user_id, punctuality_weight, quality_weight, environment_weight, parking_weight, accessibility_weight) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (cust_id, random.randint(0, 100), random.randint(0, 100), random.randint(0, 100), random.randint(0, 100), random.randint(0, 100)))

    for org_id in organisers:
        cursor.execute("""
            INSERT INTO provider_info (provider_id, bio, has_parking) 
            VALUES (%s, %s, %s)
        """, (org_id, fake.text(max_nb_chars=100), random.choice([True, False])))

        for day in range(1, 6):
            cursor.execute("""
                INSERT INTO working_hours (organiser_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, '09:00:00', '17:00:00', 1)
            """, (org_id, day))
        
    conn.commit()

    print("Seeding Appointment Types...")
    appointment_types = []
    for org_id in organisers:
        for _ in range(random.randint(1, 3)): # 1 to 3 services per organiser
            duration = random.choice([15, 30, 45, 60])
            payment_req = random.choice(['none', 'optional_advance', 'mandatory_advance'])
            amount = random.randint(10, 100) if payment_req != 'none' else 0
            
            cursor.execute("""
                INSERT INTO appointment_types 
                (organiser_id, title, description, duration_mins, is_published, payment_requirement, payment_amount, allow_cancellation) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                org_id, fake.job() + " Consultation", fake.catch_phrase(), duration, 
                True, payment_req, amount, True
            ))
            at_id = cursor.lastrowid
            appointment_types.append((at_id, org_id, duration))

            cursor.execute("""
                INSERT INTO appointment_questions (appointment_type_id, question_text, is_required)
                VALUES (%s, %s, %s)
            """, (at_id, fake.sentence(nb_words=6)[:-1] + "?", random.choice([True, False])))

    conn.commit()

    print("Seeding Slots...")
    slots = []
    now = datetime.now()
    for at_id, org_id, duration in appointment_types:
        # Generate 10-20 slots per service for the next 7 days
        for _ in range(random.randint(10, 20)):
            days_ahead = random.randint(1, 7)
            start_hour = random.randint(9, 16)
            slot_start = now.replace(hour=start_hour, minute=0, second=0, microsecond=0) + timedelta(days=days_ahead)
            slot_end = slot_start + timedelta(minutes=duration)
            
            cursor.execute("""
                INSERT INTO slots (appointment_type_id, organiser_id, slot_start, slot_end, capacity, status) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (at_id, org_id, slot_start, slot_end, 1, 'available'))
            slots.append(cursor.lastrowid)

    conn.commit()

    print("Seeding Bookings...")
    # Seed 100 bookings randomly across slots and customers
    booked_slots = random.sample(slots, min(100, len(slots)))
    for slot_id in booked_slots:
        cust_id = random.choice(customers)
        status = random.choice(['confirmed', 'pending', 'completed'])
        payment_status = random.choice(['paid', 'unpaid'])
        
        cursor.execute("""
            INSERT INTO bookings (slot_id, customer_id, status, payment_status) 
            VALUES (%s, %s, %s, %s)
        """, (slot_id, cust_id, status, payment_status))
        booking_id = cursor.lastrowid
        
        cursor.execute("UPDATE slots SET booked_count = 1, status = 'full' WHERE id = %s", (slot_id,))

        cursor.execute("""
            SELECT q.id FROM appointment_questions q
            JOIN slots s ON s.appointment_type_id = q.appointment_type_id
            WHERE s.id = %s
        """, (slot_id,))
        q_row = cursor.fetchone()
        if q_row:
            cursor.execute("""
                INSERT INTO booking_answers (booking_id, question_id, answer_text)
                VALUES (%s, %s, %s)
            """, (booking_id, q_row[0], fake.sentence(nb_words=3)[:-1]))
            
        if status == 'completed':
            cursor.execute("""
                INSERT INTO appointment_feedback (booking_id, punctuality_rating, quality_rating, environment_rating, session_overran, avg_delay_mins, provider_style, text_review)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (booking_id, random.randint(60, 100), random.randint(60, 100), random.randint(60, 100), random.choice([True, False]), random.randint(0, 15), random.choice(['professional', 'friendly', 'technical', 'casual']), fake.sentence()[:-1]))
        
    conn.commit()

    print("Calculating Provider Scores from Feedback...")
    for org_id in organisers:
        cursor.execute("""
            SELECT
                COUNT(*)                                     AS total_reviews,
                ROUND(AVG(punctuality_rating), 2)            AS punctuality_score,
                ROUND(AVG(avg_delay_mins), 2)                AS avg_delay_mins,
                ROUND(SUM(CASE WHEN session_overran THEN 1 ELSE 0 END) / COUNT(*), 4) AS overrun_rate,
                ROUND(AVG(quality_rating), 2)                AS quality_score,
                ROUND(AVG(environment_rating), 2)            AS environment_score
            FROM appointment_feedback af
            JOIN bookings b ON b.id=af.booking_id
            JOIN slots s    ON s.id=b.slot_id
            WHERE s.organiser_id=%s
        """, (org_id,))
        agg = cursor.fetchone()
        if agg and agg[0] > 0:
            cursor.execute("""
                INSERT INTO provider_behavioral_scores
                    (provider_id, punctuality_score, avg_delay_mins, overrun_rate,
                     quality_score, environment_score, total_reviews)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                    punctuality_score=VALUES(punctuality_score),
                    avg_delay_mins=VALUES(avg_delay_mins),
                    overrun_rate=VALUES(overrun_rate),
                    quality_score=VALUES(quality_score),
                    environment_score=VALUES(environment_score),
                    total_reviews=VALUES(total_reviews)
            """, (org_id, agg[1], agg[2], agg[3], agg[4], agg[5], agg[0]))
        else:
            cursor.execute("""
                INSERT INTO provider_behavioral_scores (provider_id) VALUES (%s)
            """, (org_id,))
    conn.commit()

    print("Database seeded successfully!")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed_database()
