#include "website.h"

// CaptiveRequestHandler::CaptiveRequestHandler(AsyncWebServer *server) {

// }

bool CaptiveRequestHandler::canHandle(AsyncWebServerRequest *request){
  // request->addInterestingHeader("ANY");
  return !request->host().equals(WEB_DOMAIN) && 
  !request->host().equals(WiFi.softAPIP().toString()) &&
  !request->host().equals(WiFi.localIP().toString());
}

void CaptiveRequestHandler::handleRequest(AsyncWebServerRequest *request) {
  // String apip = WiFi.softAPIP().toString();
  String apip = String(WEB_DOMAIN);
  AsyncResponseStream *response = request->beginResponseStream("text/html");
  response->addHeader("Location", "http://" + apip);
  response->addHeader("Connection", "close");
  response->setCode(307);
  response->print("<!DOCTYPE html><html><head><title>Redirect</title>");
  response->printf("<meta http-equiv=\"Refresh\" content=\"0; URL=http://%s/\"/>", apip.c_str());
  response->print("</head><body>");
  response->printf("<p>Open <a href='http://%s/'>this link</a></p>", apip.c_str());
  response->printf("<script>window.location = \"http://%s/\";</script>", apip.c_str());
  response->print("</body></html>");
  request->send(response);
}

void handleIndexRequest(AsyncWebServerRequest *request) {
  const char * buildTime = __DATE__ " " __TIME__ " GMT";
  if (request->header("If-Modified-Since").equals(buildTime)) {
    request->send(304);
  } else {
    AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_html_gz, index_html_gz_len);
    response->addHeader("Content-Encoding", "gzip");
    response->addHeader("Last-Modified", buildTime);
    request->send(response);
  }
  // AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/index.html.gz", "text/html", false, nullptr);
  
}

void handleIndexUpload(AsyncWebServerRequest *request) {
  // const char * buildTime = __DATE__ " " __TIME__ " GMT";
  // if (request->header("If-Modified-Since").equals(buildTime)) {
  //   request->send(304);
  // } else {
  //   AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_html_gz, index_html_gz_len);
  //   response->addHeader("Content-Encoding", "gzip");
  //   response->addHeader("Last-Modified", buildTime);
  //   request->send(response);
  // }
}

void onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
    if(type == WS_EVT_CONNECT){
    Serial.printf("ws[%s][%u] connect\n", server->url(), client->id());
    // client->printf("Hello Client %u :)", client->id());
    onWsSetup(client);
    client->ping();
  } else if(type == WS_EVT_DISCONNECT){
    Serial.printf("ws[%s][%u] disconnect\n", server->url(), client->id());
  } else if(type == WS_EVT_ERROR){
    Serial.printf("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
  } else if(type == WS_EVT_PONG){
    Serial.printf("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len)?(char*)data:"");
  } else if(type == WS_EVT_DATA){
    // Serial.printf("ws[%s][%u] data[%u]: %s\n", server->url(), client->id(), len, (len)?(char*)data:"");
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len) {
      if(info->opcode != WS_BINARY) Serial.printf("Not binary info: opcode=%d", info->opcode);
      onWsMessage(server, data, len);
      // switch (data[0]) {
      //   case 0xC2: {
      //     if (len == sizeof(Configuration)) {
      //       Serial.print("Saving config .. ");
      //       ResponseStatus rs = E32writeConfig(*(Configuration*)data);
      //       Serial.println(rs.getResponseDescription());
      //       E32updateConfig();
      //       server->binaryAll((char*) E32config(), sizeof(Configuration));
      //     }
      //     break;
      //   } case 0x03: {
      //     Serial.print("Transmitting .. ");
      //     ResponseStatus rs = E32send(data, len);
      //     Serial.println(rs.getResponseDescription());
      //     break;
      //   } default: {
      //     Serial.print("[RX]: ");
      //     for (int i=0; i < len; i++) Serial.print(data[i], HEX);
      //     Serial.println("");
      //     break;
      //   }
      // }
    }

  }
}
