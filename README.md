# CuratedSlot

A full-stack appointment booking platform built with **Next.js** and **Flask**, designed for Indian businesses across healthcare, sports, beauty, education, lifestyle, and more.

## Features

- **Multi-role System** — Customer, Business (Organiser), and Admin dashboards
- **Smart Discovery** — Explore services with category and payment type filters
- **Preference-based Matching** — AI-driven provider recommendations based on user preferences (punctuality, quality, environment, parking, accessibility)
- **Razorpay Integration** — Secure payments in INR with mandatory advance payment support
- **Slot Management** — Businesses set working hours; slots auto-generate with capacity tracking
- **Booking Lifecycle** — Draft → Pending → Confirmed → Completed/Cancelled with cancellation policies and refund rules
- **Feedback System** — Post-appointment ratings that update provider behavioral scores
- **Admin Dashboard** — Real-time stats, revenue tracking, user management, and booking oversight
- **Email Notifications** — OTP verification, booking confirmations, and password resets via SMTP
- **Responsive UI** — Built with shadcn/ui components, works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, shadcn/ui, Tailwind CSS |
| Backend | Python, Flask, PyMySQL |
| Database | MySQL |
| Payments | Razorpay (Test Mode) |
| Auth | JWT + bcrypt + OTP email verification |

## Project Structure

```
├── backend/
│   ├── app.py              # Flask entry point
│   ├── db.py               # Database connection helper
│   ├── config.py           # Environment config
│   ├── schema.sql          # MySQL schema
│   ├── seed.py             # Database seeder (500 users, 25 businesses)
│   ├── routes/
│   │   ├── auth.py         # Login, signup, OTP, password reset
│   │   ├── admin.py        # Admin stats, user management
│   │   ├── appointments.py # Service CRUD
│   │   ├── bookings.py     # Booking lifecycle
│   │   ├── providers.py    # Discovery & filtering
│   │   ├── slots.py        # Slot generation & management
│   │   ├── users.py        # User profile & preferences
│   │   └── feedback.py     # Post-appointment reviews
│   └── utils/
│       ├── auth.py         # JWT & password helpers
│       ├── email.py        # SMTP email sender
│       └── helpers.py      # Shared utilities
├── frontend/
│   ├── app/                # Next.js app router pages
│   │   ├── admin/          # Admin dashboard
│   │   ├── dashboard/      # Customer dashboard
│   │   ├── organiser/      # Business dashboard
│   │   ├── login/          # Auth pages
│   │   └── signup/
│   ├── components/         # Reusable UI components
│   ├── lib/
│   │   └── api.ts          # Typed API client
│   └── styles/
└── .gitignore
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MySQL** 8.0+

### 1. Database Setup

```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `config.py` or set environment variables:

```python
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "your_password"
DB_NAME = "curatedslot"
JWT_SECRET = "your_secret_key"
RAZORPAY_KEY_ID = "rzp_test_..."
RAZORPAY_KEY_SECRET = "..."
```

Run the server:

```bash
python app.py
```

### 3. Seed Data (Optional)

Populates the database with 500 customers, 25 businesses, 800 bookings, and 150 reviews:

```bash
python seed.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@curatedslot.com | Admin@123 |
| Business | turf@curatedslot.com | Password_123 |
| Customer | (sign up or use any seeded customer) | Password_123 |

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/signup` | Register new user |
| `POST /api/auth/login` | Login with email/password |
| `GET /api/providers` | Browse businesses (with filters) |
| `GET /api/providers/:id` | Business detail + services |
| `POST /api/bookings` | Create a booking |
| `GET /api/bookings` | List user's bookings |
| `GET /api/admin/stats` | Platform statistics |
| `GET /api/admin/bookings` | All bookings (admin) |
| `GET /api/admin/users` | All users (admin) |

## License

MIT
