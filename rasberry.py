import RPi.GPIO as GPIO
import time
import threading
from smbus2 import SMBus
import serial
import Adafruit_DHT
import math
import os
import board
import requests  # Added for HTTP requests
import json     # Added for JSON handling

# GPIO Mode (BCM)
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Pin Definitions using board library
PUMP_PINS = [board.D18, board.D24, board.D23, board.D25]  # L298N motor driver inputs
SERVO_PINS = [board.D12, board.D16]         # Direct servo connections
WATER_RELAY_PIN = board.D27               # Relay for main pump
DS18B20_PIN = board.D4             # DS18B20 temperature sensor
DHT_PIN = board.D17                # DHT22 temperature/humidity sensor
CO2_TX = board.D14                 # SYP16 CO2 sensor
CO2_RX = board.D15                 # SYP16 CO2 sensor
PH_UPPER_PUMP = board.D18                  # PH Up relay
PH_LOWER_PUMP = board.D24                 # PH Down relay
FAN_PIN = board.D22                  # Fan relay
SPRINKLER_PIN = board.D5              # Sprinkler relay
PH_SENSOR_PIN = board.D6             # pH sensor

# I2C setup using board
i2c = board.I2C()  # uses board.SCL and board.SDA automatically

# I2C Addresses and Channel Assignments
PCA9548A_ADDR = 0x70
BH1750_ADDR = 0x23
ADS1115_ADDR = 0x48

# I2C Channel Assignments
BH1750_CHANNEL = 1    # BH1750 on channel 1
ADS1115_CHANNEL = 3   # ADS1115 on channel 3

# ADS1115 Registers
ADS1115_REG_POINTER_CONVERT = 0x00
ADS1115_REG_POINTER_CONFIG = 0x01

# PWM Settings
PWM_FREQ = 50               # 50Hz for servos
MOTOR_FREQ = 100            # 100Hz for motors

# Servo angles
SERVO_MIN_ANGLE = 0
SERVO_MAX_ANGLE = 180
SERVO_STEP = 5              # Degrees to move per step

# API endpoints
SERVER_URL = "http://192.168.1.8:5001/data/sensor"
WATER_PUMP_CONTROL_URL = "http://192.168.1.8:5001/waterpump"
PERISTALTIC_PUMP_CONTROL_URL = "http://192.168.1.8:5001/peristaltic"
SERVO_CONTROL_URL = "http://192.168.1.8:5001/servo"
DEVICE_ID = "rpi1"  # Device identifier

