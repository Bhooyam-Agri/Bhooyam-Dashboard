#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

// Wi-Fi credentials
const char* ssid = "Airtel_2.4GHz";
const char* password = "air6969@";

// Backend server URLs
const char* serverUrl = "http://192.168.1.8:5001/data/sensor";
const char* waterPumpControlUrl = "http://192.168.1.8:5001/waterpump";  // Water Pump Control URL
const char* peristalticPumpControlUrl = "http://192.168.1.8:5001/peristaltic";  // Peristaltic Pump Control URL

const char* esp_id = "esp1";  // Unique ESP Identifier

// Relay for water pump
#define RELAY_PIN 15  

// Peristaltic Pumps (L293D Motor Driver)
#define PUMP1 26  // pH Up
#define PUMP2 25  // pH Down
#define PUMP3 14  // Solution A
#define PUMP4 12  // Solution B

// DHT22 Sensor
#define DHT_PIN 4
DHT dht(DHT_PIN, DHT22);

// Soil Moisture Sensors
#define SOIL_MOISTURE_PIN_1 35
#define SOIL_MOISTURE_PIN_2 34

// MQ135 Air Quality Sensor
#define MQ135_PIN 32

// Sunlight Sensor (CJMCU-GUVA-S12SD)
#define UV_SENSOR_PIN 33

// EC and pH Sensor
#define EC_SENSOR_PIN 36
#define PH_SENSOR_PIN 39

// DS18B20 Water Temperature Sensor
#define ONE_WIRE_BUS 27
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// NTP Client setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000);

// Water pump timing variables
unsigned long pumpStartTime = 0;
bool pumpState = false;

// Default ON/OFF durations (milliseconds)
unsigned long pumpOnDuration = 10 * 60 * 1000;   // Default: 10 min
unsigned long pumpOffDuration = 5 * 60 * 1000;   // Default: 5 min

void setup() {
  Serial.begin(115200);

  dht.begin();
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Default: Pump OFF

  pinMode(PUMP1, OUTPUT);
  pinMode(PUMP2, OUTPUT);
  pinMode(PUMP3, OUTPUT);
  pinMode(PUMP4, OUTPUT);
  digitalWrite(PUMP1, LOW);
  digitalWrite(PUMP2, LOW);
  digitalWrite(PUMP3, LOW);
  digitalWrite(PUMP4, LOW);

  Wire.begin(21, 22);
  sensors.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  timeClient.begin();
}

void loop() {
  timeClient.update();
  String timestamp = timeClient.getFormattedTime();
  
  sendSensorData()

  // **Fetch Water Pump ON/OFF Duration from Backend**
  fetchWaterPumpTimings();

  // **Water Pump Control (Runs Continuously)**
  unsigned long elapsedTime = millis() - pumpStartTime;
  if (!pumpState && elapsedTime >= pumpOffDuration) {
    Serial.println("Turning Water Pump ON");
    digitalWrite(RELAY_PIN, LOW);
    pumpState = true;
    pumpStartTime = millis();
  } else if (pumpState && elapsedTime >= pumpOnDuration) {
    Serial.println("Turning Water Pump OFF");
    digitalWrite(RELAY_PIN, HIGH);
    pumpState = false;
    pumpStartTime = millis();
  }

  // **Check for Peristaltic Pump Commands from Backend**
  checkPeristalticPumpCommands();

  delay(10000);  // Run loop every 10 sec
}

