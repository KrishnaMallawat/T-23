"""
CuratedSlot (T-23) — Flask Application Entry Point
Run from the backend/ directory:  python app.py
"""

from flask import Flask
from flask_cors import CORS

from config import FLASK_DEBUG, FRONTEND_URL

# ── Import blueprints ─────────────────────────────────────────
from routes.auth         import auth_bp
from routes.providers    import providers_bp
from routes.appointments import appointments_bp
from routes.bookings     import bookings_bp
from routes.slots        import slots_bp
from routes.feedback     import feedback_bp
from routes.admin        import admin_bp

# ── Create app ────────────────────────────────────────────────
app = Flask(__name__)

# Allow requests from the frontend (Live Server at :5500)
CORS(app, origins=[FRONTEND_URL, "http://127.0.0.1:5500", "http://localhost:5500"],
     supports_credentials=True)

# ── Register blueprints ───────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(providers_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(bookings_bp)
app.register_blueprint(slots_bp)
app.register_blueprint(feedback_bp)
app.register_blueprint(admin_bp)


import traceback
from flask import jsonify

@app.errorhandler(Exception)
def handle_exception(e):
    # Return JSON instead of HTML for HTTP 500
    return jsonify({"success": False, "error": str(e), "traceback": traceback.format_exc()}), 500

# ── Health check ─────────────────────────────────────────────
@app.route("/api/health")
def health():
    return {"status": "ok", "app": "CuratedSlot"}, 200


# ── Run ───────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=FLASK_DEBUG)
