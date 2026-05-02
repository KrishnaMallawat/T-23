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
               max_capacity, share_token, created_at, image_url
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
    image_url   = data.get("image_url")
    has_park    = bool(data.get("has_parking", False))
    wheelchair  = bool(data.get("is_wheelchair_accessible", False))
    noise       = data.get("noise_level", "moderate")

    if not title:
        return error("title is required")
    if not duration or int(duration) <= 0:
        return error("duration_mins must be a positive integer")
    if noise not in ("quiet", "moderate", "loud"):
        return error("noise_level must be quiet, moderate, or loud")

    share_token = generate_share_token()
    appt_id = db.execute(
        """
        INSERT INTO appointment_types
            (organiser_id, title, description, duration_mins, max_capacity,
             payment_requirement, payment_amount, manual_confirmation, share_token, image_url,
             has_parking, is_wheelchair_accessible, noise_level)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (request.user_id, title, description, int(duration), int(max_cap),
         pay_req, pay_amt, manual, share_token, image_url, has_park, wheelchair, noise),
        fetch="lastrowid",
    )
    appt = db.execute(
        "SELECT id, title, duration_mins, is_published, share_token, image_url, has_parking, is_wheelchair_accessible, noise_level FROM appointment_types WHERE id=%s",
        (appt_id,), fetch="one",
    )
    return success(dict(appt), 201)


@appointments_bp.route("/appointments/<int:appt_id>", methods=["PATCH"])
@role_required("organiser")
def update_appointment(appt_id):
    appt = db.execute("SELECT organiser_id FROM appointment_types WHERE id=%s", (appt_id,), fetch="one")
    if not appt or appt["organiser_id"] != request.user_id:
        return error("Forbidden", 403)

    data = request.get_json(silent=True) or {}
    
    # We allow updating image_url, title, description, etc.
    fields = []
    params = []
    
    if "image_url" in data:
        fields.append("image_url=%s")
        params.append(data["image_url"])
    if "title" in data and data["title"].strip():
        fields.append("title=%s")
        params.append(data["title"].strip())
    if "description" in data:
        fields.append("description=%s")
        params.append(data["description"].strip())
    if "duration_mins" in data and int(data["duration_mins"]) > 0:
        fields.append("duration_mins=%s")
        params.append(int(data["duration_mins"]))
    if "has_parking" in data:
        fields.append("has_parking=%s")
        params.append(bool(data["has_parking"]))
    if "is_wheelchair_accessible" in data:
        fields.append("is_wheelchair_accessible=%s")
        params.append(bool(data["is_wheelchair_accessible"]))
    if "noise_level" in data and data["noise_level"] in ("quiet", "moderate", "loud"):
        fields.append("noise_level=%s")
        params.append(data["noise_level"])
        
    if not fields:
        return success({"message": "Nothing to update"})
        
    params.append(appt_id)
    query = f"UPDATE appointment_types SET {', '.join(fields)} WHERE id=%s"
    db.execute(query, tuple(params))
    
    return success({"message": "Appointment updated"})


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
               pi.bio, pbs.punctuality_score, pbs.quality_score, pbs.environment_score,
               pbs.avg_delay_mins, pbs.overrun_rate, pbs.total_reviews, pbs.parking_score, pbs.accessibility_score
        FROM appointment_types at
        JOIN users u ON u.id = at.organiser_id
        LEFT JOIN provider_info pi ON pi.provider_id = at.organiser_id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id = at.organiser_id
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
               at.image_url, at.has_parking, at.is_wheelchair_accessible, at.noise_level,
               at.allow_cancellation, at.cancellation_cutoff_hours, at.allow_rescheduling,
               u.full_name AS organiser_name,
               pi.bio, pbs.punctuality_score, pbs.quality_score, pbs.environment_score,
               pbs.avg_delay_mins, pbs.overrun_rate, pbs.total_reviews, pbs.parking_score, pbs.accessibility_score
        FROM appointment_types at
        JOIN users u ON u.id = at.organiser_id
        LEFT JOIN provider_info pi ON pi.provider_id = at.organiser_id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id = at.organiser_id
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
    question_type = data.get("question_type", "text")
    import json
    options_json  = json.dumps(data.get("options", [])) if question_type == "mcq" else None

    if not question_text:
        return error("question_text is required")
    if question_type not in ("text", "mcq"):
        return error("question_type must be text or mcq")

    qid = db.execute(
        "INSERT INTO appointment_questions (appointment_type_id, question_text, is_required, order_index, question_type, options) VALUES (%s,%s,%s,%s,%s,%s)",
        (appt_id, question_text, is_required, order_index, question_type, options_json),
        fetch="lastrowid",
    )
    q = db.execute(
        "SELECT id, question_text, is_required, order_index, question_type, options FROM appointment_questions WHERE id=%s",
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
