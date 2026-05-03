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
            "punctuality_weight": 0, "quality_weight": 0,
            "environment_weight": 0, "parking_weight": 0, "accessibility_weight": 0
        })
    return success(row)

@users_bp.route("/me/preferences", methods=["PUT"])
@login_required
@role_required("customer")
def update_preferences():
    data = request.get_json(silent=True) or {}
    
    db.execute("""
        INSERT INTO user_preferences (user_id, punctuality_weight, quality_weight, environment_weight, parking_weight, accessibility_weight)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        punctuality_weight=VALUES(punctuality_weight),
        quality_weight=VALUES(quality_weight),
        environment_weight=VALUES(environment_weight),
        parking_weight=VALUES(parking_weight),
        accessibility_weight=VALUES(accessibility_weight)
    """, (
        request.user_id,
        int(data.get("punctuality_weight", 0)),
        int(data.get("quality_weight", 0)),
        int(data.get("environment_weight", 0)),
        int(data.get("parking_weight", 0)),
        int(data.get("accessibility_weight", 0))
    ))
    
    return success({"message": "Preferences updated successfully."})
