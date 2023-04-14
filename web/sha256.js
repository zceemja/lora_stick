// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311
var K = [
    0x428a2f98 | 0, 0x71374491 | 0, 0xb5c0fbcf | 0, 0xe9b5dba5 | 0,
    0x3956c25b | 0, 0x59f111f1 | 0, 0x923f82a4 | 0, 0xab1c5ed5 | 0,
    0xd807aa98 | 0, 0x12835b01 | 0, 0x243185be | 0, 0x550c7dc3 | 0,
    0x72be5d74 | 0, 0x80deb1fe | 0, 0x9bdc06a7 | 0, 0xc19bf174 | 0,
    0xe49b69c1 | 0, 0xefbe4786 | 0, 0x0fc19dc6 | 0, 0x240ca1cc | 0,
    0x2de92c6f | 0, 0x4a7484aa | 0, 0x5cb0a9dc | 0, 0x76f988da | 0,
    0x983e5152 | 0, 0xa831c66d | 0, 0xb00327c8 | 0, 0xbf597fc7 | 0,
    0xc6e00bf3 | 0, 0xd5a79147 | 0, 0x06ca6351 | 0, 0x14292967 | 0,
    0x27b70a85 | 0, 0x2e1b2138 | 0, 0x4d2c6dfc | 0, 0x53380d13 | 0,
    0x650a7354 | 0, 0x766a0abb | 0, 0x81c2c92e | 0, 0x92722c85 | 0,
    0xa2bfe8a1 | 0, 0xa81a664b | 0, 0xc24b8b70 | 0, 0xc76c51a3 | 0,
    0xd192e819 | 0, 0xd6990624 | 0, 0xf40e3585 | 0, 0x106aa070 | 0,
    0x19a4c116 | 0, 0x1e376c08 | 0, 0x2748774c | 0, 0x34b0bcb5 | 0,
    0x391c0cb3 | 0, 0x4ed8aa4a | 0, 0x5b9cca4f | 0, 0x682e6ff3 | 0,
    0x748f82ee | 0, 0x78a5636f | 0, 0x84c87814 | 0, 0x8cc70208 | 0,
    0x90befffa | 0, 0xa4506ceb | 0, 0xbef9a3f7 | 0, 0xc67178f2 | 0,
];
var N;
(function (N) {
    N[N["inputBytes"] = 64] = "inputBytes";
    N[N["inputWords"] = 16] = "inputWords";
    N[N["highIndex"] = 14] = "highIndex";
    N[N["lowIndex"] = 15] = "lowIndex";
    N[N["workWords"] = 64] = "workWords";
    N[N["allocBytes"] = 80] = "allocBytes";
    N[N["allocWords"] = 20] = "allocWords";
    N[N["allocTotal"] = 8000] = "allocTotal";
})(N || (N = {}));