class HydroponicSystem:
    def __init__(self):
        # Add simulation mode flag
        self.simulation_mode = False
        
        # Add board detection
        self.board_type = None
        try:
            # Detect board type
            if hasattr(board, 'RPI_INFO'):
                self.board_type = "Raspberry Pi"
                print(f"Detected board: {self.board_type}")
                print(f"Board info: {board.RPI_INFO}")
            else:
                print("Not running on a Raspberry Pi")
                self.simulation_mode = True
        except Exception as e:
            print(f"Error detecting board: {e}")
            self.simulation_mode = True

        # Initialize I2C with board detection
        try:
            if self.board_type == "Raspberry Pi":
                self.i2c = SMBus(1)
            else:
                print("I2C not available - entering simulation mode")
                self.simulation_mode = True
                self.i2c = None
        except Exception as e:
            print(f"I2C initialization error: {e}")
            self.simulation_mode = True
            self.i2c = None
            
        # Initialize GPIO
        self.setup_gpio()
        
        # Initialize sensors
        self.setup_sensors()
        
        # Threading control
        self.running = True
        self.threads = []
        
        # Servo positions
        self.servo_positions = [0, 0]
        
        # Motor speeds wave pattern
        self.speed_pattern = [100, 50, 25, 0, 25, 50, 100]
        self.current_pattern_index = [0, 0, 0, 0]
        self.motor_speeds = [100, 100, 100, 100]

        # Relay control variables
        self.pump_state = False
        self.pump_start_time = time.time()
        self.pump_on_duration = 600  # 10 minutes
        self.pump_off_duration = 300  # 5 minutes

        # Initialize DHT22 with platform check
        try:
            # Check platform and import appropriate library
            import platform
            self.platform = platform.system().lower()
            if self.platform == 'linux':
                import Adafruit_DHT
                self.dht = Adafruit_DHT.DHT22
            else:
                print("Warning: DHT22 only supported on Linux/Raspberry Pi")
                self.dht = None
        except Exception as e:
            print(f"Warning: Could not initialize DHT22: {e}")
            self.dht = None
    def setup_gpio(self):
        """Setup GPIO with board pin detection"""
        try:
            if self.board_type == "Raspberry Pi":
                # Setup pump control pins
                for pin in PUMP_PINS:
                    GPIO.setup(pin.id, GPIO.OUT)
                    
                # Setup servo pins
                for pin in SERVO_PINS:
                    GPIO.setup(pin.id, GPIO.OUT)
                    
                # Setup relay
                GPIO.setup(RELAY_PIN.id, GPIO.OUT)
                GPIO.output(RELAY_PIN.id, GPIO.HIGH)  # Start with pump OFF
                
                # Initialize PWM for motors
                self.motor_pwm = []
                for pin in PUMP_PINS:
                    pwm = GPIO.PWM(pin.id, MOTOR_FREQ)
                    pwm.start(0)
                    self.motor_pwm.append(pwm)
                
                # Initialize PWM for servos
                self.servo_pwm = []
                for pin in SERVO_PINS:
                    pwm = GPIO.PWM(pin.id, PWM_FREQ)
                    pwm.start(0)
                    self.servo_pwm.append(pwm)
            else:
                print("Using simulation mode for GPIO")
                self.motor_pwm = [DummyPWM() for _ in PUMP_PINS]
                self.servo_pwm = [DummyPWM() for _ in SERVO_PINS]
                
        except Exception as e:
            print(f"Warning: GPIO setup failed: {e}")
            self.motor_pwm = [DummyPWM() for _ in PUMP_PINS]
            self.servo_pwm = [DummyPWM() for _ in SERVO_PINS]

    def setup_sensors(self):
        """Initialize sensors with error handling"""
        try:
            print("DHT22 sensor initialized")
        except Exception as e:
            print(f"Warning: Could not initialize DHT22: {e}")
            self.dht = None
        
        # Initialize CO2 sensor
        try:
            self.co2_sensor = serial.Serial(
                port='/dev/ttyS0',
                baudrate=9600,
                timeout=1
            )
        except Exception as e:
            print(f"Warning: Could not initialize CO2 sensor: {e}")
            self.co2_sensor = None

    def select_i2c_channel(self, channel):
        """Select channel on PCA9548A with debug"""
        if not self.i2c:
            print("I2C not initialized")
            return
        try:
            print(f"Selecting I2C channel {channel}")
            self.i2c.write_byte(PCA9548A_ADDR, 1 << channel)
            time.sleep(0.1)
            print(f"Channel {channel} selected")
        except Exception as e:
            print(f"Error selecting I2C channel {channel}: {e}")

    def read_ads1115(self, channel):
        """Read raw value from ADS1115 with debug"""
        if not self.i2c:
            print("I2C not initialized")
            return None
        try:
            print(f"Reading ADS1115 channel {channel}")
            self.select_i2c_channel(ADS1115_CHANNEL)  # Channel 3
            
            # ADS1115 configuration
            config = [0x84, 0x83]  # Single shot, ±4.096V, 128SPS
            config[0] |= (channel << 4)
            
            print("Writing ADS1115 config")
            self.i2c.write_i2c_block_data(ADS1115_ADDR, ADS1115_REG_POINTER_CONFIG, config)
            time.sleep(0.1)
            
            print("Reading ADS1115 conversion")
            data = self.i2c.read_i2c_block_data(ADS1115_ADDR, ADS1115_REG_POINTER_CONVERT, 2)
            value = (data[0] << 8) | data[1]
            
            if value & 0x8000:
                value -= 65536
            
            print(f"ADS1115 value: {value}")
            return value
        except Exception as e:
            print(f"Error reading ADS1115 channel {channel}: {e}")
            return None

    def read_bh1750(self):
        """Read light level from BH1750 with debug"""
        if not self.i2c:
            print("I2C not initialized")
            return None
        try:
            print("Reading BH1750")
            self.select_i2c_channel(BH1750_CHANNEL)  # Channel 1
            
            print("Configuring BH1750")
            self.i2c.write_byte(BH1750_ADDR, 0x10)  # Continuous high-res mode
            time.sleep(0.2)
            
            print("Reading BH1750 data")
            data = self.i2c.read_i2c_block_data(BH1750_ADDR, 0x00, 2)
            light = (data[0] << 8 | data[1]) / 1.2
            print(f"BH1750 value: {light}")
            return light
        except Exception as e:
            print(f"Error reading BH1750: {e}")
            return None

    def read_dht(self):
        """Read DHT22 with board detection support"""
        if self.simulation_mode:
            import random
            temperature = 23.0 + random.uniform(-1.0, 1.0)
            humidity = 45.0 + random.uniform(-5.0, 5.0)
            print("DHT22 (Simulated) - Temperature: {:.1f}°C, Humidity: {:.1f}%".format(temperature, humidity))
            return humidity, temperature

        try:
            if self.board_type == "Raspberry Pi":
                humidity, temperature = Adafruit_DHT.read_retry(self.dht, DHT_PIN.id)
                if humidity is not None and temperature is not None:
                    if 0 <= humidity <= 100 and -40 <= temperature <= 80:
                        return humidity, temperature
            else:
                print("DHT22: Not supported on this platform")
                return 50.0, 25.0  # Simulated values
        except Exception as e:
            print(f"Error reading DHT22: {e}")
        return None, None

    def send_sensor_data(self, sensor_data):
        """Send sensor data to server"""
        if self.simulation_mode:
            print("Simulation: Would send data to server")
            print(json.dumps(sensor_data, indent=2))
            return
            
        try:
            response = requests.post(SERVER_URL, json=sensor_data)
            if response.status_code == 200:
                print("Data sent successfully to server")
            else:
                print(f"Failed to send data. Status code: {response.status_code}")
        except Exception as e:
            print(f"Error sending data: {e}")

    def fetch_water_pump_timings(self):
        """Get water pump timings from server"""
        if self.simulation_mode:
            print("Simulation: Checking water pump timings")
            return
            
        try:
            response = requests.get(f"{WATER_PUMP_CONTROL_URL}?device_id={DEVICE_ID}")
            if response.status_code == 200:
                data = response.json()
                if 'on_duration' in data and 'off_duration' in data:
                    self.pump_on_duration = data['on_duration']
                    self.pump_off_duration = data['off_duration']
                    print(f"Updated pump timings: ON={self.pump_on_duration}s, OFF={self.pump_off_duration}s")
        except Exception as e:
            print(f"Error fetching pump timings: {e}")

    def check_peristaltic_pump_commands(self):
        """Check for peristaltic pump commands"""
        if self.simulation_mode:
            print("Simulation: Checking peristaltic pump commands")
            return
            
        try:
            response = requests.get(f"{PERISTALTIC_PUMP_CONTROL_URL}?device_id={DEVICE_ID}")
            if response.status_code == 200:
                data = response.json()
                if 'pump' in data and 'pwm' in data and 'duration' in data:
                    print(f"Received command for {data['pump']}: PWM={data['pwm']}, Duration={data['duration']}ms")
                    # Implement pump control here if hardware available
        except Exception as e:
            print(f"Error checking peristaltic pump commands: {e}")

    def check_servo_commands(self):
        """Check for servo commands"""
        if self.simulation_mode:
            print("Simulation: Checking servo commands")
            return
            
        try:
            response = requests.get(f"{SERVO_CONTROL_URL}?device_id={DEVICE_ID}")
            if response.status_code == 200:
                data = response.json()
                if 'servo' in data and 'angle' in data:
                    servo_name = data['servo']
                    angle = data['angle']
                    print(f"Received command for {servo_name} servo: angle={angle}")
                    
                    # Apply to appropriate servo
                    if servo_name == "pH" and len(self.servo_pwm) > 0:
                        duty = 2 + (angle / 18)  # Convert angle to duty cycle
                        self.servo_pwm[0].ChangeDutyCycle(duty)
                    elif servo_name == "EC" and len(self.servo_pwm) > 1:
                        duty = 2 + (angle / 18)  # Convert angle to duty cycle
                        self.servo_pwm[1].ChangeDutyCycle(duty)
        except Exception as e:
            print(f"Error checking servo commands: {e}")

    def sensor_reading_thread(self):
        """Continuous sensor reading thread with simulation support"""
        while self.running:
            try:
                print("\n--- Starting sensor readings ---")
                
                if self.simulation_mode:
                    print("Running in simulation mode")

                # Read DHT22
                humidity, temperature = self.read_dht()
                
                # Read ADS1115 channels (raw values)
                if self.simulation_mode:
                    import random
                    raw_ph = random.randint(20000, 25000)
                    raw_ec = random.randint(15000, 20000)
                    raw_moisture = random.randint(10000, 15000)
                    light = random.uniform(100, 1000)
                else:
                    raw_ph = self.read_ads1115(0)
                    raw_ec = self.read_ads1115(1)
                    raw_moisture = self.read_ads1115(2)
                    light = self.read_bh1750()
                
                # Create sensor data dictionary
                sensor_data = {}
                
                if humidity is not None and temperature is not None:
                    sensor_data["temperature"] = temperature
                    sensor_data["humidity"] = humidity
                
                if raw_ph is not None:
                    sensor_data["ph"] = raw_ph  # Will need calibration for actual values
                
                if raw_ec is not None:
                    sensor_data["ec"] = raw_ec  # Will need calibration for actual values
                
                if raw_moisture is not None:
                    sensor_data["soil_moisture"] = raw_moisture  # Will need conversion to percentage
                
                if light is not None:
                    sensor_data["light"] = light
                
                # Print readings summary
                print("\nSensor Readings Summary:")
                for key, value in sensor_data.items():
                    print(f"{key}: {value}")
                
                # Send data to server
                self.send_sensor_data(sensor_data)
                
                # Check for control commands
                self.fetch_water_pump_timings()
                self.check_peristaltic_pump_commands()
                self.check_servo_commands()
                
                time.sleep(5)
            except Exception as e:
                print(f"Error in sensor reading thread: {e}")
                time.sleep(5)

    def motor_control_thread(self, motor_index):
        """Continuous motor control thread with wave-like speed pattern"""
        while self.running:
            try:
                # Update speed from pattern
                self.motor_speeds[motor_index] = self.speed_pattern[self.current_pattern_index[motor_index]]
                
                # Apply speed to motor
                self.motor_pwm[motor_index].ChangeDutyCycle(self.motor_speeds[motor_index])
                
                # Move to next speed in pattern
                self.current_pattern_index[motor_index] = (self.current_pattern_index[motor_index] + 1) % len(self.speed_pattern)
                
                # Delay before next speed change
                time.sleep(1)  # Change speed every second
            except Exception as e:
                print(f"Error in motor control: {e}")
                time.sleep(1)

    def servo_control_thread(self, servo_index):
        """Continuous servo control thread"""
        while self.running:
            try:
                # Update position
                self.servo_positions[servo_index] += SERVO_STEP
                if self.servo_positions[servo_index] > SERVO_MAX_ANGLE:
                    self.servo_positions[servo_index] = SERVO_MIN_ANGLE
                
                # Convert angle to duty cycle (0-180 degrees = 2-12% duty cycle)
                duty = 2 + (self.servo_positions[servo_index] / 18)
                self.servo_pwm[servo_index].ChangeDutyCycle(duty)
                
                time.sleep(0.1)
            except Exception as e:
                print(f"Error in servo control: {e}")
                time.sleep(1)

    def handle_water_pump(self):
        """Control water pump based on timing with error handling"""
        try:
            current_time = time.time()
            elapsed_time = current_time - self.pump_start_time
            
            if not self.pump_state and elapsed_time >= self.pump_off_duration:
                print("Turning Water Pump ON")
                GPIO.output(RELAY_PIN.id, GPIO.LOW)
                self.pump_state = True
                self.pump_start_time = current_time
            elif self.pump_state and elapsed_time >= self.pump_on_duration:
                print("Turning Water Pump OFF")
                GPIO.output(RELAY_PIN.id, GPIO.HIGH)
                self.pump_state = False
                self.pump_start_time = current_time
        except Exception as e:
            print(f"Error controlling water pump: {e}")

    def start(self):
        """Start all control and monitoring threads"""
        try:
            # Start motor control threads
            for i in range(len(PUMP_PINS)):
                thread = threading.Thread(target=self.motor_control_thread, args=(i,))
                thread.daemon = True
                thread.start()
                self.threads.append(thread)
            
            # Start servo control threads
            for i in range(len(SERVO_PINS)):
                thread = threading.Thread(target=self.servo_control_thread, args=(i,))
                thread.daemon = True
                thread.start()
                self.threads.append(thread)
            
            # Start sensor reading thread
            sensor_thread = threading.Thread(target=self.sensor_reading_thread)
            sensor_thread.daemon = True
            sensor_thread.start()
            self.threads.append(sensor_thread)
            
            print("System started. Press Ctrl+C to stop.")
            while True:
                # Handle water pump control in main loop
                self.handle_water_pump()
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\nStopping system...")
            self.cleanup()

    def cleanup(self):
        """Cleanup GPIO and threads"""
        self.running = False
        
        # Wait for threads to finish
        for thread in self.threads:
            thread.join()
        
        # Stop PWM
        for pwm in self.motor_pwm:
            pwm.stop()
        for pwm in self.servo_pwm:
            pwm.stop()
        
        # Make sure pump is off during cleanup
        if self.board_type == "Raspberry Pi":
            GPIO.output(RELAY_PIN.id, GPIO.HIGH)  # Turn OFF
            GPIO.cleanup()
        
        # Close I2C and serial connections
        if self.i2c:
            self.i2c.close()
        if self.co2_sensor:
            self.co2_sensor.close()

# Add DummyPWM class for testing
class DummyPWM:
    """Dummy PWM class for testing without hardware"""
    def __init__(self):
        self.duty_cycle = 0
        
    def start(self, dc):
        self.duty_cycle = dc
        print(f"Simulation: PWM started at {dc}%")
        
    def ChangeDutyCycle(self, dc):
        self.duty_cycle = dc
        print(f"Simulation: PWM duty cycle changed to {dc}%")
        
    def stop(self):
        self.duty_cycle = 0
        print("Simulation: PWM stopped")

if __name__ == "__main__":
    system = HydroponicSystem()
    system.start()