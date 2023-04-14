# LORA Stick

Code to combine ESP8266 with LORA module E32-433T20D to send and receive messages over web interface.

![Diagram](/docs/diagram.svg)

## Features

* Web interface with websockets
* ChaCha20 encryption
* LZ compression
* LORA module configuration over web

Messages are send with LZ compression and ChaCha20 encryption on javascript side.

## LORA

Uses [LoRa_E32_Series_Library](https://github.com/xreef/LoRa_E32_Series_Library) for controlling LoRa moudle.

It is possible to use EBYTE LoRa SX1278/SX1276 including

* E32-TTL-100
* E32-TTL-100S1
* E32-TTL-100S2
* E32-TTL-500
* E32-TTL-1W
* E32 (433T30S)
* E32 (868T30S)
* E32 (915T30S)


## Website

Website is build on [petite-vue](https://github.com/vuejs/petite-vue) without any javascript package manager. Page is converted to program memory array with [make_page.py](/web/make_page.py). ESP8266 device websocket communication can be emulated with [server.py](/web/server.py).

Compressed html page takes ~20kB.
