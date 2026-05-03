from flask import Blueprint, request
import mysql.connector.errors
import db
from utils.auth import login_required, role_required
from utils.email import send_booking_confirmation_email
from utils.helpers import success, error

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api")


@bookings_bp.route("/bookings", methods=["POST"])
@role_required("customer")
def create_booking():
    data    = request.get_json(silent=True) or {}
    slot_id = data.get("slot_id")
    answers = data.get("answers", [])

    if not slot_id:
        return error("slot_id is required")

    slot = db.execute(
        """
        SELECT s.id, s.organiser_id, s.capacity, s.booked_count, s.status,
               s.slot_start, s.slot_end, s.appointment_type_id,
               at.title AS service_title, at.manual_confirmation,
               at.payment_requirement, at.payment_amount,
               u.full_name AS organiser_name, u.email AS organiser_email
        FROM slots s
        JOIN appointment_types at ON at.id = s.appointment_type_id
        JOIN users u ON u.id = s.organiser_id
        WHERE s.id=%s
        """,
        (slot_id,), fetch="one",
    )
    if not slot:
        return error("Slot not found", 404)
    if slot["status"] != "available":
        return error("This slot is no longer available")
    if slot["booked_count"] >= slot["capacity"]:
        return error("This slot is fully booked")

    # Validate answers
    questions = db.execute(
        "SELECT id, is_required FROM appointment_questions WHERE appointment_type_id=%s",
        (slot["appointment_type_id"],), fetch="all"
    ) or []
    
    # Check if required questions are answered
    for q in questions:
        if q["is_required"] and str(q["id"]) not in answers:
            return error(f"Question {q['id']} is required")

    initial_status = "pending" if slot["manual_confirmation"] else "confirmed"

    # Remove any old cancelled/no-show booking for this slot+customer so rebooking works
    db.execute(
        "DELETE FROM bookings WHERE slot_id=%s AND customer_id=%s AND status IN ('cancelled','no_show')",
        (slot_id, request.user_id),
    )

    try:
        booking_id = db.execute(
            "INSERT INTO bookings (slot_id, customer_id, status) VALUES (%s,%s,%s)",
            (slot_id, request.user_id, initial_status),
            fetch="lastrowid",
        )
    except mysql.connector.errors.IntegrityError as e:
        if e.errno == 1062:   # Duplicate entry — UNIQUE(slot_id, customer_id)
            return error("You have already booked this slot", 409)
        raise

    # Insert answers
    for qid_str, answer_val in answers.items():
        if not answer_val:
            continue
        db.execute(
            "INSERT INTO booking_answers (booking_id, question_id, answer_text) VALUES (%s,%s,%s)",
            (booking_id, int(qid_str), str(answer_val))
        )

    new_count  = slot["booked_count"] + 1
    new_status = "full" if new_count >= slot["capacity"] else "available"
    db.execute(
        "UPDATE slots SET booked_count=%s, status=%s WHERE id=%s",
        (new_count, new_status, slot_id),
    )

    try:
        customer = db.execute("SELECT full_name, email FROM users WHERE id=%s", (request.user_id,), fetch="one")
        send_booking_confirmation_email(
            to_email      = customer["email"],
            full_name     = customer["full_name"],
            service_title = slot["service_title"],
            slot_start    = str(slot["slot_start"]),
            slot_end      = str(slot["slot_end"]),
            provider_name = slot["organiser_name"],
            booking_id    = booking_id,
        )
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")

    booking = db.execute("SELECT id, status, payment_status, booked_at FROM bookings WHERE id=%s", (booking_id,), fetch="one")
    return success({
        "booking_id":          booking["id"],
        "status":              booking["status"],
        "payment_status":      booking["payment_status"],
        "payment_required":    slot["payment_requirement"] != "none",
        "payment_amount":      float(slot["payment_amount"] or 0),
        "message":             "Booking confirmed!" if initial_status == "confirmed" else "Booking submitted, awaiting confirmation.",
    }, 201)


