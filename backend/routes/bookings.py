from flask import Blueprint, request
import mysql.connector.errors
import db
from utils.auth import login_required, role_required
from utils.email import send_booking_confirmation_email
from utils.helpers import success, error, in_minutes
from datetime import datetime
import razorpay
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api")

rzp = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else None


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
               s.slot_start, s.slot_end,
               at.title AS service_title, at.manual_confirmation,
               at.payment_requirement,
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

    if slot["payment_requirement"] == "mandatory_advance":
        rzp_payment_id = data.get("razorpay_payment_id")
        rzp_order_id   = data.get("razorpay_order_id")
        rzp_signature  = data.get("razorpay_signature")

        if not rzp_payment_id:
            return error("Payment is required for this slot", 400)
        
        if rzp and rzp_signature:
            try:
                rzp.utility.verify_payment_signature({
                    'razorpay_order_id': rzp_order_id,
                    'razorpay_payment_id': rzp_payment_id,
                    'razorpay_signature': rzp_signature
                })
            except Exception as e:
                return error("Payment verification failed: " + str(e), 400)
        
        initial_status = "pending" if slot["manual_confirmation"] else "confirmed"
        expires_at = None
        payment_status = "paid"
        payment_id = rzp_payment_id
    else:
        initial_status = "pending" if slot["manual_confirmation"] else "confirmed"
        expires_at = None
        payment_status = "pending"
        payment_id = None

    try:
        booking_id = db.execute(
            "INSERT INTO bookings (slot_id, customer_id, status, expires_at, payment_status, payment_id) VALUES (%s,%s,%s,%s,%s,%s)",
            (slot_id, request.user_id, initial_status, expires_at, payment_status, payment_id),
            fetch="lastrowid",
        )
    except mysql.connector.errors.IntegrityError as e:
        if e.errno == 1062:   # Duplicate entry — UNIQUE(slot_id, customer_id)
            return error("You have already booked this slot", 409)
        raise

    new_count  = slot["booked_count"] + 1
    new_status = "full" if new_count >= slot["capacity"] else "available"
    db.execute(
        "UPDATE slots SET booked_count=%s, status=%s WHERE id=%s",
        (new_count, new_status, slot_id),
    )

    for ans in answers:
        if ans.get("question_id") and ans.get("answer_text"):
            db.execute(
                "INSERT INTO booking_answers (booking_id, question_id, answer_text) VALUES (%s,%s,%s)",
                (booking_id, ans["question_id"], ans["answer_text"]),
            )

    # Only send email if the booking isn't a draft
    if initial_status != "draft":
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

    booking = db.execute("SELECT id, status, booked_at FROM bookings WHERE id=%s", (booking_id,), fetch="one")
    
    msg = "Booking confirmed!" if initial_status == "confirmed" else "Booking submitted, awaiting confirmation."
    if initial_status == "draft":
        msg = "Booking reserved. Please complete payment within 15 minutes."

    return success({
        "booking_id": booking["id"],
        "status":     booking["status"],
        "message":    msg,
    }, 201)


@bookings_bp.route("/payments/create-order", methods=["POST"])
@role_required("customer")
def create_payment_order():
    data = request.get_json(silent=True) or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return error("slot_id is required")

    slot = db.execute("SELECT at.payment_amount FROM slots s JOIN appointment_types at ON s.appointment_type_id=at.id WHERE s.id=%s", (slot_id,), fetch="one")
    if not slot:
        return error("Slot not found", 404)
        
    amount_inr = int(slot["payment_amount"] * 100)
    
    if rzp:
        try:
            order = rzp.order.create({
                "amount": amount_inr,
                "currency": "INR",
                "payment_capture": "1"
            })
            return success({"order_id": order["id"], "amount": amount_inr, "key": RAZORPAY_KEY_ID})
        except Exception as e:
            return error("Razorpay API Error: " + str(e))
    else:
        # Simulated mode if keys are not provided
        import uuid
        return success({
            "order_id": f"order_mock_{uuid.uuid4().hex[:10]}", 
            "amount": amount_inr, 
            "key": "rzp_test_dummy"
        })


@bookings_bp.route("/bookings/mine", methods=["GET"])
@role_required("customer")
def my_bookings():
    rows = db.execute(
        """
        SELECT b.id, b.status, b.booked_at, b.cancelled_at,
               s.slot_start, s.slot_end,
               at.title AS service_title, at.duration_mins,
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
        SELECT b.id, b.status, b.booked_at,
               s.slot_start, s.slot_end,
               at.title AS service_title,
               u.full_name AS customer_name, u.email AS customer_email
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        JOIN appointment_types at ON at.id=s.appointment_type_id
        JOIN users u ON u.id=b.customer_id
        WHERE s.organiser_id=%s
    """
    params = [request.user_id]
    if status_filter:
        query += " AND b.status=%s"
        params.append(status_filter)
    query += " ORDER BY s.slot_start DESC"

    rows = db.execute(query, params, fetch="all")
    return success([dict(r) for r in (rows or [])])


@bookings_bp.route("/bookings/<int:booking_id>/cancel", methods=["PATCH"])
@login_required
def cancel_booking(booking_id):
    data   = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()

    booking = db.execute(
        """
        SELECT b.id, b.slot_id, b.customer_id, b.status, b.payment_status,
               s.slot_start,
               at.allow_cancellation, at.cancellation_cutoff_hours,
               at.refund_percent_before_cutoff, at.refund_percent_after_cutoff
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        JOIN appointment_types at ON at.id=s.appointment_type_id
        WHERE b.id=%s
        """, (booking_id,), fetch="one"
    )
    if not booking:
        return error("Booking not found", 404)
    if not booking["allow_cancellation"]:
        return error("Cancellation is not allowed for this service", 403)
    if request.user_role == "customer" and booking["customer_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] in ("cancelled", "completed"):
        return error(f"Cannot cancel a {booking['status']} booking")

    now = datetime.now()
    hours_until = (booking["slot_start"] - now).total_seconds() / 3600
    
    refund_pct = 0
    if hours_until >= booking["cancellation_cutoff_hours"]:
        refund_pct = booking["refund_percent_before_cutoff"]
    else:
        refund_pct = booking["refund_percent_after_cutoff"]

    new_payment_status = "refunded" if refund_pct > 0 and booking["payment_status"] == "paid" else booking["payment_status"]

    db.execute(
        "UPDATE bookings SET status='cancelled', cancelled_at=NOW(), cancellation_reason=%s, payment_status=%s WHERE id=%s",
        (reason, new_payment_status, booking_id),
    )
    db.execute(
        "UPDATE slots SET booked_count=GREATEST(booked_count-1,0), status='available' WHERE id=%s",
        (booking["slot_id"],),
    )
    return success({
        "message": "Booking cancelled.",
        "refund_percentage": refund_pct,
        "payment_status": new_payment_status
    })


@bookings_bp.route("/bookings/<int:booking_id>/reschedule", methods=["PATCH"])
@role_required("customer")
def reschedule_booking(booking_id):
    data        = request.get_json(silent=True) or {}
    new_slot_id = data.get("new_slot_id")

    if not new_slot_id:
        return error("new_slot_id is required")

    booking = db.execute(
        """
        SELECT b.id, b.slot_id, b.customer_id, b.status, at.allow_rescheduling
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        JOIN appointment_types at ON at.id=s.appointment_type_id
        WHERE b.id=%s
        """, (booking_id,), fetch="one"
    )
    if not booking:
        return error("Booking not found", 404)
    if not booking["allow_rescheduling"]:
        return error("Rescheduling is not allowed for this service", 403)
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
