from flask import Blueprint, request
import db
from utils.auth import login_required, role_required
from utils.helpers import success, error

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

@users_bp.route("/me/preferences", methods=["GET"])
@login_required
@role_required("customer")
def get_preferences():
    row = db.execute(
        "SELECT * FROM user_preferences WHERE user_id=%s",
        (request.user_id,), fetch="one"
    )
    if not row:
        return success({
            "cares_punctuality": 0, "cares_quality": 0,
            "cares_quiet_env": 0, "cares_parking": 0, "cares_accessibility": 0
        })
    return success(row)

@users_bp.route("/me/preferences", methods=["PUT"])
@login_required
@role_required("customer")
def update_preferences():
    data = request.get_json(silent=True) or {}
    
    db.execute("""
        INSERT INTO user_preferences (user_id, cares_punctuality, cares_quality, cares_quiet_env, cares_parking, cares_accessibility)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        cares_punctuality=VALUES(cares_punctuality),
        cares_quality=VALUES(cares_quality),
        cares_quiet_env=VALUES(cares_quiet_env),
        cares_parking=VALUES(cares_parking),
        cares_accessibility=VALUES(cares_accessibility)
    """, (
        request.user_id,
        int(bool(data.get("cares_punctuality"))),
        int(bool(data.get("cares_quality"))),
        int(bool(data.get("cares_quiet_env"))),
        int(bool(data.get("cares_parking"))),
        int(bool(data.get("cares_accessibility")))
    ))
    
    return success({"message": "Preferences updated successfully."})
