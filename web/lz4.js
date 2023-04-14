function hashU32(a) {
    a = a | 0;
    a = a + 2127912214 + (a << 12) | 0;
    a = a ^ -949894596 ^ a >>> 19;
    a = a + 374761393 + (a << 5) | 0;
    a = a + -744332180 ^ a << 9;
    a = a + -42973499 + (a << 3) | 0;
    return a ^ -1252372727 ^ a >>> 16 | 0;
};

function readU64(b, n) {
    var x = 0;
    x |= b[n++] << 0;
    x |= b[n++] << 8;
    x |= b[n++] << 16;
    x |= b[n++] << 24;
    x |= b[n++] << 32;
    x |= b[n++] << 40;
    x |= b[n++] << 48;
    x |= b[n++] << 56;
    return x;
};

function readU32(b, n) {
    var x = 0;
    x |= b[n++] << 0;
    x |= b[n++] << 8;
    x |= b[n++] << 16;
    x |= b[n++] << 24;
    return x;
};

// Writes a 32-bit little-endian integer from an array.
function writeU32(b, n, x) {
    b[n++] = (x >> 0) & 0xff;
    b[n++] = (x >> 8) & 0xff;
    b[n++] = (x >> 16) & 0xff;
    b[n++] = (x >> 24) & 0xff;
};

// Multiplies two numbers using 32-bit integer multiplication.
// Algorithm from Emscripten.
function imul(a, b) {
    var ah = a >>> 16;
    var al = a & 65535;
    var bh = b >>> 16;
    var bl = b & 65535;

    return al * bl + (ah * bl + al * bh << 16) | 0;
};

// xxhash32 primes
prime1 = 0x9e3779b1
prime2 = 0x85ebca77
prime3 = 0xc2b2ae3d
prime4 = 0x27d4eb2f
prime5 = 0x165667b1

function rotl32 (x, r) {
    x = x | 0;
    r = r | 0;
    
    return x >>> (32 - r | 0) | x << r | 0;
};

function rotmul32 (h, r, m) {
    h = h | 0;
    r = r | 0;
    m = m | 0;
    
    return this.imul(h >>> (32 - r | 0) | h << r, m) | 0;
};

function shiftxor32 (h, s) {
    h = h | 0;
    s = s | 0;
    
    return h >>> s ^ h | 0;
};

function xxhapply (h, src, m0, s, m1) {
    return this.rotmul32(this.imul(src, m0) + h, s, m1);
};
    
function xxh1 (h, src, index) {
    return this.rotmul32((h + this.imul(src[index], this.prime5)), 11, this.prime1);
};

function xxh4 (h, src, index) {
    return this.xxhapply(h, this.readU32(src, index), this.prime3, 17, this.prime4);
};

function xxh16 (h, src, index) {
    return [
        this.xxhapply(h[0], this.readU32(src, index + 0), this.prime2, 13, this.prime1),
        this.xxhapply(h[1], this.readU32(src, index + 4), this.prime2, 13, this.prime1),
        this.xxhapply(h[2], this.readU32(src, index + 8), this.prime2, 13, this.prime1),
        this.xxhapply(h[3], this.readU32(src, index + 12), this.prime2, 13, this.prime1)
    ];
};

function xxh32 (seed, src, index, len) {
    var h, l;
    l = len;
    if (len >= 16) {
        h = [
        seed + this.prime1 + this.prime2,
        seed + this.prime2,
        seed,
        seed - this.prime1
        ];
    
        while (len >= 16) {
        h = this.xxh16(h, src, index);
    
        index += 16;
        len -= 16;
        }
    
        h = this.rotl32(h[0], 1) + this.rotl32(h[1], 7) + this.rotl32(h[2], 12) + this.rotl32(h[3], 18) + l;
    } else {
        h = (seed + this.prime5 + len) >>> 0;
    }
    
    while (len >= 4) {
        h = this.xxh4(h, src, index);
    
        index += 4;
        len -= 4;
    }
    
    while (len > 0) {
        h = this.xxh1(h, src, index);
    
        index++;
        len--;
    }
    
    h = this.shiftxor32(this.imul(this.shiftxor32(this.imul(this.shiftxor32(h, 15), this.prime2), 13), this.prime3), 16);
    
    return h >>> 0;
};

// Compression format parameters/constants.
minMatch = 4;
minLength = 13;
searchLimit = 5;
skipTrigger = 6;
hashSize = 1 << 16;

// Token constants.
mlBits = 4;
mlMask = (1 << this.mlBits) - 1;
runBits = 4;
runMask = (1 << this.runBits) - 1;

// Shared buffers
blockBuf = this.makeBuffer(5 << 20);
hashTable = this.makeHashTable();

// Frame constants.
magicNum = 0x184D2204;