var HashSha256 = /** @class */ (function () {
    function HashSha256() {
        // first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
        this.A = 0x6a09e667 | 0;
        this.B = 0xbb67ae85 | 0;
        this.C = 0x3c6ef372 | 0;
        this.D = 0xa54ff53a | 0;
        this.E = 0x510e527f | 0;
        this.F = 0x9b05688c | 0;
        this.G = 0x1f83d9ab | 0;
        this.H = 0x5be0cd19 | 0;
        this._size = 0;
        this._sp = 0; // surrogate pair
        if (!sharedBuffer || sharedOffset >= N.allocTotal) {
            sharedBuffer = new ArrayBuffer(N.allocTotal);
            sharedOffset = 0;
        }
        this._byte = new Uint8Array(sharedBuffer, sharedOffset, N.allocBytes);
        this._word = new Int32Array(sharedBuffer, sharedOffset, N.allocWords);
        sharedOffset += N.allocBytes;
    }
    HashSha256.prototype.update = function (data) {
        // data: string
        if ("string" === typeof data) {
            return this._utf8(data);
        }
        // data: undefined
        if (data == null) {
            throw new TypeError("Invalid type: " + typeof data);
        }
        var byteOffset = data.byteOffset;
        var length = data.byteLength;
        var blocks = (length / N.inputBytes) | 0;
        var offset = 0;
        // longer than 1 block
        if (blocks && !(byteOffset & 3) && !(this._size % N.inputBytes)) {
            var block = new Int32Array(data.buffer, byteOffset, blocks * N.inputWords);
            while (blocks--) {
                this._int32(block, offset >> 2);
                offset += N.inputBytes;
            }
            this._size += offset;
        }
        // data: TypedArray | DataView
        var BYTES_PER_ELEMENT = data.BYTES_PER_ELEMENT;
        if (BYTES_PER_ELEMENT !== 1 && data.buffer) {
            var rest = new Uint8Array(data.buffer, byteOffset + offset, length - offset);
            return this._uint8(rest);
        }
        // no more bytes
        if (offset === length)
            return this;
        // data: Uint8Array | Int8Array
        return this._uint8(data, offset);
    };
    HashSha256.prototype._uint8 = function (data, offset) {
        var _a = this, _byte = _a._byte, _word = _a._word;
        var length = data.length;
        offset = offset | 0;
        while (offset < length) {
            var start = this._size % N.inputBytes;
            var index = start;
            while (offset < length && index < N.inputBytes) {
                _byte[index++] = data[offset++];
            }
            if (index >= N.inputBytes) {
                this._int32(_word);
            }
            this._size += index - start;
        }
        return this;
    };
    HashSha256.prototype._utf8 = function (text) {
        var _a = this, _byte = _a._byte, _word = _a._word;
        var length = text.length;
        var surrogate = this._sp;
        for (var offset = 0; offset < length;) {
            var start = this._size % N.inputBytes;
            var index = start;
            while (offset < length && index < N.inputBytes) {
                var code = text.charCodeAt(offset++) | 0;
                if (code < 0x80) {
                    // ASCII characters
                    _byte[index++] = code;
                }
                else if (code < 0x800) {
                    // 2 bytes
                    _byte[index++] = 0xC0 | (code >>> 6);
                    _byte[index++] = 0x80 | (code & 0x3F);
                }
                else if (code < 0xD800 || code > 0xDFFF) {
                    // 3 bytes
                    _byte[index++] = 0xE0 | (code >>> 12);
                    _byte[index++] = 0x80 | ((code >>> 6) & 0x3F);
                    _byte[index++] = 0x80 | (code & 0x3F);
                }
                else if (surrogate) {
                    // 4 bytes - surrogate pair
                    code = ((surrogate & 0x3FF) << 10) + (code & 0x3FF) + 0x10000;
                    _byte[index++] = 0xF0 | (code >>> 18);
                    _byte[index++] = 0x80 | ((code >>> 12) & 0x3F);
                    _byte[index++] = 0x80 | ((code >>> 6) & 0x3F);
                    _byte[index++] = 0x80 | (code & 0x3F);
                    surrogate = 0;
                }
                else {
                    surrogate = code;
                }
            }
            if (index >= N.inputBytes) {
                this._int32(_word);
                _word[0] = _word[N.inputWords];
            }
            this._size += index - start;
        }
        this._sp = surrogate;
        return this;
    };
    HashSha256.prototype._int32 = function (data, offset) {
        var _a = this, A = _a.A, B = _a.B, C = _a.C, D = _a.D, E = _a.E, F = _a.F, G = _a.G, H = _a.H;
        var i = 0;
        offset = offset | 0;
        while (i < N.inputWords) {
            W[i++] = swap32(data[offset++]);
        }
        for (i = N.inputWords; i < N.workWords; i++) {
            W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0;
        }
        for (i = 0; i < N.workWords; i++) {
            var T1 = (H + sigma1(E) + ch(E, F, G) + K[i] + W[i]) | 0;
            var T2 = (sigma0(A) + maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        this.A = (A + this.A) | 0;
        this.B = (B + this.B) | 0;
        this.C = (C + this.C) | 0;
        this.D = (D + this.D) | 0;
        this.E = (E + this.E) | 0;
        this.F = (F + this.F) | 0;
        this.G = (G + this.G) | 0;
        this.H = (H + this.H) | 0;
    };
    HashSha256.prototype.digest = function (encoding) {
        var _a = this, _byte = _a._byte, _word = _a._word;
        var i = (this._size % N.inputBytes) | 0;
        _byte[i++] = 0x80;
        // pad 0 for current word
        while (i & 3) {
            _byte[i++] = 0;
        }
        i >>= 2;
        if (i > N.highIndex) {
            while (i < N.inputWords) {
                _word[i++] = 0;
            }
            i = 0;
            this._int32(_word);
        }
        // pad 0 for rest words
        while (i < N.inputWords) {
            _word[i++] = 0;
        }
        // input size
        var bits64 = this._size * 8;
        var low32 = (bits64 & 0xffffffff) >>> 0;
        var high32 = (bits64 - low32) / 0x100000000;
        if (high32)
            _word[N.highIndex] = swap32(high32);
        if (low32)
            _word[N.lowIndex] = swap32(low32);
        this._int32(_word);
        return (encoding === "hex") ? this._hex() : this._bin();
    };
    HashSha256.prototype._hex = function () {
        var _a = this, A = _a.A, B = _a.B, C = _a.C, D = _a.D, E = _a.E, F = _a.F, G = _a.G, H = _a.H;
        return hex32(A) + hex32(B) + hex32(C) + hex32(D) + hex32(E) + hex32(F) + hex32(G) + hex32(H);
    };
    HashSha256.prototype._bin = function () {
        var _a = this, A = _a.A, B = _a.B, C = _a.C, D = _a.D, E = _a.E, F = _a.F, G = _a.G, H = _a.H, _byte = _a._byte, _word = _a._word;
        _word[0] = swap32(A);
        _word[1] = swap32(B);
        _word[2] = swap32(C);
        _word[3] = swap32(D);
        _word[4] = swap32(E);
        _word[5] = swap32(F);
        _word[6] = swap32(G);
        _word[7] = swap32(H);
        return _byte.slice(0, 32);
    };
    return HashSha256;
}());

var W = new Int32Array(N.workWords);
var sharedBuffer;
var sharedOffset = 0;
var hex32 = function (num) { return (num + 0x100000000).toString(16).substr(-8); };
var swapLE = (function (c) { return (((c << 24) & 0xff000000) | ((c << 8) & 0xff0000) | ((c >> 8) & 0xff00) | ((c >> 24) & 0xff)); });
var swapBE = (function (c) { return c; });
var swap32 = isBE() ? swapBE : swapLE;
var ch = function (x, y, z) { return (z ^ (x & (y ^ z))); };
var maj = function (x, y, z) { return ((x & y) | (z & (x | y))); };
var sigma0 = function (x) { return ((x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)); };
var sigma1 = function (x) { return ((x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)); };
var gamma0 = function (x) { return ((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)); };
var gamma1 = function (x) { return ((x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)); };
function isBE() {
    var buf = new Uint8Array(new Uint16Array([0xFEFF]).buffer); // BOM
    return (buf[0] === 0xFE);
}