@bookings_bp.route("/bookings/mine", methods=["GET"])
@role_required("customer")
def my_bookings():
    rows = db.execute(
        """
        SELECT b.id, b.status, b.payment_status, b.booked_at, b.cancelled_at, b.cancellation_reason, b.slot_id,
               s.slot_start, s.slot_end, s.organiser_id,
               at.id AS appt_type_id, at.title AS service_title, at.duration_mins,
               at.payment_requirement, at.payment_amount,
               u.full_name AS organiser_name,
               (SELECT COUNT(*) FROM appointment_feedback af WHERE af.booking_id=b.id) > 0 AS has_feedback
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        JOIN appointment_types at ON at.id=s.appointment_type_id
        JOIN users u ON u.id=s.organiser_id
        WHERE b.customer_id=%s
        ORDER BY s.slot_start DESC
        """,
        (request.user_id,), fetch="all",
    )
    return success([dict(r) for r in (rows or [])])


@bookings_bp.route("/organiser/bookings", methods=["GET"])
@role_required("organiser")
def organiser_bookings():
    status_filter = request.args.get("status")
    query = """
        SELECT b.id, b.status, b.payment_status, b.booked_at, b.cancellation_reason,
               s.slot_start, s.slot_end,
               at.title AS service_title, at.payment_requirement, at.payment_amount,
               u.full_name AS customer_name, u.email AS customer_email,
               af.punctuality_rating, af.quality_rating, af.environment_rating,
               af.parking_rating, af.accessibility_rating,
               af.text_review, af.session_overran, af.provider_style
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        JOIN appointment_types at ON at.id=s.appointment_type_id
        JOIN users u ON u.id=b.customer_id
        LEFT JOIN appointment_feedback af ON af.booking_id = b.id
        WHERE s.organiser_id=%s
    """
    params = [request.user_id]
    if status_filter:
        query += " AND b.status=%s"
        params.append(status_filter)
    query += " ORDER BY s.slot_start DESC"

    rows = db.execute(query, tuple(params), fetch="all") or []
    bookings = [dict(r) for r in rows]
    
    if bookings:
        b_ids = [b["id"] for b in bookings]
        format_strings = ','.join(['%s'] * len(b_ids))
        answers = db.execute(
            f"""
            SELECT a.booking_id, q.question_text, a.answer_text 
            FROM booking_answers a 
            JOIN appointment_questions q ON q.id = a.question_id 
            WHERE a.booking_id IN ({format_strings})
            """,
            tuple(b_ids), fetch="all"
        ) or []
        
        ans_map = {}
        for a in answers:
            ans_map.setdefault(a["booking_id"], []).append({
                "question": a["question_text"],
                "answer": a["answer_text"]
            })
            
        for b in bookings:
            b["answers"] = ans_map.get(b["id"], [])

    return success(bookings)


