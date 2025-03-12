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
const char* serverUrl = "http://192.168.1.8:5001/data/sensor";

// Relay control pin (Water pump control)
#define RELAY_PIN 15  

// DHT sensor
#define DHT_PIN_1 4
DHT dht1(DHT_PIN_1, DHT22);

// Soil Moisture Sensors
#define SOIL_MOISTURE_PIN_1 35
#define SOIL_MOISTURE_PIN_2 34

// MQ135 Air Quality Sensor
#define MQ135_PIN 32

// BH1750 Light Sensor
BH1750 lightMeter;

// DS18B20 Water Temperature Sensor
#define ONE_WIRE_BUS 27
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// NTP Client setup
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Sensor Data Variables
float temperature1, humidity1;
int soilMoisture1, soilMoisture2;
bool pumpStatus = false;
float lightIntensity, airQuality, waterTemperature;

// Timing Variables
unsigned long previousMillis = 0;
const unsigned long ON_DURATION = 300000;  // 5 minutes ON (300,000 ms)
const unsigned long OFF_DURATION = 600000; // 10 minutes OFF (600,000 ms)
bool isPumpOn = false; // Track pump state

void setup() {
  Serial.begin(115200);

  // Initialize sensors
  dht1.begin();
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start with pump OFF
  pinMode(SOIL_MOISTURE_PIN_1, INPUT);
  pinMode(SOIL_MOISTURE_PIN_2, INPUT);
  pinMode(MQ135_PIN, INPUT);
  
  // Initialize BH1750 (I2C)
  Wire.begin(21, 22);
  lightMeter.begin();

  // Initialize DS18B20
  sensors.begin();

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  // Initialize NTP client with IST (UTC+5:30)
  timeClient.begin();
  timeClient.setTimeOffset(19800); // Set timezone offset for IST
}

void loop() {
  unsigned long currentMillis = millis();

  // Pump ON for 10 minutes, then OFF for 5 minutes
  if (isPumpOn && currentMillis - previousMillis >= ON_DURATION) {
    digitalWrite(RELAY_PIN, HIGH); // Turn OFF pump
    isPumpOn = false;
    previousMillis = currentMillis;
    Serial.println("Pump OFF for 5 minutes...");
  } 
  else if (!isPumpOn && currentMillis - previousMillis >= OFF_DURATION) {
    digitalWrite(RELAY_PIN, LOW); // Turn ON pump
    isPumpOn = true;
    previousMillis = currentMillis;
    Serial.println("Pump ON for 10 minutes...");
  }

  // Update NTP Time
  timeClient.update();
  String timestamp = timeClient.getFormattedTime();

  // Read Sensors
  temperature1 = dht1.readTemperature();
  humidity1 = dht1.readHumidity();
  soilMoisture1 = analogRead(SOIL_MOISTURE_PIN_1);
  soilMoisture2 = analogRead(SOIL_MOISTURE_PIN_2);
  lightIntensity = lightMeter.readLightLevel();
  airQuality = analogRead(MQ135_PIN);
  sensors.requestTemperatures();
  waterTemperature = sensors.getTempCByIndex(0);

  // Convert soil moisture to percentage
  int soilMoisturePercent1 = map(soilMoisture1, 2600, 1350, 0, 100);
  int soilMoisturePercent2 = map(soilMoisture2, 2600, 1350, 0, 100);
  soilMoisturePercent1 = constrain(soilMoisturePercent1, 0, 100);
  soilMoisturePercent2 = constrain(soilMoisturePercent2, 0, 100);

  // Print Readings
  Serial.print("Timestamp: "); Serial.print(timestamp);
  Serial.print(" | Temp: "); Serial.print(temperature1); Serial.print("°C");
  Serial.print(" | Humidity: "); Serial.print(humidity1); Serial.print("%");
  Serial.print(" | Soil Moisture 1: "); Serial.print(soilMoisturePercent1); Serial.print("%");
  Serial.print(" | Soil Moisture 2: "); Serial.print(soilMoisturePercent2); Serial.print("%");
  Serial.print(" | Light: "); Serial.print(lightIntensity); Serial.print(" lx");
  Serial.print(" | Air Quality: "); Serial.print(airQuality);
  Serial.print(" | Water Temp: "); Serial.print(waterTemperature); Serial.println("°C");

  // Create JSON Payload
  String jsonPayload = "{";
  jsonPayload += "\"timestamp\": \"" + timestamp + "\",";
  jsonPayload += "\"soilMoisture\": [\"" + String(soilMoisturePercent1) + "%\", \"" + String(soilMoisturePercent2) + "%\"],";
  jsonPayload += "\"dht22\": {\"temp\": " + String(temperature1) + ", \"hum\": " + String(humidity1) + "},";
  jsonPayload += "\"airQuality\": {\"value\": " + String(airQuality) + "},";
  jsonPayload += "\"lightIntensity\": {\"value\": " + String(lightIntensity) + "},";
  jsonPayload += "\"waterTemperature\": {\"value\": " + String(waterTemperature) + "},";
  jsonPayload += "\"pumpStatus\": " + String(isPumpOn ? "true" : "false");
  jsonPayload += "}";

  // Send Data to Backend
  sendDataToBackend(jsonPayload);

  delay(5000); // Wait before next iteration
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
      Serial.print("Error sending data. HTTP Response code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("Error: WiFi not connected");
  }
}
