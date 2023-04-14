#!/usr/bin/env python

import gzip


if __name__ == '__main__':
    with open('page.html', 'rb') as f:
        html = f.read()
        compressed = gzip.compress(html, compresslevel=9)
    
    print(f"Reduced size from {len(html)} to {len(compressed)} ({len(compressed)/len(html)*100:.1f}%)")
    
    with open('../src/page.h', 'w') as f:
        data = ','.join('0x{:02X}'.format(a) for a in compressed)
        f.write(
            '#ifndef LORA_WEBSITE_PAGE_H_\n'
            '#define LORA_WEBSITE_PAGE_H_\n'
            f'#define index_html_gz_len {len(compressed)}\n'
            f'const unsigned char index_html_gz[] PROGMEM = {{{data}}};\n'
            '#endif\n'
        )

    with open('page.html.gz', 'wb') as f:
        f.write(compressed)
