import RPi.GPIO as GPIO
import time
import threading
import logging
import json
import requests
import numpy as np
from adafruit_ads1x15.analog_in import AnalogIn
import adafruit_ads1x15.ads1115 as ADS
import board
import busio

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ph_control.log"),
        logging.StreamHandler()
    ]
)

# GPIO Setup
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Pin Definitions
PH_SERVO_PIN = 12       # UP AND DOWN PH SENSOR
PH_UPPER_PUMP = 18      # PH UPPER SOLUTION DOSE
PH_LOWER_PUMP = 24      # PH LOWER SOLUTION DOSE
WATER_PUMP = 27         # WATER PUMP

# API endpoint
API_ENDPOINT = "https://your-server.com/api/ph-data"
DEVICE_ID = "rpi_hydroponics_1"

# pH thresholds
PH_LOW_THRESHOLD = 6.5
PH_HIGH_THRESHOLD = 7.5
PH_STABILITY_THRESHOLD = 0.3  # Maximum allowed standard deviation for stable reading

# Initialize I2C for ADS1115 (ADC for pH sensor)
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c)
ph_channel = AnalogIn(ads, ADS.P0)  # Connect pH sensor to A0 on ADS1115

# Set up GPIO pins
GPIO.setup(PH_SERVO_PIN, GPIO.OUT)
GPIO.setup(PH_UPPER_PUMP, GPIO.OUT)
GPIO.setup(PH_LOWER_PUMP, GPIO.OUT)
GPIO.setup(WATER_PUMP, GPIO.OUT)

# Initialize servo
ph_servo = GPIO.PWM(PH_SERVO_PIN, 50)  # 50Hz PWM frequency
ph_servo.start(7.5)  # Initialize to middle position (neutral)

def read_ph():
    """
    Read pH value from analog sensor connected to ADS1115
    Convert voltage to pH value based on calibration
    """
    voltage = ph_channel.voltage
    
    # Convert voltage to pH based on calibration
    # This is an example conversion - you'll need to calibrate your sensor
    # pH sensors typically output 0V at pH 14 and ~3V at pH 0
    ph_value = 14 - (voltage * 14 / 3.3)
    
    return ph_value

def adjust_ph_servo(position):
    """
    Adjust the servo motor for pH sensor position
    position: 0 (lowest) to 100 (highest)
    """
    # Convert position (0-100) to servo duty cycle (typically 2.5-12.5)
    duty_cycle = 2.5 + (position / 10)
    ph_servo.ChangeDutyCycle(duty_cycle)
    time.sleep(0.5)  # Give servo time to move
    ph_servo.ChangeDutyCycle(0)  # Stop servo jitter

def get_stable_ph_reading(max_dip_time=300, retry_time=60):
    """
    Get a stable pH reading by collecting readings over time
    max_dip_time: Maximum time in seconds to keep sensor dipped (5 minutes)
    retry_time: Additional time in seconds if stability not reached (1 minute)
    Returns: Stable pH value or None if stability cannot be achieved
    """
    logging.info("Lowering pH sensor for reading")
    adjust_ph_servo(80)  # Lower position to dip sensor
    time.sleep(2)  # Initial stabilization
    
    readings = []
    start_time = time.time()
    max_end_time = start_time + max_dip_time
    
    # Take readings for up to max_dip_time seconds
    while time.time() < max_end_time:
        ph = read_ph()
        readings.append(ph)
        logging.debug(f"pH reading: {ph:.2f}")
        
        # After collecting at least 10 readings, check for stability
        if len(readings) >= 10:
            # Check the last 10 readings for stability
            recent_readings = readings[-10:]
            std_dev = np.std(recent_readings)
            
            if std_dev <= PH_STABILITY_THRESHOLD:
                avg_ph = np.mean(recent_readings)
                logging.info(f"Stable pH reading achieved: {avg_ph:.2f} (std dev: {std_dev:.3f})")
                adjust_ph_servo(20)  # Raise sensor
                return avg_ph
        
        time.sleep(1)  # Take a reading every second
    
    # If we get here, we didn't achieve stability in the allotted time
    logging.warning("Could not achieve stable pH reading in primary window, retrying...")
    
    # Try for additional retry_time seconds
    retry_end_time = time.time() + retry_time
    while time.time() < retry_end_time:
        ph = read_ph()
        readings.append(ph)
        
        if len(readings) >= 10:
            recent_readings = readings[-10:]
            std_dev = np.std(recent_readings)
            
            if std_dev <= PH_STABILITY_THRESHOLD:
                avg_ph = np.mean(recent_readings)
                logging.info(f"Stable pH reading achieved in retry window: {avg_ph:.2f} (std dev: {std_dev:.3f})")
                adjust_ph_servo(20)  # Raise sensor
                return avg_ph
        
        time.sleep(1)
    
    # If we still don't have stability, return the average of all readings as a fallback
    avg_ph = np.mean(readings)
    logging.warning(f"Could not achieve stability. Using average of all readings: {avg_ph:.2f}")
    adjust_ph_servo(20)  # Raise sensor
    return avg_ph

