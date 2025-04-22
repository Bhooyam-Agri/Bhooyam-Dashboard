#include <WiFi.h>
#include <HTTPClient.h>

#define SOIL_MOISTURE_1 34  // Soil Moisture Sensor 1 (Analog Pin)
#define SOIL_MOISTURE_2 35  // Soil Moisture Sensor 2 (Analog Pin)
#define WATER_PUMP_RELAY 26 // Relay pin for Water Pump

const char* ssid = "YOUR_WIFI_SSID";  
const char* password = "YOUR_WIFI_PASSWORD";  

const char* sensorDataUrl = "http://192.168.1.8:5001/data/sensor";  
const char* waterPumpControlUrl = "http://192.168.1.8:5001/waterpump";  

const char* esp_id = "esp2";  // Unique ESP Identifier

unsigned long pumpOnDuration = 10 * 60 * 1000;  // Default 10 min ON
unsigned long pumpOffDuration = 5 * 60 * 1000;  // Default 5 min OFF
unsigned long previousMillis = 0;
bool pumpState = false;

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    
    pinMode(SOIL_MOISTURE_1, INPUT);
    pinMode(SOIL_MOISTURE_2, INPUT);
    pinMode(WATER_PUMP_RELAY, OUTPUT);
    
    digitalWrite(WATER_PUMP_RELAY, LOW);  // Start with Pump OFF
    Serial.println("Connecting to WiFi...");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi!");
}

void loop() {
    unsigned long currentMillis = millis();

    // Water Pump Control Logic
    if (pumpState && (currentMillis - previousMillis >= pumpOnDuration)) {
        digitalWrite(WATER_PUMP_RELAY, LOW); // Turn OFF Pump
        pumpState = false;
        previousMillis = currentMillis;
        Serial.println("Water Pump OFF");
    } 
    else if (!pumpState && (currentMillis - previousMillis >= pumpOffDuration)) {
        digitalWrite(WATER_PUMP_RELAY, HIGH); // Turn ON Pump
        pumpState = true;
        previousMillis = currentMillis;
        Serial.println("Water Pump ON");
    }

    // Read Soil Moisture Sensors
    int soil1 = analogRead(SOIL_MOISTURE_1);
    int soil2 = analogRead(SOIL_MOISTURE_2);
    Serial.print("Soil Moisture 1: "); Serial.println(soil1);
    Serial.print("Soil Moisture 2: "); Serial.println(soil2);

    // Send sensor data with ESP ID
    sendSensorData(soil1, soil2);

    // Fetch Water Pump ON/OFF Duration
    fetchPumpSettings();

    delay(2000);  // Read sensors every 2 seconds
}

void sendSensorData(int soil1, int soil2) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(sensorDataUrl);
        http.addHeader("Content-Type", "application/json");

        String payload = "{\"esp_id\":\"" + String(esp_id) + 
                         "\", \"soil_moisture_1\":" + String(soil1) + 
                         ", \"soil_moisture_2\":" + String(soil2) + "}";

        int httpResponseCode = http.POST(payload);
        Serial.print("Sensor Data Sent, Response: "); Serial.println(httpResponseCode);
        http.end();
    } else {
        Serial.println("WiFi Disconnected, unable to send sensor data");
    }
}

void fetchPumpSettings() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String requestUrl = String(waterPumpControlUrl) + "?esp_id=" + String(esp_id);
        http.begin(requestUrl);

        int httpResponseCode = http.GET();
        if (httpResponseCode == 200) {
            String payload = http.getString();
            Serial.print("Backend Response: "); Serial.println(payload);

            int newOnTime, newOffTime;
            sscanf(payload.c_str(), "%d,%d", &newOnTime, &newOffTime);
            
            if (newOnTime > 0 && newOffTime > 0) {
                pumpOnDuration = newOnTime * 1000;  // Convert to milliseconds
                pumpOffDuration = newOffTime * 1000;
                Serial.println("Updated Pump Timings from Backend");
            }
        } else {
            Serial.print("Error in fetching data. HTTP Response: ");
            Serial.println(httpResponseCode);
        }
        http.end();
    } else {
        Serial.println("WiFi Disconnected, unable to fetch pump settings");
    }
}