// Frame descriptor flags.
fdContentChksum = 0x4,
fdContentSize = 0x8,
fdBlockChksum = 0x10,
// fdBlockIndep = 0x20;
fdVersion = 0x40,
fdVersionMask = 0xC0,

// Block sizes.
bsUncompressed = 0x80000000,
bsDefault = 7,
bsShift = 4,
bsMask = 7,
bsMap = {
    4: 0x10000,
    5: 0x40000,
    6: 0x100000,
    7: 0x400000
};

function makeHashTable () {
    try {
        return new Uint32Array(this.hashSize);
    } catch (error) {
        var hashTable = new Array(this.hashSize);
    
        for (var i = 0; i < this.hashSize; i++) {
        hashTable[i] = 0;
        }
    
        return hashTable;
    }
};

function clearHashTable (hashTable) {
    for (var i = 0; i < this.hashSize; i++) {
        hashTable[i] = 0;
    }
};

// Makes a byte buffer. On older browsers, may return a plain array.
function makeBuffer (size) {
    try {
        return new Uint8Array(size);
    } catch (error) {
        var buf = new Array(size);

        for (var i = 0; i < size; i++) {
        buf[i] = 0;
        }

        return buf;
    }
};

function sliceArray (array, start, end) {
    if (typeof array.buffer !== undefined) {
        if (Uint8Array.prototype.slice) {
        return array.slice(start, end);
        } else {
        // Uint8Arrayslice polyfill.
        var len = array.length;
    
        // Calculate start.
        start = start | 0;
        start = (start < 0) ? Math.max(len + start, 0) : Math.min(start, len);
    
        // Calculate end.
        end = (end === undefined) ? len : end | 0;
        end = (end < 0) ? Math.max(len + end, 0) : Math.min(end, len);
    
        // Copy into new array.
        var arraySlice = new Uint8Array(end - start);
        for (var i = start, n = 0; i < end;) {
            arraySlice[n++] = array[i++];
        }
    
        return arraySlice;
        }
    } else {
        // Assume normal array.
        return array.slice(start, end);
    }
};

function compressBound (n) {
    return (n + (n / 255) + 16) | 0;
};

function decompressBound (src) {
    var sIndex = 0;
    
    // Read magic number
    if (this.readU32(src, sIndex) !== this.magicNum) {
        throw new Error('invalid magic number');
    }
    
    sIndex += 4;
    
    // Read descriptor
    var descriptor = src[sIndex++];
    
    // Check version
    if ((descriptor & this.fdVersionMask) !== this.fdVersion) {
        throw new Error('incompatible descriptor version ' + (descriptor & this.fdVersionMask));
    }
    
    // Read flags
    var useBlockSum = (descriptor & this.fdBlockChksum) !== 0;
    var useContentSize = (descriptor & this.fdContentSize) !== 0;
    
    // Read block size
    var bsIdx = (src[sIndex++] >> this.bsShift) & this.bsMask;
    
    if (this.bsMap[bsIdx] === undefined) {
        throw new Error('invalid block size ' + bsIdx);
    }
    
    var maxBlockSize = this.bsMap[bsIdx];
    
    // Get content size
    if (useContentSize) {
        return this.readU64(src, sIndex);
    }
    
    // Checksum
    sIndex++;
    
    // Read blocks.
    var maxSize = 0;
    while (true) {
        var blockSize = this.readU32(src, sIndex);
        sIndex += 4;
    
        if (blockSize & this.bsUncompressed) {
        blockSize &= ~this.bsUncompressed;
        maxSize += blockSize;
        } else if (blockSize > 0) {
        maxSize += maxBlockSize;
        }
    
        if (blockSize === 0) {
        return maxSize;
        }
    
        if (useBlockSum) {
        sIndex += 4;
        }
    
        sIndex += blockSize;
    }
};

