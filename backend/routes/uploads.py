import os
import uuid
from flask import Blueprint, request
from werkzeug.utils import secure_filename
from utils.auth import login_required
from utils.helpers import success, error

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api")

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'frontend', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@uploads_bp.route("/upload", methods=["POST"])
@login_required
def upload_file():
    if 'file' not in request.files:
        return error("No file part", 400)
    file = request.files['file']
    if file.filename == '':
        return error("No selected file", 400)
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add a unique uuid to avoid naming collisions
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        
        file.save(os.path.join(UPLOAD_FOLDER, unique_name))
        
        return success({
            "url": f"/uploads/{unique_name}",
            "message": "File uploaded successfully"
        })
        
    return error("Invalid file type", 400)
