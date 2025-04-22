import time
import requests
import json
import RPi.GPIO as GPIO
import Adafruit_DHT
from datetime import datetime
from w1thermsensor import W1ThermSensor
import ntplib

# WiFi Credentials (Handled via Raspberry Pi OS settings)

# Backend Server URLs
SERVER_URL = "http://192.168.1.8:5001/data/sensor"
WATER_PUMP_CONTROL_URL = "http://192.168.1.8:5001/waterpump"  # Water Pump Control URL
PERISTALTIC_PUMP_CONTROL_URL = "http://192.168.1.8:5001/peristaltic"  # Peristaltic Pump Control URL

# Relay for Water Pump
RELAY_PIN = 15  

# Peristaltic Pumps (L293D Motor Driver)
PUMP1 = 26  # pH Up
PUMP2 = 25  # pH Down
PUMP3 = 14  # Solution A
PUMP4 = 12  # Solution B

# DHT22 Sensor
DHT_PIN = 4
DHT_SENSOR = Adafruit_DHT.DHT22

# Soil Moisture Sensors
SOIL_MOISTURE_PIN_1 = 35
SOIL_MOISTURE_PIN_2 = 34

# MQ135 Air Quality Sensor
MQ135_PIN = 32

# Sunlight Sensor (CJMCU-GUVA-S12SD)
UV_SENSOR_PIN = 33

# EC and pH Sensor
EC_SENSOR_PIN = 36
PH_SENSOR_PIN = 39

# DS18B20 Water Temperature Sensor
water_temp_sensor = W1ThermSensor()

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(RELAY_PIN, GPIO.OUT, initial=GPIO.HIGH)  # Water Pump (Default OFF)

GPIO.setup(PUMP1, GPIO.OUT)
GPIO.setup(PUMP2, GPIO.OUT)
GPIO.setup(PUMP3, GPIO.OUT)
GPIO.setup(PUMP4, GPIO.OUT)

# PWM Setup for Peristaltic Pumps
pwm_pump1 = GPIO.PWM(PUMP1, 1000)
pwm_pump2 = GPIO.PWM(PUMP2, 1000)
pwm_pump3 = GPIO.PWM(PUMP3, 1000)
pwm_pump4 = GPIO.PWM(PUMP4, 1000)

pwm_pump1.start(0)
pwm_pump2.start(0)
pwm_pump3.start(0)
pwm_pump4.start(0)

# Water Pump Timing Variables
pump_start_time = time.time()
pump_state = False

# Default ON/OFF durations (seconds)
PUMP_ON_DURATION = 10 * 60  # 10 min
PUMP_OFF_DURATION = 5 * 60  # 5 min


def get_ntp_time():
    """Fetches current time from an NTP server."""
    try:
        client = ntplib.NTPClient()
        response = client.request('pool.ntp.org', version=3)
        return datetime.fromtimestamp(response.tx_time).strftime('%H:%M:%S')
    except:
        return "00:00:00"


def read_sensors():
    """Reads all sensor data."""
    humidity, temperature = Adafruit_DHT.read(DHT_SENSOR, DHT_PIN)
    water_temperature = water_temp_sensor.get_temperature()  # DS18B20
    soil_moisture_1 = GPIO.input(SOIL_MOISTURE_PIN_1)
    soil_moisture_2 = GPIO.input(SOIL_MOISTURE_PIN_2)
    
    # Mock values for other sensors (Replace with actual ADC readings)
    air_quality = 100  # Placeholder
    uv_intensity = 50  # Placeholder
    ec_value = 1.2  # Placeholder
    ph_value = 6.8  # Placeholder

    return {
        "temperature": temperature if temperature else 0,
        "humidity": humidity if humidity else 0,
        "water_temperature": water_temperature,
        "soil_moisture_1": soil_moisture_1,
        "soil_moisture_2": soil_moisture_2,
        "air_quality": air_quality,
        "uv_intensity": uv_intensity,
        "ec_value": ec_value,
        "ph_value": ph_value,
    }


