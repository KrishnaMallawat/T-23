from flask import Flask
from flask_cors import CORS
from config import FLASK_DEBUG, FRONTEND_URL

from routes.auth         import auth_bp
from routes.appointments import appointments_bp
from routes.slots        import slots_bp
from routes.bookings     import bookings_bp
from routes.feedback     import feedback_bp
from routes.providers    import providers_bp
from routes.admin        import admin_bp
from routes.users        import users_bp

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": [FRONTEND_URL, FRONTEND_URL.replace("localhost", "127.0.0.1"), FRONTEND_URL.replace("127.0.0.1", "localhost")]}},
    supports_credentials=True
)

# ── Register blueprints ───────────────────────────────────────────────────────
app.register_blueprint(auth_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(slots_bp)
app.register_blueprint(bookings_bp)
app.register_blueprint(feedback_bp)
app.register_blueprint(providers_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(users_bp)


# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    from config import APP_NAME
    return {"status": "ok", "app": f"{APP_NAME} API"}, 200


# ── 404 handler ───────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return {"success": False, "error": "Route not found"}, 404


# ── 405 handler ───────────────────────────────────────────────────────────────
@app.errorhandler(405)
def method_not_allowed(e):
    return {"success": False, "error": "Method not allowed"}, 405


if __name__ == "__main__":
    app.run(debug=FLASK_DEBUG, port=5000)
