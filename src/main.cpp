#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
// #include <SPIFFSEditor.h>

// #include "lora.h"
#include "website.h"
#include "config.h"

DNSServer dnsServer;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
AsyncEventSource events("/events");

char *ssid = (char*) malloc(64*sizeof(char));
char *password = (char*) malloc(64*sizeof(char));
uint8_t wifiChannel = WIFI_CHANNEL;
uint8_t wifiHidden = WIFI_HIDE;

char *cli_ssid = (char*) malloc(64*sizeof(char));
char *cli_password = (char*) malloc(64*sizeof(char));

bool wifiApEnabled = false;
bool wifiEnabled = false;



IPAddress local_IP(WIFI_IP);
IPAddress gateway(WIFI_GATEWAY);
IPAddress subnet(WIFI_MASK);

void onLoraMessage(uint8_t cmd, void *data, size_t len) {
  Serial.printf("[LORA] message cmd=%u size=%u:", cmd, len);
  Serial.write((char*) data, len);
  Serial.println();
  ws.binaryAll((char*) data, len);
}

void setupWifiAP(bool start) {
  if(!start) {
    WiFi.softAPdisconnect();
    return;
  }
  Serial.print("Setup AP ");
  Serial.print(WiFi.softAPmacAddress());
  Serial.print(" .. ");

  bool ok = WiFi.softAPConfig(local_IP, gateway, subnet);
  ok &= WiFi.softAP(ssid, password, wifiChannel, wifiHidden, WIFI_MAX_CLI);
  Serial.println(ok ? "ok" : "fail");
  if(!wifiApEnabled) {
    dnsServer.start(53, "*", WiFi.softAPIP());
  }
  wifiApEnabled = true;
}

void setupWifi(bool start) {
  if(WiFi.status() == WL_CONNECTED) WiFi.disconnect();
  if(!start) return;

  Serial.printf("Connecting to AP %s .. ", cli_ssid);
  wl_status_t status = WiFi.begin(cli_ssid, cli_password);
  for(uint8_t i=0;i<50;i++) {
    if(WiFi.status() != WL_DISCONNECTED) break;
    delay(100);
    status = WiFi.status();
  }
  if(WiFi.status() == WL_CONNECTED) { 
    Serial.print(" ok\r\nConnected IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print("fail reason=");
    Serial.println(status);
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\r\nreset ..");
  
  // #ifdef WIFI_CLIENT_SSID
  // Serial.println("Wifi in AP_STA mode");
  // WiFi.mode(WIFI_AP_STA);
  // #endif

  // #ifndef WIFI_CLIENT_SSID
  // ok &= 
  // #endif

  #ifdef WIFI_CLIENT_SSID
  setupWifi(true);
  #endif

  strcpy(ssid, WIFI_SSID);
  strcpy(password, WIFI_PASS);
  #ifdef WIFI_AP
  setupWifiAP(true);
  #endif

  Serial.print("Setup LORA .. ");
  bool ok = E32setup();
  Serial.println(ok ? "ok" : "fail");
  if(ok) {
    E32printModinfo();
    E32printConfig();
  }

  Serial.print("Setup FS .. ");
  ok = SPIFFS.begin();
  Serial.println(ok ? "ok" : "fail");

  E32setCallback(onLoraMessage);
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.addHandler(new CaptiveRequestHandler());
  // server.addHandler(new SPIFFSEditor("admin", "admin"));
  server.on("/heap", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/plain", String(ESP.getFreeHeap()));
  });
  server.on("/", HTTP_GET, handleIndexRequest);

  // server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html.gz");
  // server.addHandler(new CaptiveRequestHandler()).setFilter(ON_AP_FILTER);

  // events.onConnect([](AsyncEventSourceClient *client){
  //   client->send("hello!",NULL,millis(),1000);
  // });
  // server.addHandler(&events);

  server.begin();
  // socketServer.listen(8080);
}

void loop() {
  dnsServer.processNextRequest();
  ws.cleanupClients();
  E32receiverLoop();
}

void sendStrValue(AsyncWebSocketClient *client, char cmd, char *str) {
    size_t len = strlen(str)+2;
    char* cfg = (char*) malloc(sizeof str * len);
    *cfg = cmd;
    strcpy(cfg+1, str);
    client->binary(cfg, len);
    free(cfg);
}

void onWsSetup(AsyncWebSocketClient * client) {
    client->binary((char*) E32modinfo(), sizeof(ModuleInformation));
    client->binary((char*) E32config(), sizeof(Configuration));
    
    sendStrValue(client, 0x10, ssid);
    sendStrValue(client, 0x11, password);
    char wifi_setup[] = {0x12, wifiChannel, wifiHidden};
    client->binary((char*) wifi_setup, 3);
    sendStrValue(client, 0x15, cli_ssid);
}

void onWsMessage(AsyncWebSocket * server, uint8_t *data, size_t len) {
    switch (data[0]) {
      case 0xC2: {
        if (len == sizeof(Configuration)) {
          Serial.print("Saving config .. ");
          ResponseStatus rs = E32writeConfig(*(Configuration*)data);
          Serial.println(rs.getResponseDescription());
          E32updateConfig();
          server->binaryAll((char*) E32config(), sizeof(Configuration));
        }
        break;
      } case 0x03: {
        Serial.print("Transmitting .. ");
        ResponseStatus rs = E32send(data, len);
        Serial.println(rs.getResponseDescription());
        break;
      } case 0x10: {
        strcpy(ssid, (char*)(data+1));
        Serial.print("WiFi ssid: ");
        Serial.println(ssid);
        server->binaryAll((char*) data, len);
        break;
      } case 0x11: {
        strcpy(password, (char*)(data+1));
        Serial.print("WiFi password: ");
        Serial.println(password);
        server->binaryAll((char*) data, len);
        break;
      } case 0x12: {
        wifiChannel = data[1];
        wifiHidden = data[2];
        Serial.printf("WiFi channel/hide: %d/%d\n", wifiChannel, wifiHidden);
        server->binaryAll((char*) data, len);
        break;
      } case 0x15: {
        strcpy(cli_ssid, (char*)(data+1));
        Serial.print("WiFi cli SSID: ");
        Serial.println(cli_ssid);
        server->binaryAll((char*) data, len);
        break;
      } case 0x16: {
        strcpy(cli_password, (char*)(data+1));
        Serial.println("WiFi cli password updated");
        break;
      } case 0x1E: {
        Serial.println("Reloading WiFi");
        setupWifiAP(data[1]);
        break;
      } case 0x1F: {
        Serial.println("Reloading WiFi AP");
        setupWifiAP(data[1]);
        break;
      } default: {
        Serial.print("[RX]: ");
        for (size_t i=0; i < len; i++) Serial.print(data[i], HEX);
        Serial.println("");
        break;
      }
    }
}