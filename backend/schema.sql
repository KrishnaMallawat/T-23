-- ============================================================
-- SlotSync — MySQL Schema
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS provider_behavioral_scores;
DROP TABLE IF EXISTS appointment_feedback;
DROP TABLE IF EXISTS booking_answers;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS slots;
DROP TABLE IF EXISTS appointment_questions;
DROP TABLE IF EXISTS working_hours;
DROP TABLE IF EXISTS appointment_types;
DROP TABLE IF EXISTS provider_info;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          ENUM('customer','organiser','admin') NOT NULL DEFAULT 'customer',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. OTP VERIFICATIONS
-- ============================================================
CREATE TABLE otp_verifications (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    otp_code    VARCHAR(6) NOT NULL,
    expires_at  DATETIME NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_otp_user (user_id)
);

-- ============================================================
-- 3. PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token       VARCHAR(100) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_prt_token (token)
);

-- ============================================================
-- 4. USER PREFERENCES (one row per customer)
-- ============================================================
CREATE TABLE user_preferences (
    user_id              INT NOT NULL PRIMARY KEY,
    punctuality_weight   INT NOT NULL DEFAULT 50,
    quality_weight       INT NOT NULL DEFAULT 50,
    environment_weight   INT NOT NULL DEFAULT 50,
    parking_weight       INT NOT NULL DEFAULT 50,
    accessibility_weight INT NOT NULL DEFAULT 50,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. PROVIDER INFO (one row per organiser)
-- ============================================================
CREATE TABLE provider_info (
    provider_id               INT NOT NULL PRIMARY KEY,
    bio                       TEXT,
    has_parking               BOOLEAN NOT NULL DEFAULT FALSE,
    is_wheelchair_accessible  BOOLEAN NOT NULL DEFAULT FALSE,
    noise_level               ENUM('quiet','moderate','loud') NOT NULL DEFAULT 'moderate',
    updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. APPOINTMENT TYPES
-- ============================================================
CREATE TABLE appointment_types (
    id                           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    organiser_id                 INT NOT NULL,
    title                        VARCHAR(200) NOT NULL,
    description                  TEXT,
    category                     VARCHAR(50) DEFAULT 'Other',
    duration_mins                INT NOT NULL,
    max_capacity                 INT NOT NULL DEFAULT 1,
    is_published                 BOOLEAN NOT NULL DEFAULT FALSE,
    payment_requirement          ENUM('none', 'mandatory_advance') NOT NULL DEFAULT 'none',
    payment_amount               DECIMAL(10,2),
    manual_confirmation          BOOLEAN NOT NULL DEFAULT FALSE,
    allow_rescheduling           BOOLEAN NOT NULL DEFAULT TRUE,
    allow_cancellation           BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_cutoff_hours    INT NOT NULL DEFAULT 24,
    refund_percent_before_cutoff INT NOT NULL DEFAULT 100,
    refund_percent_after_cutoff  INT NOT NULL DEFAULT 0,
    share_token                  VARCHAR(100) UNIQUE,
    created_at                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_apt_organiser (organiser_id)
);

-- ============================================================
-- 7. APPOINTMENT QUESTIONS
-- ============================================================
CREATE TABLE appointment_questions (
    id                  INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    appointment_type_id INT NOT NULL,
    question_text       TEXT NOT NULL,
    is_required         BOOLEAN NOT NULL DEFAULT FALSE,
    order_index         INT NOT NULL DEFAULT 0,
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id) ON DELETE CASCADE,
    INDEX idx_aq_apt (appointment_type_id)
);

-- ============================================================
-- 8. WORKING HOURS
-- ============================================================
CREATE TABLE working_hours (
    id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    organiser_id  INT NOT NULL,
    day_of_week   TINYINT NOT NULL,  -- 0=Mon, 6=Sun
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_organiser_day (organiser_id, day_of_week),
    INDEX idx_wh_organiser (organiser_id)
);

-- ============================================================
-- 9. SLOTS
-- ============================================================
CREATE TABLE slots (
    id                  INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    appointment_type_id INT NOT NULL,
    organiser_id        INT NOT NULL,
    slot_start          DATETIME NOT NULL,
    slot_end            DATETIME NOT NULL,
    capacity            INT NOT NULL DEFAULT 1,
    booked_count        INT NOT NULL DEFAULT 0,
    status              ENUM('available','full','cancelled') NOT NULL DEFAULT 'available',
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_slots_organiser_start (organiser_id, slot_start)
);

-- ============================================================
-- 10. BOOKINGS
-- ============================================================
CREATE TABLE bookings (
    id                   INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    slot_id              INT NOT NULL,
    customer_id          INT NOT NULL,
    status               ENUM('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'confirmed',
    booked_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at         DATETIME,
    cancellation_reason  TEXT,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_slot_customer (slot_id, customer_id),  -- prevents double booking
    INDEX idx_bookings_customer (customer_id),
    INDEX idx_bookings_slot (slot_id)
);

-- ============================================================
-- 11. BOOKING ANSWERS
-- ============================================================
CREATE TABLE booking_answers (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id   INT NOT NULL,
    question_id  INT NOT NULL,
    answer_text  TEXT NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES appointment_questions(id) ON DELETE CASCADE,
    INDEX idx_ba_booking (booking_id)
);

-- ============================================================
-- 12. APPOINTMENT FEEDBACK (no user_id — privacy by design)
-- ============================================================
CREATE TABLE appointment_feedback (
    id                  INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_id          INT NOT NULL UNIQUE,
    punctuality_rating  TINYINT,
    quality_rating      TINYINT,
    environment_rating  TINYINT,
    session_overran     BOOLEAN DEFAULT FALSE,
    avg_delay_mins      INT DEFAULT 0,
    provider_style      ENUM('professional','friendly','technical','casual'),
    text_review         TEXT,
    submitted_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ============================================================
-- 13. PROVIDER BEHAVIORAL SCORES (pre-computed aggregates)
-- ============================================================
CREATE TABLE provider_behavioral_scores (
    provider_id       INT NOT NULL PRIMARY KEY,
    punctuality_score DECIMAL(3,2) DEFAULT 0,
    avg_delay_mins    DECIMAL(5,2) DEFAULT 0,
    overrun_rate      DECIMAL(5,4) DEFAULT 0,
    quality_score     DECIMAL(3,2) DEFAULT 0,
    environment_score DECIMAL(3,2) DEFAULT 0,
    total_reviews     INT NOT NULL DEFAULT 0,
    last_updated      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED: default admin (password: Admin@123)
-- ============================================================
INSERT INTO users (full_name, email, password_hash, role, is_active, is_verified)
VALUES (
    'System Admin',
    'admin@slotsy.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaL.t4SLi24O1pAO4Z7TQIFQ2',
    'admin',
    TRUE,
    TRUE
);
