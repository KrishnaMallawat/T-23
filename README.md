# CuratedSlot (Slotsy) - Advanced Appointment Scheduling System

![CuratedSlot Hero](https://via.placeholder.com/1200x400?text=CuratedSlot+-+Intelligent+Appointment+Scheduling)

CuratedSlot is a high-performance, intelligent appointment scheduling system built to solve complex, real-world booking constraints. Originally conceptualized for the Odoo Hackathon, this platform moves beyond generic booking systems by introducing dynamic recommendation engines, granular cancellation policies, and flexible payment workflows.

---

## 🛑 The Problem

Modern booking applications suffer from two major flaws:
1. **Generic Discovery:** Finding a service provider usually relies on a generic 5-star rating system. A 4.8-star provider might be highly skilled but terribly unpunctual, which helps no one if the customer's top priority is not waiting in a lobby.
2. **Rigid Policies:** Most open-source booking systems do not natively handle the complex realities of service businesses, such as tiered cancellation cutoffs (e.g., 100% refund >24h, 0% <24h), mandatory advance payments, or manual appointment confirmations.

The hackathon required a production-ready system capable of handling these complex constraints while surviving concurrent load testing with hundreds of users.

---

## 💡 The Solution

CuratedSlot solves these problems through a highly optimized backend that treats booking not just as a calendar problem, but as an **e-commerce and recommendation problem.**

### 1. The 100-Point Personalized Match Engine
Instead of subjective 5-star reviews, providers are scored objectively out of 100 across specific behavioral traits (Punctuality, Quality, Environment). Customers configure their profiles by assigning **importance weights** (0-100) to these traits, along with amenities like Parking and Accessibility. 

When a user browses providers, the backend runs a dynamic weighted-average algorithm to calculate a unique **Match Percentage** for that specific user. 
* *Result: Two users looking at the exact same list of providers will see them ranked differently based on their personal priorities.*

### 2. Advanced Rule Engines
Organisers have immense flexibility when creating appointment types:
* **Payments:** `none`, `optional_advance`, or `mandatory_advance`.
* **Cancellations:** Toggles for `allow_cancellation`, `cancellation_cutoff_hours`, and dynamic `refund_percent`.
* **Rescheduling:** Strict toggles to prevent calendar abuse.
* **Intake:** Custom required/optional intake questions dynamically tied to specific services.

---

## 🏗️ Technical Architecture & Stack

To meet the hackathon's requirement for a lightweight, high-performance system capable of being aggressively load-tested, we chose a lean, relational architecture.

* **Backend Framework:** Python / Flask
* **Database:** MySQL
* **Authentication:** Stateless JWT (JSON Web Tokens) with Bcrypt hashing
* **Email:** Native SMTP integration for transactional emails (Password Resets, Confirmations)

### Core Systems
* **Slot Generator:** An algorithm that reads an organiser's weekly `working_hours` (e.g., Mon-Fri 09:00-17:00) and automatically extrapolates future, non-overlapping `slots` based on the duration of their configured services.
* **Event Scheduler:** A native MySQL background event (`cleanup_expired_locks`) runs every 60 seconds to automatically release `draft` bookings that a customer abandoned during the checkout/payment phase, freeing up the calendar lock.
* **RESTful State:** The backend APIs are completely decoupled from the UI. For instance, the recommendation engine supports temporary "session-level" slider overrides passed via URL query parameters, seamlessly falling back to database defaults if none are provided.

---

## 🗄️ Database Schema Highlights

The system is highly relational, ensuring data integrity during high-concurrency bookings.

* `users`: Base table for Auth (Role-based: Organisers vs Customers)
* `appointment_types`: The services offered, containing all complex payment and refund rules.
* `slots`: The actual time inventory. Tracks `capacity` vs `booked_count`.
* `bookings`: The transactional ledger joining a customer to a slot, tracking payment status and cancellation reasons.
* `user_preferences`: Stores the 0-100 weighting system for the recommendation engine.
* `appointment_feedback` & `provider_behavioral_scores`: Stores raw customer feedback and the aggregated 100-point behavioral scores.

---

## 🚀 Load Testing & Seeding

Because performance evaluation was a core hackathon requirement, the repository includes a robust, automated seeding environment.

Running `python seed.py` utilizes the `Faker` library to instantly generate:
- 50+ Users (Organisers & Customers)
- Realistic 100-point behavioral scores and custom preferences
- Dynamic Appointment Types with varying payment/cancellation rules
- Weekly Working Hours and hundreds of extrapolated Slots
- 100+ Bookings with associated custom Intake Answers and granular Feedback

This guarantees the application can be load-tested with deeply interconnected relational data immediately upon setup.

---

## 🏁 Getting Started

### Prerequisites
- Python 3.10+
- MySQL Server 8.0+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/curatedslot.git
   cd curatedslot
   ```

2. **Setup the Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Database Initialization**
   Ensure MySQL is running, then execute the schema:
   ```bash
   mysql -u root -p -e "CREATE DATABASE curatedslot;"
   mysql -u root -p curatedslot < schema.sql
   ```

4. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=curatedslot
   JWT_SECRET=your_super_secret_key
   FRONTEND_URL=http://localhost:5500
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=your_app_password
   ```

5. **Seed the Database (Optional but recommended)**
   ```bash
   python seed.py
   ```

6. **Run the Application**
   ```bash
   python app.py
   ```
   The backend will start on `http://127.0.0.1:5000`.
