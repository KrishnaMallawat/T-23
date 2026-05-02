from flask import Blueprint, request
import db
from utils.auth import login_required, role_required
from utils.helpers import success, error

providers_bp = Blueprint("providers", __name__, url_prefix="/api")


@providers_bp.route("/providers", methods=["GET"])
@login_required
def list_providers():
    punctuality_min = request.args.get("punctuality_min", type=float)
    has_parking     = request.args.get("has_parking")
    noise_level     = request.args.get("noise_level")
    cares_match     = request.args.get("cares_match", "").lower() == "true"

    query = """
        SELECT u.id, u.full_name,
               pi.bio, pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level,
               pbs.punctuality_score, pbs.avg_delay_mins, pbs.overrun_rate,
               pbs.quality_score, pbs.environment_score, pbs.total_reviews
        FROM users u
        JOIN provider_info pi ON pi.provider_id=u.id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id=u.id
        WHERE u.role='organiser' AND u.is_active=1
    """
    params = []

    if punctuality_min is not None:
        query += " AND COALESCE(pbs.punctuality_score, 0) >= %s"
        params.append(punctuality_min)
    if has_parking is not None:
        query += " AND pi.has_parking=%s"
        params.append(1 if has_parking.lower() == "true" else 0)
    if noise_level in ("quiet", "moderate", "loud"):
        query += " AND pi.noise_level=%s"
        params.append(noise_level)

    # Preference-based personalised filtering (the differentiating feature)
    if cares_match and request.user_role == "customer":
        prefs = db.execute(
            "SELECT * FROM user_preferences WHERE user_id=%s", (request.user_id,), fetch="one"
        )
        if prefs:
            if prefs["cares_punctuality"]:
                query += " AND COALESCE(pbs.punctuality_score, 0) >= 3.5"
            if prefs["cares_quiet_env"]:
                query += " AND pi.noise_level='quiet'"
            if prefs["cares_parking"]:
                query += " AND pi.has_parking=1"
            if prefs["cares_accessibility"]:
                query += " AND pi.is_wheelchair_accessible=1"
            if prefs["cares_quality"]:
                query += " AND COALESCE(pbs.quality_score, 0) >= 3.5"

    query += " ORDER BY COALESCE(pbs.punctuality_score, 0) DESC, u.full_name"
    rows = db.execute(query, params or None, fetch="all")
    return success([dict(r) for r in (rows or [])])


@providers_bp.route("/providers/<int:provider_id>", methods=["GET"])
@login_required
def get_provider(provider_id):
    provider = db.execute(
        """
        SELECT u.id, u.full_name, u.created_at AS member_since,
               pi.bio, pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level,
               pbs.punctuality_score, pbs.avg_delay_mins, pbs.overrun_rate,
               pbs.quality_score, pbs.environment_score, pbs.total_reviews
        FROM users u
        JOIN provider_info pi ON pi.provider_id=u.id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id=u.id
        WHERE u.id=%s AND u.role='organiser' AND u.is_active=1
        """,
        (provider_id,), fetch="one",
    )
    if not provider:
        return error("Provider not found", 404)

    services = db.execute(
        """
        SELECT id, title, description, duration_mins, max_capacity,
               payment_requirement, payment_amount
        FROM appointment_types WHERE organiser_id=%s AND is_published=1 ORDER BY title
        """,
        (provider_id,), fetch="all",
    )
    result = dict(provider)
    result["services"] = [dict(s) for s in (services or [])]
    return success(result)


@providers_bp.route("/users/me", methods=["GET"])
@login_required
def get_me():
    user = db.execute(
        "SELECT id, full_name, email, role, created_at FROM users WHERE id=%s",
        (request.user_id,), fetch="one",
    )
    return success(dict(user))


@providers_bp.route("/users/me", methods=["PUT"])
@login_required
def update_me():
    data      = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    if not full_name:
        return error("full_name is required")
    db.execute("UPDATE users SET full_name=%s WHERE id=%s", (full_name, request.user_id))
    return success({"message": "Profile updated."})


