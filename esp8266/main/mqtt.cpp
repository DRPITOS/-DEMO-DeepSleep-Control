#include <ArduinoJson.h>
#include "mqtt.h"
#include "ack.h"

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  blinkTime = millis() + 100;

  if (error) {
    Serial.print("JSON Parse failed: ");
    Serial.println(error.c_str());
    return;
  }

  const char* senderId = doc["senderId"];
  if (String(senderId) == String(myDeviceId)) {
    return;
  }

  bedAngle[0] = doc["angles"]["head"];
  bedAngle[1] = doc["angles"]["thigh"];
  bedAngle[2] = doc["angles"]["toe"];
  bedAngle[3] = doc["angles"]["hug"];

  Serial.println("--- New Position Received from Web ---");
  Serial.printf("Head: %d, Thigh: %d, Toe: %d, Hug: %d\n", bedAngle[0], bedAngle[1], bedAngle[2], bedAngle[3]);

  digitalWrite(LED_BUILTIN, LOW);

  needToSendAck = true;
}

void reconnect() {
  while (!client.connected()) {
    Serial.println("Attempting MQTT connection....");
    // Connect with device ID, user, and password
    if (client.connect(myDeviceId, mqtt_user, mqtt_pass)) {
      Serial.println("connected!");
      // Subscribe to the shared topic
      client.subscribe("bed/position/updates");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void publishBedPosition() {
  StaticJsonDocument<256> doc;
  doc["senderId"] = myDeviceId;
  doc["angles"]["head"] = bedAngle[0];
  doc["angles"]["thigh"] = bedAngle[1];
  doc["angles"]["toe"] = bedAngle[2];
  doc["angles"]["hug"] = bedAngle[3];

  char buffer[256];
  serializeJson(doc, buffer);

  // Publish to the shared topic with Retain = true
  client.publish("bed/position/updates", buffer, true);
  Serial.println("Published position to Web App.");
}