@bookings_bp.route("/bookings/<int:booking_id>/cancel", methods=["PATCH"])
@login_required
def cancel_booking(booking_id):
    data   = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()

    booking = db.execute(
        "SELECT id, slot_id, customer_id, status FROM bookings WHERE id=%s", (booking_id,), fetch="one"
    )
    if not booking:
        return error("Booking not found", 404)
    if request.user_role == "customer" and booking["customer_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] in ("cancelled", "completed"):
        return error(f"Cannot cancel a {booking['status']} booking")

    db.execute(
        "UPDATE bookings SET status='cancelled', cancelled_at=NOW(), cancellation_reason=%s WHERE id=%s",
        (reason, booking_id),
    )
    db.execute(
        "UPDATE slots SET booked_count=GREATEST(booked_count-1,0), status='available' WHERE id=%s",
        (booking["slot_id"],),
    )
    return success({"message": "Booking cancelled."})


@bookings_bp.route("/bookings/<int:booking_id>/reschedule", methods=["PATCH"])
@role_required("customer")
def reschedule_booking(booking_id):
    data        = request.get_json(silent=True) or {}
    new_slot_id = data.get("new_slot_id")

    if not new_slot_id:
        return error("new_slot_id is required")

    booking = db.execute(
        "SELECT id, slot_id, customer_id, status FROM bookings WHERE id=%s", (booking_id,), fetch="one"
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["customer_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] not in ("confirmed", "pending"):
        return error("Only confirmed or pending bookings can be rescheduled")

    new_slot = db.execute(
        "SELECT id, capacity, booked_count, status FROM slots WHERE id=%s", (new_slot_id,), fetch="one"
    )
    if not new_slot or new_slot["status"] != "available" or new_slot["booked_count"] >= new_slot["capacity"]:
        return error("Selected slot is not available")

    old_slot_id = booking["slot_id"]
    db.execute("UPDATE bookings SET slot_id=%s WHERE id=%s", (new_slot_id, booking_id))
    db.execute(
        "UPDATE slots SET booked_count=GREATEST(booked_count-1,0), status='available' WHERE id=%s",
        (old_slot_id,),
    )
    new_count  = new_slot["booked_count"] + 1
    new_status = "full" if new_count >= new_slot["capacity"] else "available"
    db.execute(
        "UPDATE slots SET booked_count=%s, status=%s WHERE id=%s",
        (new_count, new_status, new_slot_id),
    )
    return success({"message": "Booking rescheduled successfully."})


@bookings_bp.route("/bookings/<int:booking_id>/confirm", methods=["PATCH"])
@role_required("organiser")
def confirm_booking(booking_id):
    booking = db.execute(
        "SELECT b.id, b.status, s.organiser_id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=%s",
        (booking_id,), fetch="one",
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["organiser_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] != "pending":
        return error("Only pending bookings can be confirmed")

    db.execute("UPDATE bookings SET status='confirmed' WHERE id=%s", (booking_id,))
    return success({"message": "Booking confirmed."})


@bookings_bp.route("/bookings/<int:booking_id>/no-show", methods=["PATCH"])
@role_required("organiser")
def mark_no_show(booking_id):
    booking = db.execute(
        "SELECT b.id, b.status, s.organiser_id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=%s",
        (booking_id,), fetch="one",
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["organiser_id"] != request.user_id:
        return error("Forbidden", 403)

    db.execute("UPDATE bookings SET status='no_show' WHERE id=%s", (booking_id,))
    return success({"message": "Marked as no-show."})


@bookings_bp.route("/bookings/<int:booking_id>/complete", methods=["PATCH"])
@login_required
def mark_complete(booking_id):
    booking = db.execute(
        "SELECT b.id, b.status, b.customer_id, s.organiser_id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=%s",
        (booking_id,), fetch="one",
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["organiser_id"] != request.user_id and booking["customer_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] != "confirmed":
        return error("Only confirmed bookings can be marked complete")

    db.execute("UPDATE bookings SET status='completed' WHERE id=%s", (booking_id,))
    return success({"message": "Booking marked as completed."})


@bookings_bp.route("/bookings/<int:booking_id>/payment", methods=["PATCH"])
@login_required
def update_payment(booking_id):
    """Mock payment endpoint — updates payment_status for testing."""
    data = request.get_json(silent=True) or {}
    new_status = data.get("payment_status")

    if new_status not in ("paid", "refunded", "unpaid"):
        return error("payment_status must be paid, refunded, or unpaid")

    booking = db.execute(
        "SELECT b.id, b.customer_id, s.organiser_id FROM bookings b JOIN slots s ON s.id=b.slot_id WHERE b.id=%s",
        (booking_id,), fetch="one",
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["customer_id"] != request.user_id and booking["organiser_id"] != request.user_id:
        return error("Forbidden", 403)

    db.execute("UPDATE bookings SET payment_status=%s WHERE id=%s", (new_status, booking_id))
    return success({"message": f"Payment marked as {new_status}.", "payment_status": new_status})
