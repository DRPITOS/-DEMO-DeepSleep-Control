#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <PubSubClient.h>

extern const char* mqttServer;
extern int bedAngle[4];
extern unsigned long blinkTime;
extern const char* myDeviceId;
extern PubSubClient client;
extern const char* mqtt_user;
extern const char* mqtt_pass;
extern bool needToSendAck;

void callback(char* topic, byte* payload, unsigned int length);
void reconnect();
void publishBedPosition();

#endif