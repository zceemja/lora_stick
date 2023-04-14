#!/usr/bin/env python
import asyncio
import aiohttp
from aiohttp import web


CONFIG = bytes.fromhex('c000001a1744')

async def index_handler(request):
    # Always read fresh, do not cache
    with open('page.html', 'rb') as f:
        return web.Response(body=f.read(), content_type='text/html')


async def ws_handler(request):
    global CONFIG
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    await ws.send_bytes(b'\xC3' + b'\xFF' * 4)  # sending ModuleInformation
    await ws.send_bytes(CONFIG)  # sending Configuration

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.BINARY:
            if msg.data[0] == 0xC0 and len(msg.data) == 6:
                CONFIG = msg.data
                print("Data saved")
            if msg.data[0] == 0x03:
                await ws.send_bytes(msg.data);
                print("Echoing message")
            print(f"[RX] {' '.join(['{:02X}'.format(x) for x in msg.data])}")
        elif msg.type == aiohttp.WSMsgType.TEXT:
            msg.data = await ws.receive()
            print(f"[RX][TEXT] {' '.join(['{:02X}'.format(x) for x in msg.data])}")
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print(f"WS error: {ws.exception()}")
        else:
            print(f"WS Message: {msg.type}")
    
    return ws


async def setup():
    app = web.Application()
    app.add_routes([
        web.get('/', index_handler),
        web.get('/ws', ws_handler),
    ])
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '127.0.0.1', 8080)
    await site.start()


if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    loop.run_until_complete(setup())
    # try:
    #     import webbrowser
    #     webbrowser.open('http://127.0.0.1:8080')
    # except ImportError:
    #     pass
    loop.run_forever()
