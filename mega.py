import RPi.GPIO as GPIO
import time
import threading
from datetime import datetime, timedelta

# GPIO Setup
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Pin Assignments (Customize these to your actual wiring)
# Motors (controlled via L298N drivers)
MOTOR_A_EN = 17    # Enable pin for Motor A
MOTOR_A_IN1 = 27   # Input 1 for Motor A
MOTOR_A_IN2 = 22   # Input 2 for Motor A
MOTOR_B_EN = 24    # Enable pin for Motor B
MOTOR_B_IN1 = 23   # Input 1 for Motor B
MOTOR_B_IN2 = 25   # Input 2 for Motor B

# Servos
SERVO_1 = 12       # Servo 1 control
SERVO_2 = 13       # Servo 2 control

# Peristaltic Pumps
PUMP_1 = 5         # Nutrient Pump 1
PUMP_2 = 6         # Nutrient Pump 2
PUMP_3 = 19        # Nutrient Pump 3
PUMP_4 = 20        # Nutrient Pump 4

# Water Motor
WATER_MOTOR = 21   # Main water circulation motor

# Relay Controls
FAN_RELAY = 16     # Cooling fan control
SPRAY_RELAY = 26    # Sprinkler system
PELTIER_RELAY = 4   # Peltier cooling

# pH Sensor Control
PH_POWER = 18       # pH sensor on/off control

# Initialize all GPIO pins
GPIO.setup(MOTOR_A_EN, GPIO.OUT)
GPIO.setup(MOTOR_A_IN1, GPIO.OUT)
GPIO.setup(MOTOR_A_IN2, GPIO.OUT)
GPIO.setup(MOTOR_B_EN, GPIO.OUT)
GPIO.setup(MOTOR_B_IN1, GPIO.OUT)
GPIO.setup(MOTOR_B_IN2, GPIO.OUT)

GPIO.setup(SERVO_1, GPIO.OUT)
GPIO.setup(SERVO_2, GPIO.OUT)

GPIO.setup(PUMP_1, GPIO.OUT)
GPIO.setup(PUMP_2, GPIO.OUT)
GPIO.setup(PUMP_3, GPIO.OUT)
GPIO.setup(PUMP_4, GPIO.OUT)

GPIO.setup(WATER_MOTOR, GPIO.OUT)

GPIO.setup(FAN_RELAY, GPIO.OUT)
GPIO.setup(SPRAY_RELAY, GPIO.OUT)
GPIO.setup(PELTIER_RELAY, GPIO.OUT)

GPIO.setup(PH_POWER, GPIO.OUT)

# Initialize PWM
motor_a_pwm = GPIO.PWM(MOTOR_A_EN, 1000)  # 1kHz frequency
motor_b_pwm = GPIO.PWM(MOTOR_B_EN, 1000)
servo_1_pwm = GPIO.PWM(SERVO_1, 50)       # 50Hz for servos
servo_2_pwm = GPIO.PWM(SERVO_2, 50)

motor_a_pwm.start(0)
motor_b_pwm.start(0)
servo_1_pwm.start(0)
servo_2_pwm.start(0)

# System Variables
last_water_change = datetime.now()
system_active = True

def set_servo_angle(servo_pwm, angle):
    """Set servo to specific angle (0-180 degrees)"""
    duty = angle / 18 + 2
    servo_pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    servo_pwm.ChangeDutyCycle(0)  # Prevent jitter