function decompressBlock (src, dst, sIndex, sLength, dIndex) {
    var mLength, mOffset, sEnd, n, i;
    var hasCopyWithin = dst.copyWithin !== undefined && dst.fill !== undefined;
    
    // Setup initial state.
    sEnd = sIndex + sLength;
    
    // Consume entire input block.
    while (sIndex < sEnd) {
        var token = src[sIndex++];
    
        // Copy literals.
        var literalCount = (token >> 4);
        if (literalCount > 0) {
        // Parse length.
        if (literalCount === 0xf) {
            while (true) {
            literalCount += src[sIndex];
            if (src[sIndex++] !== 0xff) {
                break;
            }
            }
        }
    
        // Copy literals
        for (n = sIndex + literalCount; sIndex < n;) {
            dst[dIndex++] = src[sIndex++];
        }
        }
    
        if (sIndex >= sEnd) {
        break;
        }
    
        // Copy match.
        mLength = (token & 0xf);
    
        // Parse offset.
        mOffset = src[sIndex++] | (src[sIndex++] << 8);
    
        // Parse length.
        if (mLength === 0xf) {
        while (true) {
            mLength += src[sIndex];
            if (src[sIndex++] !== 0xff) {
            break;
            }
        }
        }
    
        mLength += this.minMatch;
    
        // Copy match
        // prefer to use typedarray.copyWithin for larger matches
        // NOTE: copyWithin doesn't work as required by LZ4 for overlapping sequences
        // e.g. mOffset=1, mLength=30 (repeach char 30 times)
        // we special case the repeat char w/ array.fill
        if (hasCopyWithin && mOffset === 1) {
        dst.fill(dst[dIndex - 1] | 0, dIndex, dIndex + mLength);
        dIndex += mLength;
        } else if (hasCopyWithin && mOffset > mLength && mLength > 31) {
        dst.copyWithin(dIndex, dIndex - mOffset, dIndex - mOffset + mLength);
        dIndex += mLength;
        } else {
        for (i = dIndex - mOffset, n = i + mLength; i < n;) {
            dst[dIndex++] = dst[i++] | 0;
        }
        }
    }
    
    return dIndex;
};

function compressBlock (src, dst, sIndex, sLength, hashTable) {
    var mIndex, mAnchor, mLength, mOffset, mStep;
    var literalCount, dIndex, sEnd, n;
    
    // Setup initial state.
    dIndex = 0;
    sEnd = sLength + sIndex;
    mAnchor = sIndex;
    
    // Process only if block is large enough.
    if (sLength >= this.minLength) {
        var searchMatchCount = (1 << this.skipTrigger) + 3;
    
        // Consume until last n literals (Lz4 spec limitation.)
        while (sIndex + this.minMatch < sEnd - this.searchLimit) {
        var seq = this.readU32(src, sIndex);
        var hash = this.hashU32(seq) >>> 0;
    
        // Crush hash to 16 bits.
        hash = ((hash >> 16) ^ hash) >>> 0 & 0xffff;
    
        // Look for a match in the hashtable. NOTE: remove one; see below.
        mIndex = hashTable[hash] - 1;
    
        // Put pos in hash table. NOTE: add one so that zero = invalid.
        hashTable[hash] = sIndex + 1;
    
        // Determine if there is a match (within range.)
        if (mIndex < 0 || ((sIndex - mIndex) >>> 16) > 0 || this.readU32(src, mIndex) !== seq) {
            mStep = searchMatchCount++ >> this.skipTrigger;
            sIndex += mStep;
            continue;
        }
    
        searchMatchCount = (1 << this.skipTrigger) + 3;
    
        // Calculate literal count and offset.
        literalCount = sIndex - mAnchor;
        mOffset = sIndex - mIndex;
    
        // We've already matched one word, so get that out of the way.
        sIndex += this.minMatch;
        mIndex += this.minMatch;
    
        // Determine match length.
        // N.B.: mLength does not include minMatch, Lz4 adds it back
        // in decoding.
        mLength = sIndex;
        while (sIndex < sEnd - this.searchLimit && src[sIndex] === src[mIndex]) {
            sIndex++;
            mIndex++;
        }
        mLength = sIndex - mLength;
    
        // Write token + literal count.
        var token = mLength < this.mlMask ? mLength : this.mlMask;
        if (literalCount >= this.runMask) {
            dst[dIndex++] = (this.runMask << this.mlBits) + token;
            for (n = literalCount - this.runMask; n >= 0xff; n -= 0xff) {
            dst[dIndex++] = 0xff;
            }
            dst[dIndex++] = n;
        } else {
            dst[dIndex++] = (literalCount << this.mlBits) + token;
        }
    
        // Write literals.
        for (var i = 0; i < literalCount; i++) {
            dst[dIndex++] = src[mAnchor + i];
        }
    
        // Write offset.
        dst[dIndex++] = mOffset;
        dst[dIndex++] = (mOffset >> 8);
    
        // Write match length.
        if (mLength >= this.mlMask) {
            for (n = mLength - this.mlMask; n >= 0xff; n -= 0xff) {
            dst[dIndex++] = 0xff;
            }
            dst[dIndex++] = n;
        }
    
        // Move the anchor.
        mAnchor = sIndex;
        }
    }
    
    // Nothing was encoded.
    if (mAnchor === 0) {
        return 0;
    }
    
    // Write remaining literals.
    // Write literal token+count.
    literalCount = sEnd - mAnchor;
    if (literalCount >= this.runMask) {
        dst[dIndex++] = (this.runMask << this.mlBits);
        for (n = literalCount - this.runMask; n >= 0xff; n -= 0xff) {
        dst[dIndex++] = 0xff;
        }
        dst[dIndex++] = n;
    } else {
        dst[dIndex++] = (literalCount << this.mlBits);
    }
    
    // Write literals.
    sIndex = mAnchor;
    while (sIndex < sEnd) {
        dst[dIndex++] = src[sIndex++];
    }
    
    return dIndex;
};

