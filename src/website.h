#ifndef LORA_STICK_WEBSITE_H_
#define LORA_STICK_WEBSITE_H_
#include <ESPAsyncWebServer.h>
#include "lora.h"
#include "page.h"

class CaptiveRequestHandler : public AsyncWebHandler {
public:
  CaptiveRequestHandler() {}
  virtual ~CaptiveRequestHandler() {}

  bool canHandle(AsyncWebServerRequest *request);
  void handleRequest(AsyncWebServerRequest *request);
};

void handleIndexRequest(AsyncWebServerRequest *request);
void onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len);
// void onLoraMessage(uint8_t cmd, void *data, size_t len);
void onWsMessage(AsyncWebSocket * server, uint8_t *data, size_t len);
void onWsSetup(AsyncWebSocketClient * server);

#endif