def adjust_ph_level(ph_value):
    """
    Adjust pH level based on the measured value
    Returns: True if adjustment was made, False otherwise
    """
    if ph_value < PH_LOW_THRESHOLD:
        logging.info(f"pH is low ({ph_value:.2f}). Adding pH UP solution.")
        
        # Continue adding pH UP solution until threshold is reached or max attempts exceeded
        attempts = 0
        while attempts < 5:  # Maximum 5 attempts to avoid overadjustment
            GPIO.output(PH_UPPER_PUMP, GPIO.HIGH)  # Turn on the upper pH solution pump
            time.sleep(5)  # Pump for 5 seconds
            GPIO.output(PH_UPPER_PUMP, GPIO.LOW)  # Turn off the upper pH solution pump
            
            # Mix solution
            GPIO.output(WATER_PUMP, GPIO.HIGH)
            time.sleep(10)  # Run water pump for 10 seconds to mix
            GPIO.output(WATER_PUMP, GPIO.LOW)
            
            # Wait for solution to mix fully
            time.sleep(60)
            
            # Check pH again
            new_ph = get_stable_ph_reading(max_dip_time=120, retry_time=30)  # Shorter readings after adjustments
            logging.info(f"After pH UP addition, new pH: {new_ph:.2f}")
            
            if new_ph >= PH_LOW_THRESHOLD:
                logging.info("pH is now within acceptable range")
                return True
                
            attempts += 1
            logging.info(f"pH still low after attempt {attempts}. Making another adjustment.")
        
        logging.warning("Maximum pH UP adjustment attempts reached")
        return True
        
    elif ph_value > PH_HIGH_THRESHOLD:
        logging.info(f"pH is high ({ph_value:.2f}). Adding pH DOWN solution.")
        
        # Continue adding pH DOWN solution until threshold is reached or max attempts exceeded
        attempts = 0
        while attempts < 5:  # Maximum 5 attempts to avoid overadjustment
            GPIO.output(PH_LOWER_PUMP, GPIO.HIGH)  # Turn on the lower pH solution pump
            time.sleep(5)  # Pump for 5 seconds
            GPIO.output(PH_LOWER_PUMP, GPIO.LOW)  # Turn off the lower pH solution pump
            
            # Mix solution
            GPIO.output(WATER_PUMP, GPIO.HIGH)
            time.sleep(10)  # Run water pump for 10 seconds to mix
            GPIO.output(WATER_PUMP, GPIO.LOW)
            
            # Wait for solution to mix fully
            time.sleep(60)
            
            # Check pH again
            new_ph = get_stable_ph_reading(max_dip_time=120, retry_time=30)  # Shorter readings after adjustments
            logging.info(f"After pH DOWN addition, new pH: {new_ph:.2f}")
            
            if new_ph <= PH_HIGH_THRESHOLD:
                logging.info("pH is now within acceptable range")
                return True
                
            attempts += 1
            logging.info(f"pH still high after attempt {attempts}. Making another adjustment.")
            
        logging.warning("Maximum pH DOWN adjustment attempts reached")
        return True
        
    else:
        logging.info(f"pH is within range ({ph_value:.2f}). No adjustment needed.")
        return False

def send_data_to_backend(ph_value, adjustment_made):
    """
    Send pH data to backend server
    Returns: True if successful, False otherwise
    """
    try:
        data = {
            "timestamp": time.time(),
            "ph_value": ph_value,
            "adjustment_made": adjustment_made,
            "device_id": DEVICE_ID
        }
        
        response = requests.post(API_ENDPOINT, json=data, timeout=10)
        
        if response.status_code == 200:
            logging.info("Successfully sent data to backend")
            
            # Check if backend requested specific pH adjustments
            response_data = response.json()
            if "action" in response_data:
                if response_data["action"] == "adjust_up":
                    logging.info("Backend requested pH UP adjustment")
                    GPIO.output(PH_UPPER_PUMP, GPIO.HIGH)
                    time.sleep(5)  # Keep motor on for 5 seconds as requested
                    GPIO.output(PH_UPPER_PUMP, GPIO.LOW)
                    
                    # Mix solution
                    GPIO.output(WATER_PUMP, GPIO.HIGH)
                    time.sleep(10)
                    GPIO.output(WATER_PUMP, GPIO.LOW)
                    
                elif response_data["action"] == "adjust_down":
                    logging.info("Backend requested pH DOWN adjustment")
                    GPIO.output(PH_LOWER_PUMP, GPIO.HIGH)
                    time.sleep(5)  # Keep motor on for 5 seconds as requested
                    GPIO.output(PH_LOWER_PUMP, GPIO.LOW)
                    
                    # Mix solution
                    GPIO.output(WATER_PUMP, GPIO.HIGH)
                    time.sleep(10)
                    GPIO.output(WATER_PUMP, GPIO.LOW)
                    
            return True
        else:
            logging.error(f"Failed to send data to backend. Status code: {response.status_code}")
            return False
    except Exception as e:
        logging.error(f"Error sending data to backend: {e}")
        return False

def ph_check():
    """
    Main pH checking function: measures pH and adjusts as needed
    """
    try:
        # Get stable pH reading
        ph_value = get_stable_ph_reading()
        
        if ph_value is not None:
            # Adjust pH if needed and track if adjustment was made
            adjustment_made = adjust_ph_level(ph_value)
            
            # Send data to backend
            send_data_to_backend(ph_value, adjustment_made)
        else:
            logging.error("Failed to get stable pH reading")
            
    except Exception as e:
        logging.error(f"Error in pH check: {e}")

def monitor_ph(interval=1800):
    """
    Continuously monitor pH at specified interval
    interval: seconds between checks (default 30 minutes)
    """
    while True:
        ph_check()
        time.sleep(interval)

if __name__ == "__main__":
    try:
        logging.info("Starting pH monitoring system")
        # Run pH monitoring in a separate thread
        ph_thread = threading.Thread(target=monitor_ph)
        ph_thread.daemon = True
        ph_thread.start()
        
        # Main thread can handle other operations or user interface
        while True:
            time.sleep(60)
            
    except KeyboardInterrupt:
        logging.info("System shutdown by user")
    except Exception as e:
        logging.error(f"System error: {e}")
    finally:
        ph_servo.stop()
        GPIO.cleanup()
        logging.info("System shutdown complete")