function decompressFrame (src, dst) {
    var useBlockSum, useContentSum, useContentSize, descriptor;
    var sIndex = 0;
    var dIndex = 0;
    
    // Read magic number
    if (this.readU32(src, sIndex) !== this.magicNum) {
        throw new Error('invalid magic number');
    }
    
    sIndex += 4;
    
    // Read descriptor
    descriptor = src[sIndex++];
    
    // Check version
    if ((descriptor & this.fdVersionMask) !== this.fdVersion) {
        throw new Error('incompatible descriptor version');
    }
    
    // Read flags
    useBlockSum = (descriptor & this.fdBlockChksum) !== 0;
    useContentSum = (descriptor & this.fdContentChksum) !== 0;
    useContentSize = (descriptor & this.fdContentSize) !== 0;
    
    // Read block size
    var bsIdx = (src[sIndex++] >> this.bsShift) & this.bsMask;
    
    if (this.bsMap[bsIdx] === undefined) {
        throw new Error('invalid block size');
    }
    
    if (useContentSize) {
        // TODO: read content size
        sIndex += 8;
    }
    
    sIndex++;
    
    // Read blocks.
    while (true) {
        var compSize;
    
        compSize = this.readU32(src, sIndex);
        sIndex += 4;
    
        if (compSize === 0) {
        break;
        }
    
        if (useBlockSum) {
        // TODO: read block checksum
        sIndex += 4;
        }
    
        // Check if block is compressed
        if ((compSize & this.bsUncompressed) !== 0) {
        // Mask off the 'uncompressed' bit
        compSize &= ~this.bsUncompressed;
    
        // Copy uncompressed data into destination buffer.
        for (var j = 0; j < compSize; j++) {
            dst[dIndex++] = src[sIndex++];
        }
        } else {
        // Decompress into blockBuf
        dIndex = this.decompressBlock(src, dst, sIndex, compSize, dIndex);
        sIndex += compSize;
        }
    }
    
    if (useContentSum) {
        // TODO: read content checksum
        sIndex += 4;
    }
    
    return dIndex;
};

function compressFrame (src, dst) {
    var dIndex = 0;
    
    // Write magic number.
    this.writeU32(dst, dIndex, this.magicNum);
    dIndex += 4;
    
    // Descriptor flags.
    dst[dIndex++] = this.fdVersion;
    dst[dIndex++] = this.bsDefault << this.bsShift;
    
    // Descriptor checksum.
    dst[dIndex] = this.xxh32(0, dst, 4, dIndex - 4) >> 8;
    dIndex++;
    
    // Write blocks.
    var maxBlockSize = this.bsMap[this.bsDefault];
    var remaining = src.length;
    var sIndex = 0;
    
    // Clear the hashtable.
    this.clearHashTable(this.hashTable);
    
    // Split input into blocks and write.
    while (remaining > 0) {
        var compSize = 0;
        var blockSize = remaining > maxBlockSize ? maxBlockSize : remaining;
    
        compSize = this.compressBlock(src, this.blockBuf, sIndex, blockSize, this.hashTable);
    
        if (compSize > blockSize || compSize === 0) {
        // Output uncompressed.
        this.writeU32(dst, dIndex, 0x80000000 | blockSize);
        dIndex += 4;
    
        for (var z = sIndex + blockSize; sIndex < z;) {
            dst[dIndex++] = src[sIndex++];
        }
    
        remaining -= blockSize;
        } else {
        // Output compressed.
        this.writeU32(dst, dIndex, compSize);
        dIndex += 4;
    
        for (var j = 0; j < compSize;) {
            dst[dIndex++] = this.blockBuf[j++];
        }
    
        sIndex += blockSize;
        remaining -= blockSize;
        }
    }
    
    // Write blank end block.
    this.writeU32(dst, dIndex, 0);
    dIndex += 4;
    
    return dIndex;
};

lz4_decompress = function(src, maxSize) {
    var dst, size;
    
    if (maxSize === undefined) {
        maxSize = this.decompressBound(src);
    }
    dst = this.makeBuffer(maxSize);
    size = this.decompressFrame(src, dst);
    
    if (size !== maxSize) {
        dst = this.sliceArray(dst, 0, size);
    }
    
    return dst;
};

lz4_compress = function(src, maxSize) {
    var dst, size;

    if (maxSize === undefined) {
        maxSize = this.compressBound(src.length);
    }

    dst = this.makeBuffer(maxSize);
    size = this.compressFrame(src, dst);

    if (size !== maxSize) {
        dst = this.sliceArray(dst, 0, size);
    }

    return dst;
};

exports.lz4_compress = this.lz4_compress;
exports.lz4_decompress = this.lz4_decompress;