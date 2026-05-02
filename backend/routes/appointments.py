from flask import Blueprint, request
import db
from utils.auth import login_required, role_required
from utils.helpers import generate_share_token, success, error

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api")


@appointments_bp.route("/appointments", methods=["GET"])
@role_required("organiser", "admin")
def list_appointments():
    rows = db.execute(
        """
        SELECT id, title, description, duration_mins, is_published,
               payment_requirement, payment_amount, manual_confirmation,
               max_capacity, share_token, created_at
        FROM appointment_types WHERE organiser_id=%s ORDER BY created_at DESC
        """,
        (request.user_id,), fetch="all",
    )
    return success([dict(r) for r in (rows or [])])


@appointments_bp.route("/appointments", methods=["POST"])
@role_required("organiser")
def create_appointment():
    data        = request.get_json(silent=True) or {}
    title       = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    duration    = data.get("duration_mins")
    max_cap     = data.get("max_capacity", 1)
    pay_req     = data.get("payment_requirement", "none")
    pay_amt     = float(data.get("payment_amount", 0))
    manual      = bool(data.get("manual_confirmation", False))

    if not title:
        return error("title is required")
    if not duration or int(duration) <= 0:
        return error("duration_mins must be a positive integer")

    share_token = generate_share_token()
    appt_id = db.execute(
        """
        INSERT INTO appointment_types
            (organiser_id, title, description, duration_mins, max_capacity,
             payment_requirement, payment_amount, manual_confirmation, share_token)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (request.user_id, title, description, int(duration), int(max_cap),
         pay_req, pay_amt, manual, share_token),
        fetch="lastrowid",
    )
    appt = db.execute(
        "SELECT id, title, duration_mins, is_published, share_token FROM appointment_types WHERE id=%s",
        (appt_id,), fetch="one",
    )
    return success(dict(appt), 201)


@appointments_bp.route("/appointments/<int:appt_id>/publish", methods=["PATCH"])
@role_required("organiser")
def publish_appointment(appt_id):
    appt = db.execute("SELECT organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one")
    if not appt:
        return error("Appointment not found", 404)
    if appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)
    db.execute("UPDATE appointment_types SET is_published=1 WHERE id=%s", (appt_id,))
    return success({"message": "Appointment published."})


@appointments_bp.route("/appointments/<int:appt_id>/unpublish", methods=["PATCH"])
@role_required("organiser")
def unpublish_appointment(appt_id):
    appt = db.execute("SELECT organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one")
    if not appt:
        return error("Appointment not found", 404)
    if appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)
    db.execute("UPDATE appointment_types SET is_published=0 WHERE id=%s", (appt_id,))
    return success({"message": "Appointment unpublished."})


@appointments_bp.route("/appointments/<int:appt_id>/preview", methods=["GET"])
@login_required
def preview_appointment(appt_id):
    appt = db.execute(
        """
        SELECT at.*, u.full_name AS organiser_name,
               pi.bio, pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level
        FROM appointment_types at
        JOIN users u ON u.id = at.organiser_id
        LEFT JOIN provider_info pi ON pi.provider_id = at.organiser_id
        WHERE at.id=%s
        """,
        (appt_id,), fetch="one",
    )
    if not appt:
        return error("Appointment not found", 404)
    return success(dict(appt))


@appointments_bp.route("/appointments/preview/<string:token>", methods=["GET"])
def public_preview(token):
    appt = db.execute(
        """
        SELECT at.id, at.title, at.description, at.duration_mins,
               at.max_capacity, at.payment_requirement, at.payment_amount,
               u.full_name AS organiser_name,
               pi.bio, pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level
        FROM appointment_types at
        JOIN users u ON u.id = at.organiser_id
        LEFT JOIN provider_info pi ON pi.provider_id = at.organiser_id
        WHERE at.share_token=%s
        """,
        (token,), fetch="one",
    )
    if not appt:
        return error("Invalid or expired share link", 404)
    return success(dict(appt))


@appointments_bp.route("/organiser/appointments/<int:appt_id>/share-link", methods=["GET"])
@role_required("organiser")
def get_share_link(appt_id):
    from config import FRONTEND_URL
    appt = db.execute(
        "SELECT share_token, organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one"
    )
    if not appt:
        return error("Appointment not found", 404)
    if appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)
    url = f"{FRONTEND_URL}/preview.html?token={appt['share_token']}"
    return success({"share_url": url})


@appointments_bp.route("/appointments/<int:appt_id>/questions", methods=["GET"])
@login_required
def list_questions(appt_id):
    rows = db.execute(
        "SELECT id, question_text, is_required, order_index FROM appointment_questions WHERE appointment_type_id=%s ORDER BY order_index",
        (appt_id,), fetch="all",
    )
    return success([dict(r) for r in (rows or [])])


@appointments_bp.route("/appointments/<int:appt_id>/questions", methods=["POST"])
@role_required("organiser")
def add_question(appt_id):
    appt = db.execute("SELECT organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one")
    if not appt or appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)

    data          = request.get_json(silent=True) or {}
    question_text = (data.get("question_text") or "").strip()
    is_required   = bool(data.get("is_required", False))
    order_index   = int(data.get("order_index", 0))

    if not question_text:
        return error("question_text is required")

    qid = db.execute(
        "INSERT INTO appointment_questions (appointment_type_id, question_text, is_required, order_index) VALUES (%s,%s,%s,%s)",
        (appt_id, question_text, is_required, order_index),
        fetch="lastrowid",
    )
    q = db.execute(
        "SELECT id, question_text, is_required, order_index FROM appointment_questions WHERE id=%s",
        (qid,), fetch="one",
    )
    return success(dict(q), 201)


@appointments_bp.route("/appointments/<int:appt_id>/questions/<int:qid>", methods=["DELETE"])
@role_required("organiser")
def delete_question(appt_id, qid):
    appt = db.execute("SELECT organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one")
    if not appt or appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)
    db.execute("DELETE FROM appointment_questions WHERE id=%s AND appointment_type_id=%s", (qid, appt_id))
    return success({"message": "Question deleted."})


@appointments_bp.route("/organiser/working-hours", methods=["GET"])
@role_required("organiser")
def get_working_hours():
    rows = db.execute(
        "SELECT id, day_of_week, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time, is_active FROM working_hours WHERE organiser_id=%s ORDER BY day_of_week",
        (request.user_id,), fetch="all",
    )
    return success([dict(r) for r in (rows or [])])


@appointments_bp.route("/organiser/working-hours", methods=["POST"])
@role_required("organiser")
def set_working_hours():
    data        = request.get_json(silent=True) or {}
    day_of_week = data.get("day_of_week")
    start_time  = data.get("start_time")
    end_time    = data.get("end_time")
    is_active   = bool(data.get("is_active", True))

    if day_of_week is None or start_time is None or end_time is None:
        return error("day_of_week, start_time, and end_time are required")
    if not (0 <= int(day_of_week) <= 6):
        return error("day_of_week must be 0 (Mon) to 6 (Sun)")

    db.execute(
        """
        INSERT INTO working_hours (organiser_id, day_of_week, start_time, end_time, is_active)
        VALUES (%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            start_time=VALUES(start_time),
            end_time=VALUES(end_time),
            is_active=VALUES(is_active)
        """,
        (request.user_id, int(day_of_week), start_time, end_time, is_active),
    )
    row = db.execute(
        "SELECT id, day_of_week, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time, is_active FROM working_hours WHERE organiser_id=%s AND day_of_week=%s",
        (request.user_id, int(day_of_week)), fetch="one",
    )
    return success(dict(row))
