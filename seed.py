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
            INSERT INTO user_preferences (user_id, cares_punctuality, cares_quality) 
            VALUES (%s, %s, %s)
        """, (cust_id, random.choice([True, False]), random.choice([True, False])))

    for org_id in organisers:
        cursor.execute("""
            INSERT INTO provider_info (provider_id, bio, has_parking, noise_level) 
            VALUES (%s, %s, %s, %s)
        """, (org_id, fake.text(max_nb_chars=100), random.choice([True, False]), random.choice(['quiet', 'moderate', 'loud'])))
        
        cursor.execute("""
            INSERT INTO provider_behavioral_scores (provider_id) VALUES (%s)
        """, (org_id,))
        
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
            appointment_types.append((cursor.lastrowid, org_id, duration))

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
        status = random.choice(['confirmed', 'pending'])
        payment_status = random.choice(['paid', 'unpaid'])
        
        cursor.execute("""
            INSERT INTO bookings (slot_id, customer_id, status, payment_status) 
            VALUES (%s, %s, %s, %s)
        """, (slot_id, cust_id, status, payment_status))
        
        # Mark slot as full
        cursor.execute("UPDATE slots SET booked_count = 1, status = 'full' WHERE id = %s", (slot_id,))
        
    conn.commit()

    print("Database seeded successfully!")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed_database()
