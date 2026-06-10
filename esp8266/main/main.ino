#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#include "wifi.h"
#include "mqtt.h"

const char* wifiSSID = "Homeonpa_2.4G";
const char* wifiPassword = "witais123";

WiFiClientSecure espClient;
PubSubClient client(espClient);

const char* mqttServer = "015e37a083744b579fbc7f07c7e8c904.s1.eu.hivemq.cloud";
const char* myDeviceId = "ESP8266_Bed_Controller";
const char* mqtt_user = "Testmqtt";
const char* mqtt_pass = "Testmqtt1";

int bedAngle[4] = { 0, 0, 0, 0 };
unsigned long blinkTime = millis();

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  connect_wifi();

  espClient.setInsecure(); 
  client.setServer(mqttServer, 8883);
  client.setCallback(callback);
}

void loop() {
  unsigned long timeNow = millis();
  if (timeNow > blinkTime) digitalWrite(LED_BUILTIN, HIGH);

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  if (Serial.available() > 0) {
    char inchar = Serial.read();
    Serial.print("Received: ");
    Serial.println(inchar);

    if (inchar == 'a') bedAngle[0]++;
    publishBedPosition();
  }
}