@providers_bp.route("/users/me/preferences", methods=["GET"])
@role_required("customer")
def get_preferences():
    prefs = db.execute(
        "SELECT * FROM user_preferences WHERE user_id=%s", (request.user_id,), fetch="one"
    )
    if not prefs:
        return error("Preferences not found", 404)
    return success(dict(prefs))


@providers_bp.route("/users/me/preferences", methods=["PUT"])
@role_required("customer")
def update_preferences():
    data   = request.get_json(silent=True) or {}
    fields = ["cares_punctuality","cares_quality","cares_quiet_env","cares_parking","cares_accessibility"]
    vals   = {f: bool(data.get(f, False)) for f in fields}

    db.execute(
        """
        INSERT INTO user_preferences (user_id, cares_punctuality, cares_quality,
            cares_quiet_env, cares_parking, cares_accessibility)
        VALUES (%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            cares_punctuality=VALUES(cares_punctuality),
            cares_quality=VALUES(cares_quality),
            cares_quiet_env=VALUES(cares_quiet_env),
            cares_parking=VALUES(cares_parking),
            cares_accessibility=VALUES(cares_accessibility)
        """,
        (request.user_id, *vals.values()),
    )
    return success({"message": "Preferences updated.", "preferences": vals})


@providers_bp.route("/organiser/profile", methods=["PUT"])
@role_required("organiser")
def update_provider_info():
    data       = request.get_json(silent=True) or {}
    bio        = (data.get("bio") or "").strip() or None
    has_park   = bool(data.get("has_parking", False))
    wheelchair = bool(data.get("is_wheelchair_accessible", False))
    noise      = data.get("noise_level", "moderate")

    if noise not in ("quiet", "moderate", "loud"):
        return error("noise_level must be quiet, moderate, or loud")

    db.execute(
        """
        INSERT INTO provider_info (provider_id, bio, has_parking, is_wheelchair_accessible, noise_level)
        VALUES (%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            bio=VALUES(bio), has_parking=VALUES(has_parking),
            is_wheelchair_accessible=VALUES(is_wheelchair_accessible),
            noise_level=VALUES(noise_level)
        """,
        (request.user_id, bio, has_park, wheelchair, noise),
    )
    return success({"message": "Provider profile updated."})


@providers_bp.route("/organiser/stats", methods=["GET"])
@role_required("organiser")
def organiser_stats():
    stats = db.execute(
        """
        SELECT
            COUNT(DISTINCT b.id)                                          AS total_bookings,
            COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END) AS completed,
            COUNT(DISTINCT CASE WHEN b.status='cancelled' THEN b.id END) AS cancelled,
            COUNT(DISTINCT b.customer_id)                                 AS unique_customers,
            ROUND(AVG(pbs.punctuality_score), 2)                          AS avg_punctuality,
            ROUND(AVG(pbs.quality_score), 2)                              AS avg_quality,
            ROUND(AVG(pbs.environment_score), 2)                          AS avg_environment,
            ROUND(AVG(pbs.parking_score), 2)                              AS avg_parking,
            ROUND(AVG(pbs.accessibility_score), 2)                        AS avg_accessibility,
            COALESCE(MAX(pbs.total_reviews), 0)                           AS total_reviews
        FROM bookings b
        JOIN slots s ON s.id=b.slot_id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id=s.organiser_id
        WHERE s.organiser_id=%s
        """,
        (request.user_id,), fetch="one",
    )

    peak = db.execute(
        """
        SELECT HOUR(s.slot_start) AS hour, COUNT(*) AS booking_count
        FROM bookings b JOIN slots s ON s.id=b.slot_id
        WHERE s.organiser_id=%s AND b.status != 'cancelled'
        GROUP BY hour ORDER BY booking_count DESC LIMIT 5
        """,
        (request.user_id,), fetch="all",
    )

    return success({
        "summary":    dict(stats) if stats else {},
        "peak_hours": [dict(r) for r in (peak or [])],
    })