void sendSensorData() {
  if (WiFi.status() == WL_CONNECTED) {
    sensors.requestTemperatures();
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    int soil1 = analogRead(SOIL_MOISTURE_PIN_1);
    int soil2 = analogRead(SOIL_MOISTURE_PIN_2);
    int airQuality = analogRead(MQ135_PIN);
    int uv = analogRead(UV_SENSOR_PIN);
    int ec = analogRead(EC_SENSOR_PIN);
    int ph = analogRead(PH_SENSOR_PIN);
    float waterTemp = sensors.getTempCByIndex(0);

    DynamicJsonDocument doc(512);
    doc["temperature"] = temp;
    doc["humidity"] = humidity;
    doc["soil_moisture_1"] = soil1;
    doc["soil_moisture_2"] = soil2;
    doc["air_quality"] = airQuality;
    doc["uv_index"] = uv;
    doc["ec"] = ec;
    doc["ph"] = ph;
    doc["water_temperature"] = waterTemp;

    String jsonString;
    serializeJson(doc, jsonString);

    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(jsonString);

    Serial.print("Sensor Data Sent, Response Code: ");
    Serial.println(httpResponseCode);

    http.end();
  } else {
    Serial.println("WiFi Not Connected");
  }
}

// Function to fetch Water Pump ON/OFF durations from the backend
void fetchWaterPumpTimings() {
  HTTPClient http;
  if (WiFi.status() == WL_CONNECTED) {
    String wrequestUrl = String(waterPumpControlUrl) + "?esp_id=" + String(esp_id);
    http.begin(wrequestUrl);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String response = http.getString();
      DynamicJsonDocument doc(256);
      deserializeJson(doc, response);

      if (doc.containsKey("on_duration") && doc.containsKey("off_duration")) {
        pumpOnDuration = doc["on_duration"].as<unsigned long>() * 1000;  // Convert to ms
        pumpOffDuration = doc["off_duration"].as<unsigned long>() * 1000;

        Serial.print("Updated Water Pump ON Duration: ");
        Serial.print(pumpOnDuration / 1000);
        Serial.println(" sec");

        Serial.print("Updated Water Pump OFF Duration: ");
        Serial.print(pumpOffDuration / 1000);
        Serial.println(" sec");
      } else {
        Serial.println("Invalid water pump timing data received!");
      }
    } else {
      Serial.print("HTTP GET Request Failed: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi Not Connected");
  }
}

// Function to control Peristaltic Pumps
void controlPeristalticPump(String pumpName, int pwmValue, int duration) {
  int pumpPin = -1;

  if (pumpName == "pHUp") {
    pumpPin = PUMP1;
  } else if (pumpName == "pHDown") {
    pumpPin = PUMP2;
  } else if (pumpName == "SolutionA") {
    pumpPin = PUMP3;
  } else if (pumpName == "SolutionB") {
    pumpPin = PUMP4;
  }

  if (pumpPin != -1) {
    Serial.print("Activating Pump: "); Serial.print(pumpName);
    Serial.print(" | PWM: "); Serial.print(pwmValue);
    Serial.print(" | Duration: "); Serial.print(duration);
    Serial.println(" ms");

    ledcSetup(0, 1000, 8);  // Channel 0, 1kHz frequency, 8-bit resolution
    ledcAttachPin(pumpPin, 0);
    ledcWrite(0, pwmValue);  // Set PWM

    delay(duration);
    ledcWrite(0, 0);  // Stop PWM
    digitalWrite(pumpPin, LOW);

    Serial.println("Pump Stopped");
  } else {
    Serial.println("Invalid pump name received!");
  }
}

// Function to check pump control commands from the backend
void checkPeristalticPumpCommands() {
  HTTPClient http;
  if (WiFi.status() == WL_CONNECTED) {
    String prequestUrl = String(peristalticPumpControlUrl) + "?esp_id=" + String(esp_id);
    http.begin(prequestUrl);
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String response = http.getString();
      DynamicJsonDocument doc(256);
      deserializeJson(doc, response);

      if (doc.containsKey("pump") && doc.containsKey("pwm") && doc.containsKey("duration")) {
        String pumpName = doc["pump"].as<String>();
        int pwmValue = doc["pwm"];
        int duration = doc["duration"];

        controlPeristalticPump(pumpName, pwmValue, duration);
      } else {
        Serial.println("Invalid data format received!");
      }
    } else {
      Serial.print("HTTP GET Request Failed: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi Not Connected");
  }
}
