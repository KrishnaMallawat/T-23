from flask import Blueprint, request
import db
from utils.auth import role_required
from utils.helpers import success, error

feedback_bp = Blueprint("feedback", __name__, url_prefix="/api")


@feedback_bp.route("/feedback/<int:booking_id>", methods=["POST"])
@role_required("customer")
def submit_feedback(booking_id):
    data = request.get_json(silent=True) or {}

    booking = db.execute(
        """
        SELECT b.id, b.status, b.customer_id, s.organiser_id
        FROM bookings b JOIN slots s ON s.id=b.slot_id
        WHERE b.id=%s
        """,
        (booking_id,), fetch="one",
    )
    if not booking:
        return error("Booking not found", 404)
    if booking["customer_id"] != request.user_id:
        return error("Forbidden", 403)
    if booking["status"] not in ("confirmed", "completed"):
        return error("Feedback can only be submitted for confirmed or completed bookings")

    existing = db.execute(
        "SELECT id FROM appointment_feedback WHERE booking_id=%s", (booking_id,), fetch="one"
    )
    if existing:
        return error("Feedback already submitted for this booking", 409)

    punctuality     = data.get("punctuality_rating")
    quality         = data.get("quality_rating")
    environment     = data.get("environment_rating")
    session_overran = bool(data.get("session_overran", False))
    avg_delay       = int(data.get("avg_delay_mins", 0))
    style           = data.get("provider_style")
    text_review     = (data.get("text_review") or "").strip() or None

    valid_styles = ("professional", "friendly", "technical", "casual", None)
    if style not in valid_styles:
        return error("provider_style must be professional, friendly, technical, or casual")

    for label, val in [("punctuality_rating", punctuality),
                       ("quality_rating",     quality),
                       ("environment_rating", environment)]:
        if val is not None and not (1 <= int(val) <= 5):
            return error(f"{label} must be between 1 and 5")

    # No user_id stored — privacy by design
    db.execute(
        """
        INSERT INTO appointment_feedback
            (booking_id, punctuality_rating, quality_rating, environment_rating,
             session_overran, avg_delay_mins, provider_style, text_review)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (booking_id, punctuality, quality, environment,
         session_overran, avg_delay, style, text_review),
    )

    db.execute("UPDATE bookings SET status='completed' WHERE id=%s", (booking_id,))
    _recalculate_provider_scores(booking["organiser_id"])

    return success({"message": "Thank you for your feedback!"})


def _recalculate_provider_scores(provider_id: int):
    """Recompute aggregate scores — called once per submission, reads are always fast."""
    agg = db.execute(
        """
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
        """,
        (provider_id,), fetch="one",
    )
    if not agg or not agg["total_reviews"]:
        return

    db.execute(
        """
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
        """,
        (provider_id, agg["punctuality_score"], agg["avg_delay_mins"],
         agg["overrun_rate"], agg["quality_score"], agg["environment_score"],
         agg["total_reviews"]),
    )