def send_sensor_data():
    """Sends sensor data to the backend."""
    data = read_sensors()
    try:
        response = requests.post(SERVER_URL, json=data, timeout=5)
        if response.status_code == 200:
            print("Sensor data sent successfully!")
        else:
            print(f"Failed to send sensor data. HTTP {response.status_code}")
    except requests.RequestException as e:
        print(f"Error sending sensor data: {e}")



def control_peristaltic_pump(pump_name, pwm_value, duration):
    """Controls peristaltic pumps using PWM."""
    pump_pwm = None

    if pump_name == "pHUp":
        pump_pwm = pwm_pump1
    elif pump_name == "pHDown":
        pump_pwm = pwm_pump2
    elif pump_name == "SolutionA":
        pump_pwm = pwm_pump3
    elif pump_name == "SolutionB":
        pump_pwm = pwm_pump4

    if pump_pwm:
        print(f"Activating Pump: {pump_name} | PWM: {pwm_value} | Duration: {duration} ms")
        pump_pwm.ChangeDutyCycle(pwm_value)
        time.sleep(duration / 1000.0)  # Convert ms to seconds
        pump_pwm.ChangeDutyCycle(0)
        print("Pump Stopped")
    else:
        print("Invalid pump name received!")


def check_peristaltic_pump_commands():
    """Checks for peristaltic pump control commands from backend."""
    try:
        response = requests.get(PERISTALTIC_PUMP_CONTROL_URL, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if all(key in data for key in ["pump", "pwm", "duration"]):
                control_peristaltic_pump(data["pump"], data["pwm"], data["duration"])
            else:
                print("Invalid data format received!")
        else:
            print(f"HTTP GET Request Failed: {response.status_code}")
    except requests.RequestException as e:
        print(f"Error fetching peristaltic pump data: {e}")


def check_water_pump_control():
    """Checks for water pump ON/OFF duration from backend and updates global variables."""
    global PUMP_ON_DURATION, PUMP_OFF_DURATION
    try:
        response = requests.get(WATER_PUMP_CONTROL_URL, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "on_duration" in data and "off_duration" in data:
                PUMP_ON_DURATION = int(data["on_duration"]) * 1000  # Convert sec to ms
                PUMP_OFF_DURATION = int(data["off_duration"]) * 1000  # Convert sec to ms
                print(f"Updated Pump Timings - ON: {PUMP_ON_DURATION / 1000} sec, OFF: {PUMP_OFF_DURATION / 1000} sec")
            else:
                print("Invalid water pump timing data received!")
        else:
            print(f"HTTP GET Request Failed: {response.status_code}")
    except requests.RequestException as e:
        print(f"Error fetching water pump data: {e}")


def water_pump_control():
    """Controls the water pump based on ON/OFF durations."""
    global pump_start_time, pump_state

    elapsed_time = time.time() - pump_start_time
    if not pump_state and elapsed_time >= PUMP_OFF_DURATION:
        print("Turning Water Pump ON")
        GPIO.output(RELAY_PIN, GPIO.LOW)
        pump_state = True
        pump_start_time = time.time()
    elif pump_state and elapsed_time >= PUMP_ON_DURATION:
        print("Turning Water Pump OFF")
        GPIO.output(RELAY_PIN, GPIO.HIGH)
        pump_state = False
        pump_start_time = time.time()


def main():
    """Main loop for Raspberry Pi operations."""
    print("System Initialized...")
    while True:
        timestamp = get_ntp_time()
        print(f"Current Time: {timestamp}")

        # **Send Sensor Data to Backend**
        send_sensor_data()

        # **Water Pump Control**
        water_pump_control()

        # **Fetch Water Pump ON/OFF Timings from Backend**
        check_water_pump_control()

        # **Check for Peristaltic Pump Commands from Backend**
        check_peristaltic_pump_commands()

        time.sleep(10)  # Run loop every 10 seconds


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Exiting...")
        GPIO.cleanup()
