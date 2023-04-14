#include "lora.h"

LoRa_E32 e32ttl(E32_PIN_TX, E32_PIN_RX, E32_PIN_AUX, E32_PIN_M0, E32_PIN_M1);

ModuleInformation e32modinfo;   // Curent info
Configuration e32config;       // Current config
void (*E32callback)(uint8_t cmd, void *data, size_t len);

void E32setCallback(void (*callback)(uint8_t cmd, void *data, size_t len)) {
    E32callback = callback;
}


bool E32setup() {
    bool ok = e32ttl.begin();
    ResponseStructContainer c;
    c = E32updateConfig();
    ok &= c.status.code == E32_SUCCESS;
    c = E32updateModInfo();
    ok &= c.status.code == E32_SUCCESS;
    return ok;
}

Configuration* E32config() {
    return &e32config;
}

ResponseStatus E32writeConfig(Configuration cfg) {
    return e32ttl.setConfiguration(cfg, WRITE_CFG_PWR_DWN_LOSE);
}

ResponseStatus E32send(void *data, size_t len) {
    E32header header = {0x01, len};
    e32ttl.sendMessage(&header, sizeof(E32header));
    return e32ttl.sendMessage(data, len);
}

void E32receiverLoop() {
    if (e32ttl.available() > 1){
        ResponseStructContainer rs = e32ttl.receiveMessage(sizeof(E32header));
        E32header header = *(E32header*) rs.data;
        Serial.print("[LORA] header received: ");
        Serial.println(rs.status.getResponseDescription());
        rs.close();
        rs = e32ttl.receiveMessage(header.size);
        if(E32callback != nullptr) {
            E32callback(header.cmd, rs.data, header.size);
        }
        Serial.print("[LORA] body received: ");   
        Serial.println(rs.status.getResponseDescription());
        rs.close();
    }
}

ModuleInformation* E32modinfo() {
    return &e32modinfo;
}

ResponseStructContainer E32updateConfig() {
    ResponseStructContainer c;
    c = e32ttl.getConfiguration();
    e32config = *(Configuration*) c.data;
    return c;
}

ResponseStructContainer E32updateModInfo() {
    ResponseStructContainer c;
    c = e32ttl.getModuleInformation();
    e32modinfo = *(ModuleInformation*) c.data;
    return c;
}

void E32printModinfo() {
    Serial.print(F("[LORA] Series E"));  Serial.println(e32modinfo.frequency, HEX);
    Serial.print(F("[LORA] Version  : v"));  Serial.print(e32modinfo.version >> 4, HEX);
    Serial.print(F("."));  Serial.println(e32modinfo.version & 0x0F, HEX);
    Serial.print(F("[LORA] Features : 0x"));  Serial.println(e32modinfo.features, HEX);
}

void E32printConfig() {
    Serial.print(F("[LORA] Channel : ")); Serial.print(e32config.CHAN, DEC); Serial.print(" -> "); Serial.println(e32config.getChannelDescription());
    Serial.print(F("[LORA] SpeedParityBit : ")); Serial.print(e32config.SPED.uartParity, BIN);Serial.print(" -> "); Serial.println(e32config.SPED.getUARTParityDescription());
    Serial.print(F("[LORA] SpeedUARTDatte : ")); Serial.print(e32config.SPED.uartBaudRate, BIN);Serial.print(" -> "); Serial.println(e32config.SPED.getUARTBaudRate());
    Serial.print(F("[LORA] SpeedAirDataRate : ")); Serial.print(e32config.SPED.airDataRate, BIN);Serial.print(" -> "); Serial.println(e32config.SPED.getAirDataRate());
    Serial.print(F("[LORA] OptionTrans : ")); Serial.print(e32config.OPTION.fixedTransmission, BIN);Serial.print(" -> "); Serial.println(e32config.OPTION.getFixedTransmissionDescription());
    Serial.print(F("[LORA] OptionPullup : ")); Serial.print(e32config.OPTION.ioDriveMode, BIN);Serial.print(" -> "); Serial.println(e32config.OPTION.getIODroveModeDescription());
    Serial.print(F("[LORA] OptionWakeup : ")); Serial.print(e32config.OPTION.wirelessWakeupTime, BIN);Serial.print(" -> "); Serial.println(e32config.OPTION.getWirelessWakeUPTimeDescription());
    Serial.print(F("[LORA] OptionFEC : ")); Serial.print(e32config.OPTION.fec, BIN);Serial.print(" -> "); Serial.println(e32config.OPTION.getFECDescription());
    Serial.print(F("[LORA] OptionPower : ")); Serial.print(e32config.OPTION.transmissionPower, BIN);Serial.print(" -> "); Serial.println(e32config.OPTION.getTransmissionPowerDescription());
}