from flask import Flask, render_template, Response, send_file
from picamera2 import Picamera2
import cv2
import os
from flask import redirect, url_for
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Setup the camera
picam2 = Picamera2()
picam2.preview_configuration.main.size = (640, 480)
picam2.preview_configuration.main.format = "RGB888"
picam2.preview_configuration.align()
picam2.configure("preview")
picam2.start()
STATIC_IMAGE_PATH = 'static/img.jpg'
os.makedirs('static', exist_ok=True)

def gen_frames():
    while True:
        frame = picam2.capture_array()
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/image')
def capture_image():
    try:
        # Capture an image and save it
        image = picam2.capture_array()
        if image is None or image.size == 0:
            return "Failed to capture image", 500
        cv2.imwrite(STATIC_IMAGE_PATH, image)
        # Redirect to the saved image
        return redirect(url_for('static', filename='img.jpg'))
    except Exception as e:
        return f"Error capturing image: {str(e)}", 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