def run_pump(pump_pin, duration):
    """Run a peristaltic pump for specified duration"""
    GPIO.output(pump_pin, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(pump_pin, GPIO.LOW)
    # Automatically turn on water motor after each dosage
    mix_water()

def mix_water(duration=120):
    """Run water motor for mixing (default 2 minutes)"""
    GPIO.output(WATER_MOTOR, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(WATER_MOTOR, GPIO.LOW)

def control_relay_device(relay_pin, duration=10):
    """Control relay devices (fan, spray, peltier) for 10 seconds"""
    GPIO.output(relay_pin, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(relay_pin, GPIO.LOW)

def check_water_frequency():
    """Check if water needs changing (every 3 days)"""
    global last_water_change
    if datetime.now() >= last_water_change + timedelta(days=3):
        print("Water change required - 3 days expired")
        # Add your water change procedure here
        last_water_change = datetime.now()
        return True
    return False

def dosing_sequence():
    """Run all peristaltic pumps in sequence"""
    print("Starting dosing sequence")
    pumps = [PUMP_1, PUMP_2, PUMP_3, PUMP_4]
    for pump in pumps:
        run_pump(pump, 5)  # Run each pump for 5 seconds
        time.sleep(2)       # Pause between pumps
    print("Dosing sequence completed")

def environmental_control():
    """Control fan, spray, and peltier devices"""
    print("Running environmental control")
    devices = [FAN_RELAY, SPRAY_RELAY, PELTIER_RELAY]
    for device in devices:
        control_relay_device(device)
    print("Environmental control completed")

def motor_control(motor, direction, speed=50, duration=0):
    """Control motors through L298N drivers"""
    if motor == 'A':
        en = MOTOR_A_EN
        in1 = MOTOR_A_IN1
        in2 = MOTOR_A_IN2
        pwm = motor_a_pwm
    else:
        en = MOTOR_B_EN
        in1 = MOTOR_B_IN1
        in2 = MOTOR_B_IN2
        pwm = motor_b_pwm
    
    pwm.ChangeDutyCycle(speed)
    
    if direction == 'forward':
        GPIO.output(in1, GPIO.HIGH)
        GPIO.output(in2, GPIO.LOW)
    elif direction == 'backward':
        GPIO.output(in1, GPIO.LOW)
        GPIO.output(in2, GPIO.HIGH)
    else:  # stop
        GPIO.output(in1, GPIO.LOW)
        GPIO.output(in2, GPIO.LOW)
    
    if duration > 0:
        time.sleep(duration)
        GPIO.output(in1, GPIO.LOW)
        GPIO.output(in2, GPIO.LOW)
        pwm.ChangeDutyCycle(0)

def system_monitor():
    """Main system monitoring loop"""
    while system_active:
        # Check water frequency daily
        if datetime.now().hour == 8 and datetime.now().minute < 1:
            check_water_frequency()
        
        # Run dosing twice daily (8AM and 8PM)
        if datetime.now().hour in [8, 20] and datetime.now().minute < 1:
            dosing_sequence()
        
        # Run environmental control every 2 hours
        if datetime.now().hour % 2 == 0 and datetime.now().minute < 1:
            environmental_control()
        
        time.sleep(60)  # Check every minute

def cleanup():
    """Clean up GPIO on exit"""
    global system_active
    system_active = False
    
    # Stop all motors
    motor_control('A', 'stop')
    motor_control('B', 'stop')
    
    # Stop PWM signals
    motor_a_pwm.stop()
    motor_b_pwm.stop()
    servo_1_pwm.stop()
    servo_2_pwm.stop()
    
    # Turn off all outputs
    for pin in [PUMP_1, PUMP_2, PUMP_3, PUMP_4, WATER_MOTOR,
                FAN_RELAY, SPRAY_RELAY, PELTIER_RELAY, PH_POWER]:
        GPIO.output(pin, GPIO.LOW)
    
    GPIO.cleanup()
    print("System shutdown complete")

if __name__ == "__main__":
    try:
        print("Hydroponic System Control Started")
        
        # Initialize servos to default positions
        set_servo_angle(servo_1_pwm, 90)
        set_servo_angle(servo_2_pwm, 90)
        
        # Start system monitor thread
        monitor_thread = threading.Thread(target=system_monitor)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Main thread can be used for additional controls
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down system...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cleanup()
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