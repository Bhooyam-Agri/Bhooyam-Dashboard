from flask import Flask, send_file, redirect, url_for
from flask_cors import CORS  # Import CORS
import cv2
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Use your computer's webcam
cap = cv2.VideoCapture(0)

# Ensure static directory exists
STATIC_IMAGE_PATH = 'static/img.jpg'
os.makedirs('static', exist_ok=True)

@app.route('/capture')
def capture_image():
    ret, frame = cap.read()
    if not ret:
        return "Failed to capture image", 500
    cv2.imwrite(STATIC_IMAGE_PATH, frame)
    return redirect(url_for('static', filename='img.jpg'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004)
