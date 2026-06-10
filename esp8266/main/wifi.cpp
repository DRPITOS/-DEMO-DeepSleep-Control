#include "wifi.h"

void connect_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(wifiSSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID, wifiPassword);

  int ledState = LOW;

  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
    if (ledState == LOW) {
      ledState = HIGH;
    } else {
      ledState = LOW;
    }
    digitalWrite(LED_BUILTIN, ledState);
  }
  Serial.println("WiFi connected");
}