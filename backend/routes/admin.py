from flask import Blueprint, request
import db
from utils.auth import role_required
from utils.helpers import success, error

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/stats", methods=["GET"])
@role_required("admin")
def platform_stats():
    stats = db.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM users WHERE role='customer' AND is_active=1)  AS total_customers,
            (SELECT COUNT(*) FROM users WHERE role='organiser' AND is_active=1) AS total_providers,
            (SELECT COUNT(*) FROM users)                                         AS total_users,
            (SELECT COUNT(*) FROM bookings)                                      AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status='completed')             AS completed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status='cancelled')             AS cancelled_bookings,
            (SELECT COUNT(*) FROM appointment_types WHERE is_published=1)        AS published_services,
            (SELECT COUNT(*) FROM appointment_feedback)                          AS total_reviews,
            (SELECT COALESCE(SUM(at.payment_amount), 0)
             FROM bookings b 
             JOIN slots s ON s.id = b.slot_id 
             JOIN appointment_types at ON at.id = s.appointment_type_id
             WHERE b.status IN ('confirmed', 'completed')) AS total_revenue
        """,
        fetch="one",
    )

    daily = db.execute(
        """
        SELECT DATE(booked_at) AS day, COUNT(*) AS bookings
        FROM bookings
        WHERE booked_at >= NOW() - INTERVAL 7 DAY
        GROUP BY day ORDER BY day
        """,
        fetch="all",
    )

    top_providers = db.execute(
        """
        SELECT u.id, u.full_name, pbs.total_reviews, pbs.punctuality_score, pbs.quality_score
        FROM provider_behavioral_scores pbs
        JOIN users u ON u.id=pbs.provider_id
        ORDER BY pbs.total_reviews DESC LIMIT 5
        """,
        fetch="all",
    )

    return success({
        "summary":        dict(stats) if stats else {},
        "daily_bookings": [dict(r) for r in (daily or [])],
        "top_providers":  [dict(r) for r in (top_providers or [])],
    })


@admin_bp.route("/recent-bookings", methods=["GET"])
@role_required("admin")
def recent_bookings():
    rows = db.execute(
        """
        SELECT 
            b.id,
            cu.full_name AS customer,
            at.title AS service,
            pu.full_name AS provider,
            DATE_FORMAT(s.slot_start, '%b %e, %Y') AS date,
            b.status
        FROM bookings b
        JOIN users cu ON cu.id = b.customer_id
        JOIN slots s ON s.id = b.slot_id
        JOIN appointment_types at ON at.id = s.appointment_type_id
        JOIN users pu ON pu.id = at.organiser_id
        ORDER BY b.booked_at DESC
        LIMIT 10
        """,
        fetch="all"
    )
    return success([dict(r) for r in (rows or [])])


@admin_bp.route("/bookings", methods=["GET"])
@role_required("admin")
def admin_bookings():
    rows = db.execute(
        """
        SELECT
            b.id,
            cu.full_name AS customer_name,
            at.title AS service,
            pu.full_name AS provider_name,
            s.slot_start,
            b.status,
            b.payment_status
        FROM bookings b
        JOIN users cu ON cu.id = b.customer_id
        JOIN slots s ON s.id = b.slot_id
        JOIN appointment_types at ON at.id = s.appointment_type_id
        JOIN users pu ON pu.id = at.organiser_id
        ORDER BY b.booked_at DESC
        """,
        fetch="all"
    )
    return success([dict(r) for r in (rows or [])])


@admin_bp.route("/users", methods=["GET"])
@role_required("admin")
def list_users():
    role_filter   = request.args.get("role")
    active_filter = request.args.get("is_active")

    query  = "SELECT id, full_name, email, role, is_active, is_verified, created_at FROM users WHERE 1=1"
    params = []

    if role_filter in ("customer", "organiser", "admin"):
        query += " AND role=%s"
        params.append(role_filter)
    if active_filter is not None:
        query += " AND is_active=%s"
        params.append(1 if active_filter.lower() == "true" else 0)

    query += " ORDER BY created_at DESC"
    rows = db.execute(query, params or None, fetch="all")
    return success([dict(r) for r in (rows or [])])


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["PATCH"])
@role_required("admin")
def toggle_active(user_id):
    if user_id == request.user_id:
        return error("You cannot deactivate your own account")

    user = db.execute("SELECT id, is_active, role FROM users WHERE id=%s", (user_id,), fetch="one")
    if not user:
        return error("User not found", 404)

    new_status = 0 if user["is_active"] else 1
    db.execute("UPDATE users SET is_active=%s WHERE id=%s", (new_status, user_id))
    action = "activated" if new_status else "deactivated"
    return success({"message": f"User {action} successfully.", "is_active": bool(new_status)})


@admin_bp.route("/users/<int:user_id>/role", methods=["PATCH"])
@role_required("admin")
def change_role(user_id):
    data     = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip().lower()

    if new_role not in ("customer", "organiser", "admin"):
        return error("role must be customer, organiser, or admin")
    if user_id == request.user_id:
        return error("You cannot change your own role")

    user = db.execute("SELECT id FROM users WHERE id=%s", (user_id,), fetch="one")
    if not user:
        return error("User not found", 404)

    db.execute("UPDATE users SET role=%s WHERE id=%s", (new_role, user_id))

    if new_role == "organiser":
        db.execute("INSERT IGNORE INTO provider_info (provider_id) VALUES (%s)", (user_id,))
        db.execute("INSERT IGNORE INTO provider_behavioral_scores (provider_id) VALUES (%s)", (user_id,))
    if new_role == "customer":
        db.execute("INSERT IGNORE INTO user_preferences (user_id) VALUES (%s)", (user_id,))

    return success({"message": f"Role updated to '{new_role}'."})


@admin_bp.route("/providers", methods=["GET"])
@role_required("admin")
def list_providers():
    rows = db.execute(
        """
        SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
               pi.has_parking, pi.is_wheelchair_accessible, pi.noise_level,
               pbs.total_reviews, pbs.punctuality_score, pbs.quality_score,
               (SELECT COUNT(*) FROM appointment_types at WHERE at.organiser_id=u.id) AS total_services,
               (SELECT COUNT(*) FROM appointment_types at WHERE at.organiser_id=u.id AND at.is_published=1) AS published_services
        FROM users u
        LEFT JOIN provider_info pi ON pi.provider_id=u.id
        LEFT JOIN provider_behavioral_scores pbs ON pbs.provider_id=u.id
        WHERE u.role='organiser'
        ORDER BY u.created_at DESC
        """,
        fetch="all",
    )
    return success([dict(r) for r in (rows or [])])
