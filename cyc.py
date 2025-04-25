import RPi.GPIO as GPIO
import time
from datetime import datetime, timedelta

# Initialize GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Pin Assignments (Update these to match your wiring)
### Motors ###
# L298N Driver 1
M1_EN = 17  # Motor 1 Enable
M1_IN1 = 27 # Motor 1 Input 1
M1_IN2 = 22 # Motor 1 Input 2

# L298N Driver 2  
M2_EN = 24  # Motor 2 Enable
M2_IN1 = 23 # Motor 2 Input 1
M2_IN2 = 25 # Motor 2 Input 2

### Servos ###
SERVO1 = 12
SERVO2 = 13

### Pumps ###  
PUMP1 = 5   # Peristaltic Pump 1
PUMP2 = 6   # Peristaltic Pump 2  
PUMP3 = 19  # Peristaltic Pump 3
PUMP4 = 20  # Peristaltic Pump 4

### Water System ###
WATER_MOTOR = 21  # Main water pump
SPRAY = 26       # Sprinkler relay

### Environmental ###  
FAN = 16     # Cooling fan relay
PELTIER = 4  # Peltier cooler relay
PH_POWER = 18 # pH sensor power

# Setup Outputs
for pin in [M1_EN, M1_IN1, M1_IN2, M2_EN, M2_IN1, M2_IN2,
            SERVO1, SERVO2, PUMP1, PUMP2, PUMP3, PUMP4,
            WATER_MOTOR, SPRAY, FAN, PELTIER, PH_POWER]:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)

# Initialize PWM
m1_pwm = GPIO.PWM(M1_EN, 1000)
m2_pwm = GPIO.PWM(M2_EN, 1000)
servo1 = GPIO.PWM(SERVO1, 50)
servo2 = GPIO.PWM(SERVO2, 50)

m1_pwm.start(0)
m2_pwm.start(0) 
servo1.start(0)
servo2.start(0)

# System Variables
last_water_change = datetime.now()

def move_servo(servo, angle):
    """Move servo to specified angle (0-180)"""
    duty = angle / 18 + 2
    servo.ChangeDutyCycle(duty)
    time.sleep(0.3)
    servo.ChangeDutyCycle(0)  # Prevent jitter

def run_motor(motor, direction, speed=50, duration=0):
    """Control motor movement
    motor: 1 or 2
    direction: 'fwd' or 'rev'
    speed: 0-100
    duration: seconds (0 for continuous)
    """
    if motor == 1:
        en, in1, in2, pwm = M1_EN, M1_IN1, M1_IN2, m1_pwm
    else:
        en, in1, in2, pwm = M2_EN, M2_IN1, M2_IN2, m2_pwm
    
    pwm.ChangeDutyCycle(speed)
    
    if direction == 'fwd':
        GPIO.output(in1, GPIO.HIGH)
        GPIO.output(in2, GPIO.LOW)
    else:  # rev
        GPIO.output(in1, GPIO.LOW)
        GPIO.output(in2, GPIO.HIGH)
    
    if duration > 0:
        time.sleep(duration)
        stop_motor(motor)

def stop_motor(motor):
    """Stop specified motor"""
    if motor == 1:
        GPIO.output(M1_IN1, GPIO.LOW)
        GPIO.output(M1_IN2, GPIO.LOW)
        m1_pwm.ChangeDutyCycle(0)
    else:
        GPIO.output(M2_IN1, GPIO.LOW)
        GPIO.output(M2_IN2, GPIO.LOW) 
        m2_pwm.ChangeDutyCycle(0)

def dose_nutrients(pump, duration):
    """Run peristaltic pump with auto water mixing"""
    print(f"Dosing pump {pump} for {duration}s")
    GPIO.output(pump, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(pump, GPIO.LOW)
    
    # Auto water mixing
    print("Mixing water for 2 minutes")
    GPIO.output(WATER_MOTOR, GPIO.HIGH)
    time.sleep(120)
    GPIO.output(WATER_MOTOR, GPIO.LOW)

def control_relay(device, duration=10):
    """Control relay devices with 10s default runtime"""
    print(f"Activating {device} for {duration}s")
    GPIO.output(device, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(device, GPIO.LOW)

def check_water_age():
    """Check if water needs changing (3-day limit)"""
    global last_water_change
    if datetime.now() > last_water_change + timedelta(days=3):
        print("Water expired - needs changing!")
        # Add your water change routine here
        last_water_change = datetime.now()
        return True
    return False

def full_dosing_cycle():
    """Complete nutrient dosing sequence"""
    print("\n=== Starting Dosing Cycle ===")
    
    # Dose each pump sequentially
    for i, pump in enumerate([PUMP1, PUMP2, PUMP3, PUMP4], 1):
        dose_nutrients(pump, 5)  # 5s per pump
        if i < 4:  # Pause between pumps (except last)
            time.sleep(2)
    
    print("=== Dosing Complete ===\n")

def environmental_cycle():
    """Run all environmental controls"""
    print("\nRunning Environmental Controls")
    control_relay(FAN)      # Cooling fan
    control_relay(SPRAY)    # Sprinkler
    control_relay(PELTIER)  # Peltier cooler
    print("Environmental Cycle Complete\n")

# Example Usage
try:
    # Initialize servos
    move_servo(servo1, 90)
    move_servo(servo2, 90)
    
    # Test motors
    run_motor(1, 'fwd', 75, 2)
    run_motor(2, 'rev', 50, 2)
    
    # Test full system
    full_dosing_cycle()
    environmental_cycle()
    
    # Check water age
    check_water_age()
    
    # Keep program running
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print("\nShutting down...")
    
finally:
    # Cleanup
    m1_pwm.stop()
    m2_pwm.stop()
    servo1.stop()
    servo2.stop()
    GPIO.cleanup()
    print("System off")