#ifndef WIFI_H
#define WIFI_H

#include <Arduino.h>
#include <ESP8266WiFi.h>

extern const char* wifiSSID;
extern const char* wifiPassword;

void connect_wifi();

#endif