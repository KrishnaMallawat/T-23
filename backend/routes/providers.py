from flask import Blueprint, request
import db
from utils.auth import login_required, role_required, _extract_payload
from utils.helpers import success, error

providers_bp = Blueprint("providers", __name__, url_prefix="/api")


@providers_bp.route("/providers", methods=["GET"])
def list_providers():
    # Temporary overrides via URL
    w_punc = request.args.get("punctuality_weight", type=int)
    w_qual = request.args.get("quality_weight", type=int)
    w_env  = request.args.get("environment_weight", type=int)
    w_park = request.args.get("parking_weight", type=int)
    w_acc  = request.args.get("accessibility_weight", type=int)
    
    # Filter overrides
    category_filter = request.args.get("category")
    payment_filter = request.args.get("payment_type")

    # Check DB preferences if not explicitly overridden
    if any(w is None for w in [w_punc, w_qual, w_env, w_park, w_acc]):
        payload, _, _ = _extract_payload()
        if payload and payload.get("role") == "customer":
            prefs = db.execute(
                "SELECT * FROM user_preferences WHERE user_id=%s", (payload["sub"],), fetch="one"
            )
            if prefs:
                w_punc = w_punc if w_punc is not None else prefs["punctuality_weight"]
                w_qual = w_qual if w_qual is not None else prefs["quality_weight"]
                w_env  = w_env  if w_env  is not None else prefs["environment_weight"]
                w_park = w_park if w_park is not None else prefs["parking_weight"]
                w_acc  = w_acc  if w_acc  is not None else prefs["accessibility_weight"]

    # Default to equal weighting (1) if no profile and no URL params
    w_punc = w_punc if w_punc is not None else 1
    w_qual = w_qual if w_qual is not None else 1
    w_env  = w_env  if w_env  is not None else 1
    w_park = w_park if w_park is not None else 1
    w_acc  = w_acc  if w_acc  is not None else 1

    denom = w_punc + w_qual + w_env + w_park + w_acc
    match_sql = "100"
    if denom > 0:
        match_sql = f"""(
            (COALESCE(pbs.punctuality_score, 0) * {w_punc}) +
            (COALESCE(pbs.quality_score, 0) * {w_qual}) +
            (COALESCE(pbs.environment_score, 0) * {w_env}) +
            (pi.has_parking * 100 * {w_park}) +
            (pi.is_wheelchair_accessible * 100 * {w_acc})
        ) / {denom}"""

    where_clauses = ["u.role='organiser'", "u.is_active=1"]
    params = []

    if category_filter and category_filter.lower() != "all":
        where_clauses.append("EXISTS (SELECT 1 FROM appointment_types at WHERE at.organiser_id = u.id AND at.is_published=1 AND at.category = %s)")
        params.append(category_filter)

    if payment_filter and payment_filter.lower() != "all":
        where_clauses.append("EXISTS (SELECT 1 FROM appointment_types at WHERE at.organiser_id = u.id AND at.is_published=1 AND at.payment_requirement = %s)")
        params.append(payment_filter)

    query = f"""
        SELECT u.id, u.full_name,
               pi.bio, pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level,
               pbs.punctuality_score, pbs.avg_delay_mins, pbs.overrun_rate,
               pbs.quality_score, pbs.environment_score, pbs.total_reviews,
               {match_sql} AS match_percentage
        FROM users u
        JOIN provider_info pi ON pi.provider_id=u.id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id=u.id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY match_percentage DESC
    """
    rows = db.execute(query, tuple(params), fetch="all")
    return success([dict(r) for r in (rows or [])])


@providers_bp.route("/providers/<int:provider_id>", methods=["GET"])
@login_required
def get_provider(provider_id):
    provider = db.execute(
        """
        SELECT u.id, u.full_name, u.email, u.created_at AS member_since,
               pi.bio, pi.address, pi.phone, pi.has_parking,
               pi.is_wheelchair_accessible, pi.noise_level,
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
    fields = ["punctuality_weight", "quality_weight", "environment_weight", "parking_weight", "accessibility_weight"]
    vals   = {f: int(data.get(f, 0)) for f in fields}

    for f, val in vals.items():
        if not (0 <= val <= 100):
            return error(f"{f} must be between 0 and 100")

    db.execute(
        """
        INSERT INTO user_preferences (user_id, punctuality_weight, quality_weight,
            environment_weight, parking_weight, accessibility_weight)
        VALUES (%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            punctuality_weight=VALUES(punctuality_weight),
            quality_weight=VALUES(quality_weight),
            environment_weight=VALUES(environment_weight),
            parking_weight=VALUES(parking_weight),
            accessibility_weight=VALUES(accessibility_weight)
        """,
        (request.user_id, *vals.values()),
    )
    return success({"message": "Preferences updated.", "preferences": vals})


@providers_bp.route("/organiser/profile", methods=["PUT"])
@role_required("organiser")
def update_provider_info():
    data       = request.get_json(silent=True) or {}
    bio        = (data.get("bio") or "").strip() or None
    address    = (data.get("address") or "").strip() or None
    phone      = (data.get("phone") or "").strip() or None
    has_park   = bool(data.get("has_parking", False))
    wheelchair = bool(data.get("is_wheelchair_accessible", False))
    noise      = data.get("noise_level", "moderate")

    if noise not in ("quiet", "moderate", "loud"):
        return error("noise_level must be quiet, moderate, or loud")

    db.execute(
        """
        INSERT INTO provider_info (provider_id, bio, address, phone, has_parking, is_wheelchair_accessible, noise_level)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE
            bio=VALUES(bio), address=VALUES(address), phone=VALUES(phone),
            has_parking=VALUES(has_parking),
            is_wheelchair_accessible=VALUES(is_wheelchair_accessible),
            noise_level=VALUES(noise_level)
        """,
        (request.user_id, bio, address, phone, has_park, wheelchair, noise),
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
