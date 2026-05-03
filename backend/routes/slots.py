from datetime import datetime, timedelta, timezone
from flask import Blueprint, request
import db
from utils.auth import role_required, login_required
from utils.helpers import success, error

slots_bp = Blueprint("slots", __name__, url_prefix="/api")


# ── GET /api/providers/<provider_id>/slots — public upcoming slots ─────────────
@slots_bp.route("/providers/<int:provider_id>/slots", methods=["GET"])
@login_required
def provider_slots(provider_id):
    rows = db.execute(
        """
        SELECT s.id, s.appointment_type_id, at.title AS service_title,
               s.slot_start, s.slot_end, s.capacity, s.booked_count, s.status,
               (s.capacity - s.booked_count) AS seats_left
        FROM slots s
        JOIN appointment_types at ON at.id = s.appointment_type_id
        WHERE s.organiser_id = %s
          AND s.status = 'available'
          AND s.slot_start > NOW()
        ORDER BY s.slot_start
        LIMIT 30
        """,
        (provider_id,), fetch="all"
    )
    return success([dict(r) for r in (rows or [])])


# ── GET /api/slots/<slot_id> — get slot details for checkout ───────────────
@slots_bp.route("/slots/<int:slot_id>", methods=["GET"])
@login_required
def get_slot(slot_id):
    slot = db.execute(
        """
        SELECT s.id, s.slot_start, s.slot_end, s.capacity, s.booked_count, s.status,
               at.id AS service_id, at.title AS service_title, at.duration_mins,
               at.payment_requirement, at.payment_amount,
               u.full_name AS organiser_name
        FROM slots s
        JOIN appointment_types at ON at.id = s.appointment_type_id
        JOIN users u ON u.id = s.organiser_id
        WHERE s.id = %s
        """,
        (slot_id,), fetch="one"
    )
    if not slot:
        return error("Slot not found", 404)
        
    questions = db.execute(
        "SELECT id, question_text, is_required FROM appointment_questions WHERE appointment_type_id = %s ORDER BY order_index",
        (slot["service_id"],), fetch="all"
    )
    slot["questions"] = [dict(q) for q in (questions or [])]
    
    return success(dict(slot))


# ── GET /api/slots?organiser_id=&date=YYYY-MM-DD ─────────────────────────────
@slots_bp.route("/slots", methods=["GET"])
@login_required
def get_slots():
    organiser_id = request.args.get("organiser_id", type=int)
    date_str     = request.args.get("date")          # YYYY-MM-DD
    appt_type_id = request.args.get("appointment_type_id", type=int)

    if not organiser_id or not date_str:
        return error("organiser_id and date are required")

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return error("date must be in YYYY-MM-DD format")

    query = """
        SELECT s.id, s.appointment_type_id, at.title AS service_title,
               s.slot_start, s.slot_end, s.capacity, s.booked_count, s.status,
               (s.capacity - s.booked_count) AS seats_left
        FROM slots s
        JOIN appointment_types at ON at.id = s.appointment_type_id
        WHERE s.organiser_id = %s
          AND DATE(s.slot_start) = %s
          AND s.status = 'available'
    """
    params = [organiser_id, target_date]

    if appt_type_id:
        query += " AND s.appointment_type_id = %s"
        params.append(appt_type_id)

    query += " ORDER BY s.slot_start"
    rows = db.execute(query, params, fetch="all")
    return success([dict(r) for r in (rows or [])])


# ── POST /api/slots/generate — generate slots from working hours ──────────────
@slots_bp.route("/slots/generate", methods=["POST"])
@role_required("organiser")
def generate_slots():
    data            = request.get_json(silent=True) or {}
    appt_type_id    = data.get("appointment_type_id")
    start_date_str  = data.get("start_date")   # YYYY-MM-DD
    end_date_str    = data.get("end_date")      # YYYY-MM-DD

    if not appt_type_id or not start_date_str or not end_date_str:
        return error("appointment_type_id, start_date, and end_date are required")

    # Fetch appointment type (must belong to caller)
    appt = db.execute(
        "SELECT id, organiser_id, duration_mins, max_capacity FROM appointment_types WHERE id=%s",
        (appt_type_id,), fetch="one",
    )
    if not appt:
        return error("Appointment type not found", 404)
    if appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date   = datetime.strptime(end_date_str,   "%Y-%m-%d").date()
    except ValueError:
        return error("Dates must be in YYYY-MM-DD format")

    if end_date < start_date:
        return error("end_date must be >= start_date")
    if (end_date - start_date).days > 90:
        return error("Cannot generate slots for more than 90 days at a time")

    # Fetch working hours for this organiser
    wh_rows = db.execute(
        "SELECT day_of_week, start_time, end_time FROM working_hours WHERE organiser_id=%s AND is_active=1",
        (request.user_id,), fetch="all",
    )
    if not wh_rows:
        return error("No active working hours configured. Set working hours first.")

    # Build lookup: day_of_week → (start_time, end_time)
    wh_map = {r["day_of_week"]: (r["start_time"], r["end_time"]) for r in wh_rows}

    duration   = timedelta(minutes=appt["duration_mins"])
    capacity   = appt["max_capacity"]
    slots_created = 0
    current = start_date

    while current <= end_date:
        dow = current.weekday()  # 0=Mon … 6=Sun
        if dow in wh_map:
            start_t, end_t = wh_map[dow]
            
            # PyMySQL returns TIME as timedelta
            if isinstance(start_t, timedelta):
                start_t = (datetime(1,1,1) + start_t).time()
            if isinstance(end_t, timedelta):
                end_t = (datetime(1,1,1) + end_t).time()

            # Build datetime objects in UTC (naive → assume local, treat as UTC for demo)
            day_start = datetime.combine(current, start_t)
            day_end   = datetime.combine(current, end_t)

            slot_start = day_start
            while slot_start + duration <= day_end:
                slot_end = slot_start + duration
                # Avoid duplicates
                existing = db.execute(
                    "SELECT id FROM slots WHERE appointment_type_id=%s AND slot_start=%s",
                    (appt_type_id, slot_start), fetch="one",
                )
                if not existing:
                    db.execute(
                        """
                        INSERT INTO slots (appointment_type_id, organiser_id, slot_start, slot_end, capacity)
                        VALUES (%s,%s,%s,%s,%s)
                        """,
                        (appt_type_id, request.user_id, slot_start, slot_end, capacity),
                    )
                    slots_created += 1
                slot_start = slot_end

        current += timedelta(days=1)

    return success({"slots_created": slots_created, "message": f"{slots_created} slot(s) generated."})
