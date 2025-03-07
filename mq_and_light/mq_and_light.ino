#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <BH1750.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Wi-Fi credentials
const char* ssid = "Airtel_2.4GHz";
const char* password = "air6969@";

// Backend server URL
const char* serverUrl = "http://192.168.1.27:5001/data/sensor";

// Relay control pin (Water pump control)
#define RELAY_PIN 15  // You can change the pin as needed

// DHT sensor pin (DHT22 used here)
#define DHT_PIN_1 4
DHT dht1(DHT_PIN_1, DHT22);

// Soil Moisture Sensor Pins
#define SOIL_MOISTURE_PIN_1 35
#define SOIL_MOISTURE_PIN_2 34

// MQ135 Air Quality Sensor Pin
#define MQ135_PIN 32

// BH1750 Light Sensor (I2C)
BH1750 lightMeter;

// DS18B20 Water Temperature Sensor
#define ONE_WIRE_BUS 27
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// NTP Client setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000);

// Variables to store sensor readings
float temperature1, humidity1;
int soilMoisture1, soilMoisture2;
bool pumpStatus = false; // Pump status
float lightIntensity;
float airQuality;
float waterTemperature;

void setup() {
  // Start Serial Monitor
  Serial.begin(115200);

  // Initialize DHT sensor
  dht1.begin();

  // Initialize relay pin
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Ensure the pump is off at startup

  // Initialize soil moisture sensor pins
  pinMode(SOIL_MOISTURE_PIN_1, INPUT);
  pinMode(SOIL_MOISTURE_PIN_2, INPUT);
  pinMode(MQ135_PIN, INPUT);

  // Initialize I2C for BH1750
  Wire.begin(21, 22);
  lightMeter.begin();

  // Initialize DS18B20 sensor
  sensors.begin();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status()!= WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  // Start NTP client
  timeClient.begin();
}

void loop() {
  // Update time
  timeClient.update();
  String timestamp = timeClient.getFormattedTime();

  // Read DHT sensor values
  temperature1 = dht1.readTemperature();
  humidity1 = dht1.readHumidity();

  // Read raw soil moisture sensor values (Analog read)
  soilMoisture1 = analogRead(SOIL_MOISTURE_PIN_1);
  soilMoisture2 = analogRead(SOIL_MOISTURE_PIN_2);

  // Remap the raw sensor readings to a percentage range (0 to 100)
  int soilMoisturePercent1 = map(soilMoisture1, 2600, 1350, 0, 100);
  int soilMoisturePercent2 = map(soilMoisture2, 2600, 1350, 0, 100);
  soilMoisturePercent1 = constrain(soilMoisturePercent1, 0, 100);
  soilMoisturePercent2 = constrain(soilMoisturePercent2, 0, 100);

  // Read Light Intensity from BH1750
  lightIntensity = lightMeter.readLightLevel();

  // Read Air Quality from MQ135 (Raw value, requires calibration for CO2/AQI)
  airQuality = analogRead(MQ135_PIN);

  // Read water temperature from DS18B20
  sensors.requestTemperatures();
  waterTemperature = sensors.getTempCByIndex(0);

  // Print sensor values to the Serial Monitor
  Serial.print("Timestamp: "); Serial.print(timestamp);
  Serial.print(" Temperature: "); Serial.print(temperature1); Serial.print(" C, ");
  Serial.print("Humidity: "); Serial.print(humidity1); Serial.print(" %, ");
  Serial.print("Soil Moisture 1: "); Serial.print(soilMoisturePercent1); Serial.print(" %, ");
  Serial.print("Soil Moisture 2: "); Serial.print(soilMoisturePercent2); Serial.print(" %, ");
  Serial.print("Light Intensity: "); Serial.print(lightIntensity); Serial.print(" lx, ");
  Serial.print("Air Quality (Raw): "); Serial.print(airQuality);
  Serial.print(" Water Temperature: "); Serial.print(waterTemperature); Serial.println(" C");

  // Pump control logic
  if (soilMoisturePercent1 < 30 || soilMoisturePercent2 < 30) {
    if (!pumpStatus) {
      Serial.println("Soil moisture is low. Turning pump ON.");
      digitalWrite(RELAY_PIN, LOW); // Turn pump on
      pumpStatus = true;
    }
  } else {
    if (pumpStatus) {
      Serial.println("Soil moisture is sufficient. Turning pump OFF.");
      digitalWrite(RELAY_PIN, HIGH);  // Turn pump off
      pumpStatus = false;
    }
  }

  // Create JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"timestamp\": \"" + timestamp + "\",";
  jsonPayload += "\"soilMoisture\": [\"" + String(soilMoisturePercent1) + "%\", \"" + String(soilMoisturePercent2) + "%\"],";
  jsonPayload += "\"dht22\": {\"temp\": " + String(temperature1) + ", \"hum\": " + String(humidity1) + ", \"status\": \"OK\"},";
  jsonPayload += "\"airQuality\": {\"value\": " + String(airQuality) + ", \"status\": \"OK\"},";
  jsonPayload += "\"lightIntensity\": {\"value\": " + String(lightIntensity) + ", \"status\": \"OK\"},";
  jsonPayload += "\"waterTemperature\": {\"value\": " + String(waterTemperature) + ", \"status\": \"OK\"}}";

  // Send data to backend
  sendDataToBackend(jsonPayload);

  // Wait before next read
  delay(10000);
}

void sendDataToBackend(String jsonPayload) {
  HTTPClient http;
  if (WiFi.status() == WL_CONNECTED) {
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error sending data. HTTP response code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("Error: WiFi not connected");
  }
}
