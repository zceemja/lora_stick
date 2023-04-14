#ifndef LORA_STICK_CONTROL_H_
#define LORA_STICK_CONTROL_H_
#include <LoRa_E32.h>
#include "config.h"

bool E32setup();
Configuration* E32config();
ModuleInformation* E32modinfo();

ResponseStructContainer E32updateConfig();
ResponseStructContainer E32updateModInfo();
void E32printModinfo();
void E32printConfig();
ResponseStatus E32writeConfig(Configuration cfg);
ResponseStatus E32send(void *data, size_t len);
void E32receiverLoop();
void E32setCallback(void (*callback)(uint8_t cmd, void *data, size_t len));

typedef struct E32header { 
    uint8_t cmd;
    size_t size; 
} E32header;

#endif