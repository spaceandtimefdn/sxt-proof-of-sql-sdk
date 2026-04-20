// wasm/workflow.js
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
var init_size = () => {};
var version = "2.34.0";
function walk(err, fn) {
  if (fn?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== undefined)
    return walk(err.cause, fn);
  return fn ? null : err;
}
var errorConfig;
var BaseError;
var init_base = __esm(() => {
  errorConfig = {
    getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : undefined,
    version: `viem@${version}`
  };
  BaseError = class BaseError2 extends Error {
    constructor(shortMessage, args = {}) {
      const details = (() => {
        if (args.cause instanceof BaseError2)
          return args.cause.details;
        if (args.cause?.message)
          return args.cause.message;
        return args.details;
      })();
      const docsPath = (() => {
        if (args.cause instanceof BaseError2)
          return args.cause.docsPath || args.docsPath;
        return args.docsPath;
      })();
      const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
      const message = [
        shortMessage || "An error occurred.",
        "",
        ...args.metaMessages ? [...args.metaMessages, ""] : [],
        ...docsUrl ? [`Docs: ${docsUrl}`] : [],
        ...details ? [`Details: ${details}`] : [],
        ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
      ].join(`
`);
      super(message, args.cause ? { cause: args.cause } : undefined);
      Object.defineProperty(this, "details", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      Object.defineProperty(this, "docsPath", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      Object.defineProperty(this, "metaMessages", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      Object.defineProperty(this, "shortMessage", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      Object.defineProperty(this, "version", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      Object.defineProperty(this, "name", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: "BaseError"
      });
      this.details = details;
      this.docsPath = docsPath;
      this.metaMessages = args.metaMessages;
      this.name = args.name ?? this.name;
      this.shortMessage = shortMessage;
      this.version = version;
    }
    walk(fn) {
      return walk(this, fn);
    }
  };
});
var SizeExceedsPaddingSizeError;
var init_data = __esm(() => {
  init_base();
  SizeExceedsPaddingSizeError = class SizeExceedsPaddingSizeError2 extends BaseError {
    constructor({ size: size2, targetSize, type }) {
      super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
    }
  };
});
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i = 0;i < size2; i++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i : size2 - i - 1] = bytes[padEnd ? i : bytes.length - i - 1];
  }
  return paddedBytes;
}
var init_pad = __esm(() => {
  init_data();
});
var IntegerOutOfRangeError;
var SizeOverflowError;
var init_encoding = __esm(() => {
  init_base();
  IntegerOutOfRangeError = class IntegerOutOfRangeError2 extends BaseError {
    constructor({ max, min, signed, size: size2, value }) {
      super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
    }
  };
  SizeOverflowError = class SizeOverflowError2 extends BaseError {
    constructor({ givenSize, maxSize }) {
      super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
    }
  };
});
function assertSize(hexOrBytes, { size: size2 }) {
  if (size(hexOrBytes) > size2)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size2
    });
}
function hexToBigInt(hex, opts = {}) {
  const { signed } = opts;
  if (opts.size)
    assertSize(hex, { size: opts.size });
  const value = BigInt(hex);
  if (!signed)
    return value;
  const size2 = (hex.length - 2) / 2;
  const max = (1n << BigInt(size2) * 8n - 1n) - 1n;
  if (value <= max)
    return value;
  return value - BigInt(`0x${"f".padStart(size2 * 2, "f")}`) - 1n;
}
function hexToNumber(hex, opts = {}) {
  return Number(hexToBigInt(hex, opts));
}
var init_fromHex = __esm(() => {
  init_encoding();
  init_size();
});
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string = "";
  for (let i = 0;i < value.length; i++) {
    string += hexes[value[i]];
  }
  const hex = `0x${string}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : undefined,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
function stringToHex(value_, opts = {}) {
  const value = encoder.encode(value_);
  return bytesToHex(value, opts);
}
var hexes;
var encoder;
var init_toHex = __esm(() => {
  init_encoding();
  init_pad();
  init_fromHex();
  hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, "0"));
  encoder = /* @__PURE__ */ new TextEncoder;
});
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j = 0;index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j++));
    if (nibbleLeft === undefined || nibbleRight === undefined) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j - 2]}${hexString[j - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder2.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
var encoder2;
var charCodeMap;
var init_toBytes = __esm(() => {
  init_base();
  init_pad();
  init_fromHex();
  init_toHex();
  encoder2 = /* @__PURE__ */ new TextEncoder;
  charCodeMap = {
    zero: 48,
    nine: 57,
    A: 65,
    F: 70,
    a: 97,
    f: 102
  };
});
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0;i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var U32_MASK64;
var _32n;
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
var init__u64 = __esm(() => {
  U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
  _32n = /* @__PURE__ */ BigInt(32);
});
var crypto;
var init_crypto = __esm(() => {
  crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : undefined;
});
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0;i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0;i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
function bytesToHex2(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0;i < bytes.length; i++) {
    hex += hexes2[bytes[i]];
  }
  return hex;
}
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes2(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin)
    return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0;ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0;i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad2 = 0;i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
}

class Hash {
}
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes2(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto && typeof crypto.randomBytes === "function") {
    return Uint8Array.from(crypto.randomBytes(bytesLength));
  }
  throw new Error("crypto.getRandomValues must be defined");
}
var isLE;
var swap32IfBE;
var hasHexBuiltin;
var hexes2;
var asciis;
var init_utils = __esm(() => {
  init_crypto();
  /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  swap32IfBE = isLE ? (u) => u : byteSwap32;
  hasHexBuiltin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
  hexes2 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
});
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds;round < 24; round++) {
    for (let x = 0;x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0;x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0;y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0;t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0;y < 50; y += 10) {
      for (let x = 0;x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0;x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var _0n;
var _1n;
var _2n;
var _7n;
var _256n;
var _0x71n;
var SHA3_PI;
var SHA3_ROTL;
var _SHA3_IOTA;
var IOTAS;
var SHA3_IOTA_H;
var SHA3_IOTA_L;
var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
var Keccak;
var gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
var keccak_256;
var init_sha3 = __esm(() => {
  init__u64();
  init_utils();
  _0n = BigInt(0);
  _1n = BigInt(1);
  _2n = BigInt(2);
  _7n = BigInt(7);
  _256n = BigInt(256);
  _0x71n = BigInt(113);
  SHA3_PI = [];
  SHA3_ROTL = [];
  _SHA3_IOTA = [];
  for (let round = 0, R = _1n, x = 1, y = 0;round < 24; round++) {
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
    let t = _0n;
    for (let j = 0;j < 7; j++) {
      R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
      if (R & _2n)
        t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
    }
    _SHA3_IOTA.push(t);
  }
  IOTAS = split(_SHA3_IOTA, true);
  SHA3_IOTA_H = IOTAS[0];
  SHA3_IOTA_L = IOTAS[1];
  Keccak = class Keccak2 extends Hash {
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
      super();
      this.pos = 0;
      this.posOut = 0;
      this.finished = false;
      this.destroyed = false;
      this.enableXOF = false;
      this.blockLen = blockLen;
      this.suffix = suffix;
      this.outputLen = outputLen;
      this.enableXOF = enableXOF;
      this.rounds = rounds;
      anumber(outputLen);
      if (!(0 < blockLen && blockLen < 200))
        throw new Error("only keccak-f1600 function is supported");
      this.state = new Uint8Array(200);
      this.state32 = u32(this.state);
    }
    clone() {
      return this._cloneInto();
    }
    keccak() {
      swap32IfBE(this.state32);
      keccakP(this.state32, this.rounds);
      swap32IfBE(this.state32);
      this.posOut = 0;
      this.pos = 0;
    }
    update(data) {
      aexists(this);
      data = toBytes2(data);
      abytes(data);
      const { blockLen, state } = this;
      const len = data.length;
      for (let pos = 0;pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        for (let i = 0;i < take; i++)
          state[this.pos++] ^= data[pos++];
        if (this.pos === blockLen)
          this.keccak();
      }
      return this;
    }
    finish() {
      if (this.finished)
        return;
      this.finished = true;
      const { state, suffix, pos, blockLen } = this;
      state[pos] ^= suffix;
      if ((suffix & 128) !== 0 && pos === blockLen - 1)
        this.keccak();
      state[blockLen - 1] ^= 128;
      this.keccak();
    }
    writeInto(out) {
      aexists(this, false);
      abytes(out);
      this.finish();
      const bufferOut = this.state;
      const { blockLen } = this;
      for (let pos = 0, len = out.length;pos < len; ) {
        if (this.posOut >= blockLen)
          this.keccak();
        const take = Math.min(blockLen - this.posOut, len - pos);
        out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
        this.posOut += take;
        pos += take;
      }
      return out;
    }
    xofInto(out) {
      if (!this.enableXOF)
        throw new Error("XOF is not possible for this instance");
      return this.writeInto(out);
    }
    xof(bytes) {
      anumber(bytes);
      return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
      aoutput(out, this);
      if (this.finished)
        throw new Error("digest() was already called");
      this.writeInto(out);
      this.destroy();
      return out;
    }
    digest() {
      return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
      this.destroyed = true;
      clean(this.state);
    }
    _cloneInto(to) {
      const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
      to || (to = new Keccak2(blockLen, suffix, outputLen, enableXOF, rounds));
      to.state32.set(this.state32);
      to.pos = this.pos;
      to.posOut = this.posOut;
      to.finished = this.finished;
      to.rounds = rounds;
      to.suffix = suffix;
      to.outputLen = outputLen;
      to.enableXOF = enableXOF;
      to.destroyed = this.destroyed;
      return to;
    }
  };
  keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();
});
function keccak256(value, to_) {
  const to = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to === "bytes")
    return bytes;
  return toHex(bytes);
}
var init_keccak256 = __esm(() => {
  init_sha3();
  init_toBytes();
  init_toHex();
});
var InvalidAddressError;
var init_address = __esm(() => {
  init_base();
  InvalidAddressError = class InvalidAddressError2 extends BaseError {
    constructor({ address }) {
      super(`Address "${address}" is invalid.`, {
        metaMessages: [
          "- Address must be a hex value of 20 bytes (40 hex characters).",
          "- Address must match its checksum counterpart."
        ],
        name: "InvalidAddressError"
      });
    }
  };
});
var LruMap;
var init_lru = __esm(() => {
  LruMap = class LruMap2 extends Map {
    constructor(size2) {
      super();
      Object.defineProperty(this, "maxSize", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: undefined
      });
      this.maxSize = size2;
    }
    get(key) {
      const value = super.get(key);
      if (super.has(key) && value !== undefined) {
        this.delete(key);
        super.set(key, value);
      }
      return value;
    }
    set(key, value) {
      super.set(key, value);
      if (this.maxSize && this.size > this.maxSize) {
        const firstKey = this.keys().next().value;
        if (firstKey)
          this.delete(firstKey);
      }
      return this;
    }
  };
});
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = chainId ? `${chainId}${address_.toLowerCase()}` : address_.substring(2).toLowerCase();
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = (chainId ? hexAddress.substring(`${chainId}0x`.length) : hexAddress).split("");
  for (let i = 0;i < 40; i += 2) {
    if (hash[i >> 1] >> 4 >= 8 && address[i]) {
      address[i] = address[i].toUpperCase();
    }
    if ((hash[i >> 1] & 15) >= 8 && address[i + 1]) {
      address[i + 1] = address[i + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
function getAddress(address, chainId) {
  if (!isAddress(address, { strict: false }))
    throw new InvalidAddressError({ address });
  return checksumAddress(address, chainId);
}
var checksumAddressCache;
var init_getAddress = __esm(() => {
  init_address();
  init_toBytes();
  init_keccak256();
  init_lru();
  init_isAddress();
  checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
});
function isAddress(address, options) {
  const { strict = true } = options ?? {};
  const cacheKey = `${address}.${strict}`;
  if (isAddressCache.has(cacheKey))
    return isAddressCache.get(cacheKey);
  const result = (() => {
    if (!addressRegex.test(address))
      return false;
    if (address.toLowerCase() === address)
      return true;
    if (strict)
      return checksumAddress(address) === address;
    return true;
  })();
  isAddressCache.set(cacheKey, result);
  return result;
}
var addressRegex;
var isAddressCache;
var init_isAddress = __esm(() => {
  init_lru();
  init_getAddress();
  addressRegex = /^0x[a-fA-F0-9]{40}$/;
  isAddressCache = /* @__PURE__ */ new LruMap(8192);
});
function concatHex(values) {
  return `0x${values.reduce((acc, x) => acc + x.replace("0x", ""), "")}`;
}
function setBigUint64(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD;
var SHA256_IV;
var init__md = __esm(() => {
  init_utils();
  HashMD = class HashMD2 extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE2) {
      super();
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE2;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes2(data);
      abytes(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0;pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (;blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE2 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos;i < blockLen; i++)
        buffer[i] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0;i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE2);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor);
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);
});
var SHA256_K;
var SHA256_W;
var SHA256;
var sha256;
var init_sha2 = __esm(() => {
  init__md();
  init_utils();
  SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  SHA256 = class SHA2562 extends HashMD {
    constructor(outputLen = 32) {
      super(64, outputLen, 8, false);
      this.A = SHA256_IV[0] | 0;
      this.B = SHA256_IV[1] | 0;
      this.C = SHA256_IV[2] | 0;
      this.D = SHA256_IV[3] | 0;
      this.E = SHA256_IV[4] | 0;
      this.F = SHA256_IV[5] | 0;
      this.G = SHA256_IV[6] | 0;
      this.H = SHA256_IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i = 0;i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16;i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0;i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  };
  sha256 = /* @__PURE__ */ createHasher(() => new SHA256);
});
var HMAC;
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
var init_hmac = __esm(() => {
  init_utils();
  HMAC = class HMAC2 extends Hash {
    constructor(hash, _key) {
      super();
      this.finished = false;
      this.destroyed = false;
      ahash(hash);
      const key = toBytes2(_key);
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("Expected instance of class which extends utils.Hash");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad2 = new Uint8Array(blockLen);
      pad2.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0;i < pad2.length; i++)
        pad2[i] ^= 54;
      this.iHash.update(pad2);
      this.oHash = hash.create();
      for (let i = 0;i < pad2.length; i++)
        pad2[i] ^= 54 ^ 92;
      this.oHash.update(pad2);
      clean(pad2);
    }
    update(buf) {
      aexists(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      aexists(this);
      abytes(out, this.outputLen);
      this.finished = true;
      this.iHash.digestInto(out);
      this.oHash.update(out);
      this.oHash.digestInto(out);
      this.destroy();
    }
    digest() {
      const out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
    _cloneInto(to) {
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
      const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
    destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  };
  hmac.create = (hash, key) => new HMAC(hash, key);
});
function _abool2(value, title = "") {
  if (typeof value !== "boolean") {
    const prefix = title && `"${title}"`;
    throw new Error(prefix + "expected boolean, got type=" + typeof value);
  }
  return value;
}
function _abytes2(value, length, title = "") {
  const bytes = isBytes(value);
  const len = value?.length;
  const needsLen = length !== undefined;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function numberToHexUnpadded(num) {
  const hex = num.toString(16);
  return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber2(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n2 : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber2(bytesToHex2(bytes));
}
function bytesToNumberLE(bytes) {
  abytes(bytes);
  return hexToNumber2(bytesToHex2(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
  return hexToBytes2(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function ensureBytes(title, hex, expectedLength) {
  let res;
  if (typeof hex === "string") {
    try {
      res = hexToBytes2(hex);
    } catch (e) {
      throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
    }
  } else if (isBytes(hex)) {
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + " must be hex string or Uint8Array");
  }
  const len = res.length;
  if (typeof expectedLength === "number" && len !== expectedLength)
    throw new Error(title + " of length " + expectedLength + " expected, got " + len);
  return res;
}
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  let len;
  for (len = 0;n > _0n2; n >>= _1n2, len += 1)
    ;
  return len;
}
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
  if (typeof hashLen !== "number" || hashLen < 2)
    throw new Error("hashLen must be a number");
  if (typeof qByteLen !== "number" || qByteLen < 2)
    throw new Error("qByteLen must be a number");
  if (typeof hmacFn !== "function")
    throw new Error("hmacFn must be a function");
  const u8n = (len) => new Uint8Array(len);
  const u8of = (byte) => Uint8Array.of(byte);
  let v = u8n(hashLen);
  let k = u8n(hashLen);
  let i = 0;
  const reset = () => {
    v.fill(1);
    k.fill(0);
    i = 0;
  };
  const h = (...b) => hmacFn(k, v, ...b);
  const reseed = (seed = u8n(0)) => {
    k = h(u8of(0), seed);
    v = h();
    if (seed.length === 0)
      return;
    k = h(u8of(1), seed);
    v = h();
  };
  const gen2 = () => {
    if (i++ >= 1000)
      throw new Error("drbg: tried 1000 values");
    let len = 0;
    const out = [];
    while (len < qByteLen) {
      v = h();
      const sl = v.slice();
      out.push(sl);
      len += v.length;
    }
    return concatBytes(...out);
  };
  const genUntil = (seed, pred) => {
    reset();
    reseed(seed);
    let res = undefined;
    while (!(res = pred(gen2())))
      reseed();
    reset();
    return res;
  };
  return genUntil;
}
function isHash(val) {
  return typeof val === "function" && Number.isSafeInteger(val.outputLen);
}
function _validateObject(object, fields2, optFields = {}) {
  if (!object || typeof object !== "object")
    throw new Error("expected valid options object");
  function checkField2(fieldName, expectedType, isOpt) {
    const val = object[fieldName];
    if (isOpt && val === undefined)
      return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new Error(`param "${fieldName}" is invalid: expected ${expectedType}, got ${current}`);
  }
  Object.entries(fields2).forEach(([k, v]) => checkField2(k, v, false));
  Object.entries(optFields).forEach(([k, v]) => checkField2(k, v, true));
}
function memoized(fn) {
  const map = new WeakMap;
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== undefined)
      return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}
var _0n2;
var _1n2;
var isPosBig = (n) => typeof n === "bigint" && _0n2 <= n;
var bitMask = (n) => (_1n2 << BigInt(n)) - _1n2;
var init_utils2 = __esm(() => {
  init_utils();
  init_utils();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  _0n2 = /* @__PURE__ */ BigInt(0);
  _1n2 = /* @__PURE__ */ BigInt(1);
});
function mod(a, b) {
  const result = a % b;
  return result >= _0n3 ? result : b + result;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n3) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n3)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _0n3)
    throw new Error("invert: expected positive modulus, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n3, y = _1n3, u = _1n3, v = _0n3;
  while (a !== _0n3) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  const gcd = b;
  if (gcd !== _1n3)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function assertIsSquare(Fp, root, n) {
  if (!Fp.eql(Fp.sqr(root), n))
    throw new Error("Cannot find square root");
}
function sqrt3mod4(Fp, n) {
  const p1div4 = (Fp.ORDER + _1n3) / _4n;
  const root = Fp.pow(n, p1div4);
  assertIsSquare(Fp, root, n);
  return root;
}
function sqrt5mod8(Fp, n) {
  const p5div8 = (Fp.ORDER - _5n) / _8n;
  const n2 = Fp.mul(n, _2n2);
  const v = Fp.pow(n2, p5div8);
  const nv = Fp.mul(n, v);
  const i = Fp.mul(Fp.mul(nv, _2n2), v);
  const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
  assertIsSquare(Fp, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n2) / _16n;
  return (Fp, n) => {
    let tv1 = Fp.pow(n, c4);
    let tv2 = Fp.mul(tv1, c1);
    const tv3 = Fp.mul(tv1, c2);
    const tv4 = Fp.mul(tv1, c3);
    const e1 = Fp.eql(Fp.sqr(tv2), n);
    const e2 = Fp.eql(Fp.sqr(tv3), n);
    tv1 = Fp.cmov(tv1, tv2, e1);
    tv2 = Fp.cmov(tv4, tv3, e2);
    const e3 = Fp.eql(Fp.sqr(tv2), n);
    const root = Fp.cmov(tv1, tv2, e3);
    assertIsSquare(Fp, root, n);
    return root;
  };
}
function tonelliShanks(P) {
  if (P < _3n)
    throw new Error("sqrt is not defined for small field");
  let Q = P - _1n3;
  let S = 0;
  while (Q % _2n2 === _0n3) {
    Q /= _2n2;
    S++;
  }
  let Z = _2n2;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z) === 1) {
    if (Z++ > 1000)
      throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S === 1)
    return sqrt3mod4;
  let cc = _Fp.pow(Z, Q);
  const Q1div2 = (Q + _1n3) / _2n2;
  return function tonelliSlow(Fp, n) {
    if (Fp.is0(n))
      return n;
    if (FpLegendre(Fp, n) !== 1)
      throw new Error("Cannot find square root");
    let M = S;
    let c = Fp.mul(Fp.ONE, cc);
    let t = Fp.pow(n, Q);
    let R = Fp.pow(n, Q1div2);
    while (!Fp.eql(t, Fp.ONE)) {
      if (Fp.is0(t))
        return Fp.ZERO;
      let i = 1;
      let t_tmp = Fp.sqr(t);
      while (!Fp.eql(t_tmp, Fp.ONE)) {
        i++;
        t_tmp = Fp.sqr(t_tmp);
        if (i === M)
          throw new Error("Cannot find square root");
      }
      const exponent = _1n3 << BigInt(M - i - 1);
      const b = Fp.pow(c, exponent);
      M = i;
      c = Fp.sqr(b);
      t = Fp.mul(t, c);
      R = Fp.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n)
    return sqrt3mod4;
  if (P % _8n === _5n)
    return sqrt5mod8;
  if (P % _16n === _9n)
    return sqrt9mod16(P);
  return tonelliShanks(P);
}
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  _validateObject(field, opts);
  return field;
}
function FpPow(Fp, num, power) {
  if (power < _0n3)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n3)
    return Fp.ONE;
  if (power === _1n3)
    return num;
  let p = Fp.ONE;
  let d = num;
  while (power > _0n3) {
    if (power & _1n3)
      p = Fp.mul(p, d);
    d = Fp.sqr(d);
    power >>= _1n3;
  }
  return p;
}
function FpInvertBatch(Fp, nums, passZero = false) {
  const inverted = new Array(nums.length).fill(passZero ? Fp.ZERO : undefined);
  const multipliedAcc = nums.reduce((acc, num, i) => {
    if (Fp.is0(num))
      return acc;
    inverted[i] = acc;
    return Fp.mul(acc, num);
  }, Fp.ONE);
  const invertedAcc = Fp.inv(multipliedAcc);
  nums.reduceRight((acc, num, i) => {
    if (Fp.is0(num))
      return acc;
    inverted[i] = Fp.mul(acc, inverted[i]);
    return Fp.mul(acc, num);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp, n) {
  const p1mod2 = (Fp.ORDER - _1n3) / _2n2;
  const powered = Fp.pow(n, p1mod2);
  const yes = Fp.eql(powered, Fp.ONE);
  const zero = Fp.eql(powered, Fp.ZERO);
  const no = Fp.eql(powered, Fp.neg(Fp.ONE));
  if (!yes && !zero && !no)
    throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== undefined)
    anumber(nBitLength);
  const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, bitLenOrOpts, isLE2 = false, opts = {}) {
  if (ORDER <= _0n3)
    throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
  let _nbitLength = undefined;
  let _sqrt = undefined;
  let modFromBytes = false;
  let allowedLengths = undefined;
  if (typeof bitLenOrOpts === "object" && bitLenOrOpts != null) {
    if (opts.sqrt || isLE2)
      throw new Error("cannot specify opts in two arguments");
    const _opts = bitLenOrOpts;
    if (_opts.BITS)
      _nbitLength = _opts.BITS;
    if (_opts.sqrt)
      _sqrt = _opts.sqrt;
    if (typeof _opts.isLE === "boolean")
      isLE2 = _opts.isLE;
    if (typeof _opts.modFromBytes === "boolean")
      modFromBytes = _opts.modFromBytes;
    allowedLengths = _opts.allowedLengths;
  } else {
    if (typeof bitLenOrOpts === "number")
      _nbitLength = bitLenOrOpts;
    if (opts.sqrt)
      _sqrt = opts.sqrt;
  }
  const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, _nbitLength);
  if (BYTES > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let sqrtP;
  const f = Object.freeze({
    ORDER,
    isLE: isLE2,
    BITS,
    BYTES,
    MASK: bitMask(BITS),
    ZERO: _0n3,
    ONE: _1n3,
    allowedLengths,
    create: (num) => mod(num, ORDER),
    isValid: (num) => {
      if (typeof num !== "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof num);
      return _0n3 <= num && num < ORDER;
    },
    is0: (num) => num === _0n3,
    isValidNot0: (num) => !f.is0(num) && f.isValid(num),
    isOdd: (num) => (num & _1n3) === _1n3,
    neg: (num) => mod(-num, ORDER),
    eql: (lhs, rhs) => lhs === rhs,
    sqr: (num) => mod(num * num, ORDER),
    add: (lhs, rhs) => mod(lhs + rhs, ORDER),
    sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
    mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
    pow: (num, power) => FpPow(f, num, power),
    div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
    sqrN: (num) => num * num,
    addN: (lhs, rhs) => lhs + rhs,
    subN: (lhs, rhs) => lhs - rhs,
    mulN: (lhs, rhs) => lhs * rhs,
    inv: (num) => invert(num, ORDER),
    sqrt: _sqrt || ((n) => {
      if (!sqrtP)
        sqrtP = FpSqrt(ORDER);
      return sqrtP(f, n);
    }),
    toBytes: (num) => isLE2 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
    fromBytes: (bytes, skipValidation = true) => {
      if (allowedLengths) {
        if (!allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
          throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
        }
        const padded = new Uint8Array(BYTES);
        padded.set(bytes, isLE2 ? 0 : padded.length - bytes.length);
        bytes = padded;
      }
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      let scalar = isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
      if (modFromBytes)
        scalar = mod(scalar, ORDER);
      if (!skipValidation) {
        if (!f.isValid(scalar))
          throw new Error("invalid field element: outside of range 0..ORDER");
      }
      return scalar;
    },
    invertBatch: (lst) => FpInvertBatch(f, lst),
    cmov: (a, b, c) => c ? b : a
  });
  return Object.freeze(f);
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint")
    throw new Error("field order must be bigint");
  const bitLength = fieldOrder.toString(2).length;
  return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE2 = false) {
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = getMinHashLength(fieldOrder);
  if (len < 16 || len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num = isLE2 ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num, fieldOrder - _1n3) + _1n3;
  return isLE2 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
var _0n3;
var _1n3;
var _2n2;
var _3n;
var _4n;
var _5n;
var _7n2;
var _8n;
var _9n;
var _16n;
var FIELD_FIELDS;
var init_modular = __esm(() => {
  init_utils2();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  _0n3 = BigInt(0);
  _1n3 = BigInt(1);
  _2n2 = /* @__PURE__ */ BigInt(2);
  _3n = /* @__PURE__ */ BigInt(3);
  _4n = /* @__PURE__ */ BigInt(4);
  _5n = /* @__PURE__ */ BigInt(5);
  _7n2 = /* @__PURE__ */ BigInt(7);
  _8n = /* @__PURE__ */ BigInt(8);
  _9n = /* @__PURE__ */ BigInt(9);
  _16n = /* @__PURE__ */ BigInt(16);
  FIELD_FIELDS = [
    "create",
    "isValid",
    "is0",
    "neg",
    "inv",
    "sqrt",
    "sqr",
    "eql",
    "add",
    "sub",
    "mul",
    "pow",
    "div",
    "addN",
    "subN",
    "mulN",
    "sqrN"
  ];
});
function negateCt(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function normalizeZ(c, points) {
  const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, scalarBits) {
  validateW(W, scalarBits);
  const windows = Math.ceil(scalarBits / W) + 1;
  const windowSize = 2 ** (W - 1);
  const maxNumber = 2 ** W;
  const mask = bitMask(W);
  const shiftBy = BigInt(W);
  return { windows, windowSize, mask, maxNumber, shiftBy };
}
function calcOffsets(n, window, wOpts) {
  const { windowSize, mask, maxNumber, shiftBy } = wOpts;
  let wbits = Number(n & mask);
  let nextN = n >> shiftBy;
  if (wbits > windowSize) {
    wbits -= maxNumber;
    nextN += _1n4;
  }
  const offsetStart = window * windowSize;
  const offset = offsetStart + Math.abs(wbits) - 1;
  const isZero = wbits === 0;
  const isNeg = wbits < 0;
  const isNegF = window % 2 !== 0;
  const offsetF = offsetStart;
  return { nextN, offset, isZero, isNeg, isNegF, offsetF };
}
function validateMSMPoints(points, c) {
  if (!Array.isArray(points))
    throw new Error("array expected");
  points.forEach((p, i) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    if (!field.isValid(s))
      throw new Error("invalid scalar at index " + i);
  });
}
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function assert0(n) {
  if (n !== _0n4)
    throw new Error("invalid wNAF");
}

class wNAF {
  constructor(Point, bits) {
    this.BASE = Point.BASE;
    this.ZERO = Point.ZERO;
    this.Fn = Point.Fn;
    this.bits = bits;
  }
  _unsafeLadder(elm, n, p = this.ZERO) {
    let d = elm;
    while (n > _0n4) {
      if (n & _1n4)
        p = p.add(d);
      d = d.double();
      n >>= _1n4;
    }
    return p;
  }
  precomputeWindow(point, W) {
    const { windows, windowSize } = calcWOpts(W, this.bits);
    const points = [];
    let p = point;
    let base = p;
    for (let window = 0;window < windows; window++) {
      base = p;
      points.push(base);
      for (let i = 1;i < windowSize; i++) {
        base = base.add(p);
        points.push(base);
      }
      p = base.double();
    }
    return points;
  }
  wNAF(W, precomputes, n) {
    if (!this.Fn.isValid(n))
      throw new Error("invalid scalar");
    let p = this.ZERO;
    let f = this.BASE;
    const wo = calcWOpts(W, this.bits);
    for (let window = 0;window < wo.windows; window++) {
      const { nextN, offset, isZero, isNeg, isNegF, offsetF } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        f = f.add(negateCt(isNegF, precomputes[offsetF]));
      } else {
        p = p.add(negateCt(isNeg, precomputes[offset]));
      }
    }
    assert0(n);
    return { p, f };
  }
  wNAFUnsafe(W, precomputes, n, acc = this.ZERO) {
    const wo = calcWOpts(W, this.bits);
    for (let window = 0;window < wo.windows; window++) {
      if (n === _0n4)
        break;
      const { nextN, offset, isZero, isNeg } = calcOffsets(n, window, wo);
      n = nextN;
      if (isZero) {
        continue;
      } else {
        const item = precomputes[offset];
        acc = acc.add(isNeg ? item.negate() : item);
      }
    }
    assert0(n);
    return acc;
  }
  getPrecomputes(W, point, transform) {
    let comp = pointPrecomputes.get(point);
    if (!comp) {
      comp = this.precomputeWindow(point, W);
      if (W !== 1) {
        if (typeof transform === "function")
          comp = transform(comp);
        pointPrecomputes.set(point, comp);
      }
    }
    return comp;
  }
  cached(point, scalar, transform) {
    const W = getW(point);
    return this.wNAF(W, this.getPrecomputes(W, point, transform), scalar);
  }
  unsafe(point, scalar, transform, prev) {
    const W = getW(point);
    if (W === 1)
      return this._unsafeLadder(point, scalar, prev);
    return this.wNAFUnsafe(W, this.getPrecomputes(W, point, transform), scalar, prev);
  }
  createCache(P, W) {
    validateW(W, this.bits);
    pointWindowSizes.set(P, W);
    pointPrecomputes.delete(P);
  }
  hasCache(elm) {
    return getW(elm) !== 1;
  }
}
function mulEndoUnsafe(Point, point, k1, k2) {
  let acc = point;
  let p1 = Point.ZERO;
  let p2 = Point.ZERO;
  while (k1 > _0n4 || k2 > _0n4) {
    if (k1 & _1n4)
      p1 = p1.add(acc);
    if (k2 & _1n4)
      p2 = p2.add(acc);
    acc = acc.double();
    k1 >>= _1n4;
    k2 >>= _1n4;
  }
  return { p1, p2 };
}
function pippenger(c, fieldN, points, scalars) {
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  const plength = points.length;
  const slength = scalars.length;
  if (plength !== slength)
    throw new Error("arrays of points and scalars must have equal length");
  const zero = c.ZERO;
  const wbits = bitLen(BigInt(plength));
  let windowSize = 1;
  if (wbits > 12)
    windowSize = wbits - 3;
  else if (wbits > 4)
    windowSize = wbits - 2;
  else if (wbits > 0)
    windowSize = 2;
  const MASK = bitMask(windowSize);
  const buckets = new Array(Number(MASK) + 1).fill(zero);
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero;
  for (let i = lastBits;i >= 0; i -= windowSize) {
    buckets.fill(zero);
    for (let j = 0;j < slength; j++) {
      const scalar = scalars[j];
      const wbits2 = Number(scalar >> BigInt(i) & MASK);
      buckets[wbits2] = buckets[wbits2].add(points[j]);
    }
    let resI = zero;
    for (let j = buckets.length - 1, sumI = zero;j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i !== 0)
      for (let j = 0;j < windowSize; j++)
        sum = sum.double();
  }
  return sum;
}
function createField(order, field, isLE2) {
  if (field) {
    if (field.ORDER !== order)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE: isLE2 });
  }
}
function _createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (FpFnLE === undefined)
    FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object")
    throw new Error(`expected valid ${type} CURVE object`);
  for (const p of ["p", "n", "h"]) {
    const val = CURVE[p];
    if (!(typeof val === "bigint" && val > _0n4))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp, Fn };
}
var _0n4;
var _1n4;
var pointPrecomputes;
var pointWindowSizes;
var init_curve = __esm(() => {
  init_utils2();
  init_modular();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  _0n4 = BigInt(0);
  _1n4 = BigInt(1);
  pointPrecomputes = new WeakMap;
  pointWindowSizes = new WeakMap;
});
function _splitEndoScalar(k, basis, n) {
  const [[a1, b1], [a2, b2]] = basis;
  const c1 = divNearest(b2 * k, n);
  const c2 = divNearest(-b1 * k, n);
  let k1 = k - c1 * a1 - c2 * a2;
  let k2 = -c1 * b1 - c2 * b2;
  const k1neg = k1 < _0n5;
  const k2neg = k2 < _0n5;
  if (k1neg)
    k1 = -k1;
  if (k2neg)
    k2 = -k2;
  const MAX_NUM = bitMask(Math.ceil(bitLen(n) / 2)) + _1n5;
  if (k1 < _0n5 || k1 >= MAX_NUM || k2 < _0n5 || k2 >= MAX_NUM) {
    throw new Error("splitScalar (endomorphism): failed, k=" + k);
  }
  return { k1neg, k1, k2neg, k2 };
}
function validateSigFormat(format) {
  if (!["compact", "recovered", "der"].includes(format))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return format;
}
function validateSigOpts(opts, def) {
  const optsn = {};
  for (let optName of Object.keys(def)) {
    optsn[optName] = opts[optName] === undefined ? def[optName] : opts[optName];
  }
  _abool2(optsn.lowS, "lowS");
  _abool2(optsn.prehash, "prehash");
  if (optsn.format !== undefined)
    validateSigFormat(optsn.format);
  return optsn;
}
function _normFnElement(Fn, key) {
  const { BYTES: expected } = Fn;
  let num;
  if (typeof key === "bigint") {
    num = key;
  } else {
    let bytes = ensureBytes("private key", key);
    try {
      num = Fn.fromBytes(bytes);
    } catch (error) {
      throw new Error(`invalid private key: expected ui8a of size ${expected}, got ${typeof key}`);
    }
  }
  if (!Fn.isValidNot0(num))
    throw new Error("invalid private key: out of range [1..N-1]");
  return num;
}
function weierstrassN(params, extraOpts = {}) {
  const validated = _createCurveFields("weierstrass", params, extraOpts);
  const { Fp, Fn } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor, n: CURVE_ORDER } = CURVE;
  _validateObject(extraOpts, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    wrapPrivateKey: "boolean"
  });
  const { endo } = extraOpts;
  if (endo) {
    if (!Fp.is0(CURVE.a) || typeof endo.beta !== "bigint" || !Array.isArray(endo.basises)) {
      throw new Error('invalid endo: expected "beta": bigint and "basises": array');
    }
  }
  const lengths = getWLengths(Fp, Fn);
  function assertCompressionIsSupported() {
    if (!Fp.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function pointToBytes(_c, point, isCompressed) {
    const { x, y } = point.toAffine();
    const bx = Fp.toBytes(x);
    _abool2(isCompressed, "isCompressed");
    if (isCompressed) {
      assertCompressionIsSupported();
      const hasEvenY = !Fp.isOdd(y);
      return concatBytes(pprefix(hasEvenY), bx);
    } else {
      return concatBytes(Uint8Array.of(4), bx, Fp.toBytes(y));
    }
  }
  function pointFromBytes(bytes) {
    _abytes2(bytes, undefined, "Point");
    const { publicKey: comp, publicKeyUncompressed: uncomp } = lengths;
    const length = bytes.length;
    const head = bytes[0];
    const tail = bytes.subarray(1);
    if (length === comp && (head === 2 || head === 3)) {
      const x = Fp.fromBytes(tail);
      if (!Fp.isValid(x))
        throw new Error("bad point: is not on curve, wrong x");
      const y2 = weierstrassEquation(x);
      let y;
      try {
        y = Fp.sqrt(y2);
      } catch (sqrtError) {
        const err = sqrtError instanceof Error ? ": " + sqrtError.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + err);
      }
      assertCompressionIsSupported();
      const isYOdd = Fp.isOdd(y);
      const isHeadOdd = (head & 1) === 1;
      if (isHeadOdd !== isYOdd)
        y = Fp.neg(y);
      return { x, y };
    } else if (length === uncomp && head === 4) {
      const L = Fp.BYTES;
      const x = Fp.fromBytes(tail.subarray(0, L));
      const y = Fp.fromBytes(tail.subarray(L, L * 2));
      if (!isValidXY(x, y))
        throw new Error("bad point: is not on curve");
      return { x, y };
    } else {
      throw new Error(`bad point: got length ${length}, expected compressed=${comp} or uncompressed=${uncomp}`);
    }
  }
  const encodePoint = extraOpts.toBytes || pointToBytes;
  const decodePoint = extraOpts.fromBytes || pointFromBytes;
  function weierstrassEquation(x) {
    const x2 = Fp.sqr(x);
    const x3 = Fp.mul(x2, x);
    return Fp.add(Fp.add(x3, Fp.mul(x, CURVE.a)), CURVE.b);
  }
  function isValidXY(x, y) {
    const left = Fp.sqr(y);
    const right = weierstrassEquation(x);
    return Fp.eql(left, right);
  }
  if (!isValidXY(CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  const _4a3 = Fp.mul(Fp.pow(CURVE.a, _3n2), _4n2);
  const _27b2 = Fp.mul(Fp.sqr(CURVE.b), BigInt(27));
  if (Fp.is0(Fp.add(_4a3, _27b2)))
    throw new Error("bad curve params: a or b");
  function acoord(title, n, banZero = false) {
    if (!Fp.isValid(n) || banZero && Fp.is0(n))
      throw new Error(`bad point coordinate ${title}`);
    return n;
  }
  function aprjpoint(other) {
    if (!(other instanceof Point))
      throw new Error("ProjectivePoint expected");
  }
  function splitEndoScalarN(k) {
    if (!endo || !endo.basises)
      throw new Error("no endo");
    return _splitEndoScalar(k, endo.basises, Fn.ORDER);
  }
  const toAffineMemo = memoized((p, iz) => {
    const { X, Y, Z } = p;
    if (Fp.eql(Z, Fp.ONE))
      return { x: X, y: Y };
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? Fp.ONE : Fp.inv(Z);
    const x = Fp.mul(X, iz);
    const y = Fp.mul(Y, iz);
    const zz = Fp.mul(Z, iz);
    if (is0)
      return { x: Fp.ZERO, y: Fp.ZERO };
    if (!Fp.eql(zz, Fp.ONE))
      throw new Error("invZ was invalid");
    return { x, y };
  });
  const assertValidMemo = memoized((p) => {
    if (p.is0()) {
      if (extraOpts.allowInfinityPoint && !Fp.is0(p.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y } = p.toAffine();
    if (!Fp.isValid(x) || !Fp.isValid(y))
      throw new Error("bad point: x or y not field elements");
    if (!isValidXY(x, y))
      throw new Error("bad point: equation left != right");
    if (!p.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  function finishEndo(endoBeta, k1p, k2p, k1neg, k2neg) {
    k2p = new Point(Fp.mul(k2p.X, endoBeta), k2p.Y, k2p.Z);
    k1p = negateCt(k1neg, k1p);
    k2p = negateCt(k2neg, k2p);
    return k1p.add(k2p);
  }

  class Point {
    constructor(X, Y, Z) {
      this.X = acoord("x", X);
      this.Y = acoord("y", Y, true);
      this.Z = acoord("z", Z);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    static fromAffine(p) {
      const { x, y } = p || {};
      if (!p || !Fp.isValid(x) || !Fp.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof Point)
        throw new Error("projective point not allowed");
      if (Fp.is0(x) && Fp.is0(y))
        return Point.ZERO;
      return new Point(x, y, Fp.ONE);
    }
    static fromBytes(bytes) {
      const P = Point.fromAffine(decodePoint(_abytes2(bytes, undefined, "point")));
      P.assertValidity();
      return P;
    }
    static fromHex(hex) {
      return Point.fromBytes(ensureBytes("pointHex", hex));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(windowSize = 8, isLazy = true) {
      wnaf.createCache(this, windowSize);
      if (!isLazy)
        this.multiply(_3n2);
      return this;
    }
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (!Fp.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !Fp.isOdd(y);
    }
    equals(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
      const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
      return U1 && U2;
    }
    negate() {
      return new Point(this.X, Fp.neg(this.Y), this.Z);
    }
    double() {
      const { a, b } = CURVE;
      const b3 = Fp.mul(b, _3n2);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      let { ZERO: X3, ZERO: Y3, ZERO: Z3 } = Fp;
      let t0 = Fp.mul(X1, X1);
      let t1 = Fp.mul(Y1, Y1);
      let t2 = Fp.mul(Z1, Z1);
      let t3 = Fp.mul(X1, Y1);
      t3 = Fp.add(t3, t3);
      Z3 = Fp.mul(X1, Z1);
      Z3 = Fp.add(Z3, Z3);
      X3 = Fp.mul(a, Z3);
      Y3 = Fp.mul(b3, t2);
      Y3 = Fp.add(X3, Y3);
      X3 = Fp.sub(t1, Y3);
      Y3 = Fp.add(t1, Y3);
      Y3 = Fp.mul(X3, Y3);
      X3 = Fp.mul(t3, X3);
      Z3 = Fp.mul(b3, Z3);
      t2 = Fp.mul(a, t2);
      t3 = Fp.sub(t0, t2);
      t3 = Fp.mul(a, t3);
      t3 = Fp.add(t3, Z3);
      Z3 = Fp.add(t0, t0);
      t0 = Fp.add(Z3, t0);
      t0 = Fp.add(t0, t2);
      t0 = Fp.mul(t0, t3);
      Y3 = Fp.add(Y3, t0);
      t2 = Fp.mul(Y1, Z1);
      t2 = Fp.add(t2, t2);
      t0 = Fp.mul(t2, t3);
      X3 = Fp.sub(X3, t0);
      Z3 = Fp.mul(t2, t1);
      Z3 = Fp.add(Z3, Z3);
      Z3 = Fp.add(Z3, Z3);
      return new Point(X3, Y3, Z3);
    }
    add(other) {
      aprjpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      let { ZERO: X3, ZERO: Y3, ZERO: Z3 } = Fp;
      const a = CURVE.a;
      const b3 = Fp.mul(CURVE.b, _3n2);
      let t0 = Fp.mul(X1, X2);
      let t1 = Fp.mul(Y1, Y2);
      let t2 = Fp.mul(Z1, Z2);
      let t3 = Fp.add(X1, Y1);
      let t4 = Fp.add(X2, Y2);
      t3 = Fp.mul(t3, t4);
      t4 = Fp.add(t0, t1);
      t3 = Fp.sub(t3, t4);
      t4 = Fp.add(X1, Z1);
      let t5 = Fp.add(X2, Z2);
      t4 = Fp.mul(t4, t5);
      t5 = Fp.add(t0, t2);
      t4 = Fp.sub(t4, t5);
      t5 = Fp.add(Y1, Z1);
      X3 = Fp.add(Y2, Z2);
      t5 = Fp.mul(t5, X3);
      X3 = Fp.add(t1, t2);
      t5 = Fp.sub(t5, X3);
      Z3 = Fp.mul(a, t4);
      X3 = Fp.mul(b3, t2);
      Z3 = Fp.add(X3, Z3);
      X3 = Fp.sub(t1, Z3);
      Z3 = Fp.add(t1, Z3);
      Y3 = Fp.mul(X3, Z3);
      t1 = Fp.add(t0, t0);
      t1 = Fp.add(t1, t0);
      t2 = Fp.mul(a, t2);
      t4 = Fp.mul(b3, t4);
      t1 = Fp.add(t1, t2);
      t2 = Fp.sub(t0, t2);
      t2 = Fp.mul(a, t2);
      t4 = Fp.add(t4, t2);
      t0 = Fp.mul(t1, t4);
      Y3 = Fp.add(Y3, t0);
      t0 = Fp.mul(t5, t4);
      X3 = Fp.mul(t3, X3);
      X3 = Fp.sub(X3, t0);
      t0 = Fp.mul(t3, t1);
      Z3 = Fp.mul(t5, Z3);
      Z3 = Fp.add(Z3, t0);
      return new Point(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    multiply(scalar) {
      const { endo: endo2 } = extraOpts;
      if (!Fn.isValidNot0(scalar))
        throw new Error("invalid scalar: out of range");
      let point, fake;
      const mul = (n) => wnaf.cached(this, n, (p) => normalizeZ(Point, p));
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(scalar);
        const { p: k1p, f: k1f } = mul(k1);
        const { p: k2p, f: k2f } = mul(k2);
        fake = k1f.add(k2f);
        point = finishEndo(endo2.beta, k1p, k2p, k1neg, k2neg);
      } else {
        const { p, f } = mul(scalar);
        point = p;
        fake = f;
      }
      return normalizeZ(Point, [point, fake])[0];
    }
    multiplyUnsafe(sc) {
      const { endo: endo2 } = extraOpts;
      const p = this;
      if (!Fn.isValid(sc))
        throw new Error("invalid scalar: out of range");
      if (sc === _0n5 || p.is0())
        return Point.ZERO;
      if (sc === _1n5)
        return p;
      if (wnaf.hasCache(this))
        return this.multiply(sc);
      if (endo2) {
        const { k1neg, k1, k2neg, k2 } = splitEndoScalarN(sc);
        const { p1, p2 } = mulEndoUnsafe(Point, p, k1, k2);
        return finishEndo(endo2.beta, p1, p2, k1neg, k2neg);
      } else {
        return wnaf.unsafe(p, sc);
      }
    }
    multiplyAndAddUnsafe(Q, a, b) {
      const sum = this.multiplyUnsafe(a).add(Q.multiplyUnsafe(b));
      return sum.is0() ? undefined : sum;
    }
    toAffine(invertedZ) {
      return toAffineMemo(this, invertedZ);
    }
    isTorsionFree() {
      const { isTorsionFree } = extraOpts;
      if (cofactor === _1n5)
        return true;
      if (isTorsionFree)
        return isTorsionFree(Point, this);
      return wnaf.unsafe(this, CURVE_ORDER).is0();
    }
    clearCofactor() {
      const { clearCofactor } = extraOpts;
      if (cofactor === _1n5)
        return this;
      if (clearCofactor)
        return clearCofactor(Point, this);
      return this.multiplyUnsafe(cofactor);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    toBytes(isCompressed = true) {
      _abool2(isCompressed, "isCompressed");
      this.assertValidity();
      return encodePoint(Point, this, isCompressed);
    }
    toHex(isCompressed = true) {
      return bytesToHex2(this.toBytes(isCompressed));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(isCompressed = true) {
      return this.toBytes(isCompressed);
    }
    _setWindowSize(windowSize) {
      this.precompute(windowSize);
    }
    static normalizeZ(points) {
      return normalizeZ(Point, points);
    }
    static msm(points, scalars) {
      return pippenger(Point, Fn, points, scalars);
    }
    static fromPrivateKey(privateKey) {
      return Point.BASE.multiply(_normFnElement(Fn, privateKey));
    }
  }
  Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
  Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
  Point.Fp = Fp;
  Point.Fn = Fn;
  const bits = Fn.BITS;
  const wnaf = new wNAF(Point, extraOpts.endo ? Math.ceil(bits / 2) : bits);
  Point.BASE.precompute(8);
  return Point;
}
function pprefix(hasEvenY) {
  return Uint8Array.of(hasEvenY ? 2 : 3);
}
function SWUFpSqrtRatio(Fp, Z) {
  const q = Fp.ORDER;
  let l = _0n5;
  for (let o = q - _1n5;o % _2n3 === _0n5; o /= _2n3)
    l += _1n5;
  const c1 = l;
  const _2n_pow_c1_1 = _2n3 << c1 - _1n5 - _1n5;
  const _2n_pow_c1 = _2n_pow_c1_1 * _2n3;
  const c2 = (q - _1n5) / _2n_pow_c1;
  const c3 = (c2 - _1n5) / _2n3;
  const c4 = _2n_pow_c1 - _1n5;
  const c5 = _2n_pow_c1_1;
  const c6 = Fp.pow(Z, c2);
  const c7 = Fp.pow(Z, (c2 + _1n5) / _2n3);
  let sqrtRatio = (u, v) => {
    let tv1 = c6;
    let tv2 = Fp.pow(v, c4);
    let tv3 = Fp.sqr(tv2);
    tv3 = Fp.mul(tv3, v);
    let tv5 = Fp.mul(u, tv3);
    tv5 = Fp.pow(tv5, c3);
    tv5 = Fp.mul(tv5, tv2);
    tv2 = Fp.mul(tv5, v);
    tv3 = Fp.mul(tv5, u);
    let tv4 = Fp.mul(tv3, tv2);
    tv5 = Fp.pow(tv4, c5);
    let isQR = Fp.eql(tv5, Fp.ONE);
    tv2 = Fp.mul(tv3, c7);
    tv5 = Fp.mul(tv4, tv1);
    tv3 = Fp.cmov(tv2, tv3, isQR);
    tv4 = Fp.cmov(tv5, tv4, isQR);
    for (let i = c1;i > _1n5; i--) {
      let tv52 = i - _2n3;
      tv52 = _2n3 << tv52 - _1n5;
      let tvv5 = Fp.pow(tv4, tv52);
      const e1 = Fp.eql(tvv5, Fp.ONE);
      tv2 = Fp.mul(tv3, tv1);
      tv1 = Fp.mul(tv1, tv1);
      tvv5 = Fp.mul(tv4, tv1);
      tv3 = Fp.cmov(tv2, tv3, e1);
      tv4 = Fp.cmov(tvv5, tv4, e1);
    }
    return { isValid: isQR, value: tv3 };
  };
  if (Fp.ORDER % _4n2 === _3n2) {
    const c12 = (Fp.ORDER - _3n2) / _4n2;
    const c22 = Fp.sqrt(Fp.neg(Z));
    sqrtRatio = (u, v) => {
      let tv1 = Fp.sqr(v);
      const tv2 = Fp.mul(u, v);
      tv1 = Fp.mul(tv1, tv2);
      let y1 = Fp.pow(tv1, c12);
      y1 = Fp.mul(y1, tv2);
      const y2 = Fp.mul(y1, c22);
      const tv3 = Fp.mul(Fp.sqr(y1), v);
      const isQR = Fp.eql(tv3, u);
      let y = Fp.cmov(y2, y1, isQR);
      return { isValid: isQR, value: y };
    };
  }
  return sqrtRatio;
}
function mapToCurveSimpleSWU(Fp, opts) {
  validateField(Fp);
  const { A, B, Z } = opts;
  if (!Fp.isValid(A) || !Fp.isValid(B) || !Fp.isValid(Z))
    throw new Error("mapToCurveSimpleSWU: invalid opts");
  const sqrtRatio = SWUFpSqrtRatio(Fp, Z);
  if (!Fp.isOdd)
    throw new Error("Field does not have .isOdd()");
  return (u) => {
    let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
    tv1 = Fp.sqr(u);
    tv1 = Fp.mul(tv1, Z);
    tv2 = Fp.sqr(tv1);
    tv2 = Fp.add(tv2, tv1);
    tv3 = Fp.add(tv2, Fp.ONE);
    tv3 = Fp.mul(tv3, B);
    tv4 = Fp.cmov(Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO));
    tv4 = Fp.mul(tv4, A);
    tv2 = Fp.sqr(tv3);
    tv6 = Fp.sqr(tv4);
    tv5 = Fp.mul(tv6, A);
    tv2 = Fp.add(tv2, tv5);
    tv2 = Fp.mul(tv2, tv3);
    tv6 = Fp.mul(tv6, tv4);
    tv5 = Fp.mul(tv6, B);
    tv2 = Fp.add(tv2, tv5);
    x = Fp.mul(tv1, tv3);
    const { isValid, value } = sqrtRatio(tv2, tv6);
    y = Fp.mul(tv1, u);
    y = Fp.mul(y, value);
    x = Fp.cmov(x, tv3, isValid);
    y = Fp.cmov(y, value, isValid);
    const e1 = Fp.isOdd(u) === Fp.isOdd(y);
    y = Fp.cmov(Fp.neg(y), y, e1);
    const tv4_inv = FpInvertBatch(Fp, [tv4], true)[0];
    x = Fp.mul(x, tv4_inv);
    return { x, y };
  };
}
function getWLengths(Fp, Fn) {
  return {
    secretKey: Fn.BYTES,
    publicKey: 1 + Fp.BYTES,
    publicKeyUncompressed: 1 + 2 * Fp.BYTES,
    publicKeyHasPrefix: true,
    signature: 2 * Fn.BYTES
  };
}
function ecdh(Point, ecdhOpts = {}) {
  const { Fn } = Point;
  const randomBytes_ = ecdhOpts.randomBytes || randomBytes;
  const lengths = Object.assign(getWLengths(Point.Fp, Fn), { seed: getMinHashLength(Fn.ORDER) });
  function isValidSecretKey(secretKey) {
    try {
      return !!_normFnElement(Fn, secretKey);
    } catch (error) {
      return false;
    }
  }
  function isValidPublicKey(publicKey, isCompressed) {
    const { publicKey: comp, publicKeyUncompressed } = lengths;
    try {
      const l = publicKey.length;
      if (isCompressed === true && l !== comp)
        return false;
      if (isCompressed === false && l !== publicKeyUncompressed)
        return false;
      return !!Point.fromBytes(publicKey);
    } catch (error) {
      return false;
    }
  }
  function randomSecretKey(seed = randomBytes_(lengths.seed)) {
    return mapHashToField(_abytes2(seed, lengths.seed, "seed"), Fn.ORDER);
  }
  function getPublicKey(secretKey, isCompressed = true) {
    return Point.BASE.multiply(_normFnElement(Fn, secretKey)).toBytes(isCompressed);
  }
  function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  }
  function isProbPub(item) {
    if (typeof item === "bigint")
      return false;
    if (item instanceof Point)
      return true;
    const { secretKey, publicKey, publicKeyUncompressed } = lengths;
    if (Fn.allowedLengths || secretKey === publicKey)
      return;
    const l = ensureBytes("key", item).length;
    return l === publicKey || l === publicKeyUncompressed;
  }
  function getSharedSecret(secretKeyA, publicKeyB, isCompressed = true) {
    if (isProbPub(secretKeyA) === true)
      throw new Error("first arg must be private key");
    if (isProbPub(publicKeyB) === false)
      throw new Error("second arg must be public key");
    const s = _normFnElement(Fn, secretKeyA);
    const b = Point.fromHex(publicKeyB);
    return b.multiply(s).toBytes(isCompressed);
  }
  const utils = {
    isValidSecretKey,
    isValidPublicKey,
    randomSecretKey,
    isValidPrivateKey: isValidSecretKey,
    randomPrivateKey: randomSecretKey,
    normPrivateKeyToScalar: (key) => _normFnElement(Fn, key),
    precompute(windowSize = 8, point = Point.BASE) {
      return point.precompute(windowSize, false);
    }
  };
  return Object.freeze({ getPublicKey, getSharedSecret, keygen, Point, utils, lengths });
}
function ecdsa(Point, hash, ecdsaOpts = {}) {
  ahash(hash);
  _validateObject(ecdsaOpts, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  });
  const randomBytes2 = ecdsaOpts.randomBytes || randomBytes;
  const hmac2 = ecdsaOpts.hmac || ((key, ...msgs) => hmac(hash, key, concatBytes(...msgs)));
  const { Fp, Fn } = Point;
  const { ORDER: CURVE_ORDER, BITS: fnBits } = Fn;
  const { keygen, getPublicKey, getSharedSecret, utils, lengths } = ecdh(Point, ecdsaOpts);
  const defaultSigOpts = {
    prehash: false,
    lowS: typeof ecdsaOpts.lowS === "boolean" ? ecdsaOpts.lowS : false,
    format: undefined,
    extraEntropy: false
  };
  const defaultSigOpts_format = "compact";
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER >> _1n5;
    return number > HALF;
  }
  function validateRS(title, num) {
    if (!Fn.isValidNot0(num))
      throw new Error(`invalid signature ${title}: out of range 1..Point.Fn.ORDER`);
    return num;
  }
  function validateSigLength(bytes, format) {
    validateSigFormat(format);
    const size2 = lengths.signature;
    const sizer = format === "compact" ? size2 : format === "recovered" ? size2 + 1 : undefined;
    return _abytes2(bytes, sizer, `${format} signature`);
  }

  class Signature {
    constructor(r, s, recovery) {
      this.r = validateRS("r", r);
      this.s = validateRS("s", s);
      if (recovery != null)
        this.recovery = recovery;
      Object.freeze(this);
    }
    static fromBytes(bytes, format = defaultSigOpts_format) {
      validateSigLength(bytes, format);
      let recid;
      if (format === "der") {
        const { r: r2, s: s2 } = DER.toSig(_abytes2(bytes));
        return new Signature(r2, s2);
      }
      if (format === "recovered") {
        recid = bytes[0];
        format = "compact";
        bytes = bytes.subarray(1);
      }
      const L = Fn.BYTES;
      const r = bytes.subarray(0, L);
      const s = bytes.subarray(L, L * 2);
      return new Signature(Fn.fromBytes(r), Fn.fromBytes(s), recid);
    }
    static fromHex(hex, format) {
      return this.fromBytes(hexToBytes2(hex), format);
    }
    addRecoveryBit(recovery) {
      return new Signature(this.r, this.s, recovery);
    }
    recoverPublicKey(messageHash) {
      const FIELD_ORDER = Fp.ORDER;
      const { r, s, recovery: rec } = this;
      if (rec == null || ![0, 1, 2, 3].includes(rec))
        throw new Error("recovery id invalid");
      const hasCofactor = CURVE_ORDER * _2n3 < FIELD_ORDER;
      if (hasCofactor && rec > 1)
        throw new Error("recovery id is ambiguous for h>1 curve");
      const radj = rec === 2 || rec === 3 ? r + CURVE_ORDER : r;
      if (!Fp.isValid(radj))
        throw new Error("recovery id 2 or 3 invalid");
      const x = Fp.toBytes(radj);
      const R = Point.fromBytes(concatBytes(pprefix((rec & 1) === 0), x));
      const ir = Fn.inv(radj);
      const h = bits2int_modN(ensureBytes("msgHash", messageHash));
      const u1 = Fn.create(-h * ir);
      const u2 = Fn.create(s * ir);
      const Q = Point.BASE.multiplyUnsafe(u1).add(R.multiplyUnsafe(u2));
      if (Q.is0())
        throw new Error("point at infinify");
      Q.assertValidity();
      return Q;
    }
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    toBytes(format = defaultSigOpts_format) {
      validateSigFormat(format);
      if (format === "der")
        return hexToBytes2(DER.hexFromSig(this));
      const r = Fn.toBytes(this.r);
      const s = Fn.toBytes(this.s);
      if (format === "recovered") {
        if (this.recovery == null)
          throw new Error("recovery bit must be present");
        return concatBytes(Uint8Array.of(this.recovery), r, s);
      }
      return concatBytes(r, s);
    }
    toHex(format) {
      return bytesToHex2(this.toBytes(format));
    }
    assertValidity() {}
    static fromCompact(hex) {
      return Signature.fromBytes(ensureBytes("sig", hex), "compact");
    }
    static fromDER(hex) {
      return Signature.fromBytes(ensureBytes("sig", hex), "der");
    }
    normalizeS() {
      return this.hasHighS() ? new Signature(this.r, Fn.neg(this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return bytesToHex2(this.toBytes("der"));
    }
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return bytesToHex2(this.toBytes("compact"));
    }
  }
  const bits2int = ecdsaOpts.bits2int || function bits2int_def(bytes) {
    if (bytes.length > 8192)
      throw new Error("input is too large");
    const num = bytesToNumberBE(bytes);
    const delta = bytes.length * 8 - fnBits;
    return delta > 0 ? num >> BigInt(delta) : num;
  };
  const bits2int_modN = ecdsaOpts.bits2int_modN || function bits2int_modN_def(bytes) {
    return Fn.create(bits2int(bytes));
  };
  const ORDER_MASK = bitMask(fnBits);
  function int2octets(num) {
    aInRange("num < 2^" + fnBits, num, _0n5, ORDER_MASK);
    return Fn.toBytes(num);
  }
  function validateMsgAndHash(message, prehash) {
    _abytes2(message, undefined, "message");
    return prehash ? _abytes2(hash(message), undefined, "prehashed message") : message;
  }
  function prepSig(message, privateKey, opts) {
    if (["recovered", "canonical"].some((k) => (k in opts)))
      throw new Error("sign() legacy options not supported");
    const { lowS, prehash, extraEntropy } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    const h1int = bits2int_modN(message);
    const d = _normFnElement(Fn, privateKey);
    const seedArgs = [int2octets(d), int2octets(h1int)];
    if (extraEntropy != null && extraEntropy !== false) {
      const e = extraEntropy === true ? randomBytes2(lengths.secretKey) : extraEntropy;
      seedArgs.push(ensureBytes("extraEntropy", e));
    }
    const seed = concatBytes(...seedArgs);
    const m = h1int;
    function k2sig(kBytes) {
      const k = bits2int(kBytes);
      if (!Fn.isValidNot0(k))
        return;
      const ik = Fn.inv(k);
      const q = Point.BASE.multiply(k).toAffine();
      const r = Fn.create(q.x);
      if (r === _0n5)
        return;
      const s = Fn.create(ik * Fn.create(m + r * d));
      if (s === _0n5)
        return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n5);
      let normS = s;
      if (lowS && isBiggerThanHalfOrder(s)) {
        normS = Fn.neg(s);
        recovery ^= 1;
      }
      return new Signature(r, normS, recovery);
    }
    return { seed, k2sig };
  }
  function sign(message, secretKey, opts = {}) {
    message = ensureBytes("message", message);
    const { seed, k2sig } = prepSig(message, secretKey, opts);
    const drbg = createHmacDrbg(hash.outputLen, Fn.BYTES, hmac2);
    const sig = drbg(seed, k2sig);
    return sig;
  }
  function tryParsingSig(sg) {
    let sig = undefined;
    const isHex2 = typeof sg === "string" || isBytes(sg);
    const isObj = !isHex2 && sg !== null && typeof sg === "object" && typeof sg.r === "bigint" && typeof sg.s === "bigint";
    if (!isHex2 && !isObj)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    if (isObj) {
      sig = new Signature(sg.r, sg.s);
    } else if (isHex2) {
      try {
        sig = Signature.fromBytes(ensureBytes("sig", sg), "der");
      } catch (derError) {
        if (!(derError instanceof DER.Err))
          throw derError;
      }
      if (!sig) {
        try {
          sig = Signature.fromBytes(ensureBytes("sig", sg), "compact");
        } catch (error) {
          return false;
        }
      }
    }
    if (!sig)
      return false;
    return sig;
  }
  function verify(signature, message, publicKey, opts = {}) {
    const { lowS, prehash, format } = validateSigOpts(opts, defaultSigOpts);
    publicKey = ensureBytes("publicKey", publicKey);
    message = validateMsgAndHash(ensureBytes("message", message), prehash);
    if ("strict" in opts)
      throw new Error("options.strict was renamed to lowS");
    const sig = format === undefined ? tryParsingSig(signature) : Signature.fromBytes(ensureBytes("sig", signature), format);
    if (sig === false)
      return false;
    try {
      const P = Point.fromBytes(publicKey);
      if (lowS && sig.hasHighS())
        return false;
      const { r, s } = sig;
      const h = bits2int_modN(message);
      const is = Fn.inv(s);
      const u1 = Fn.create(h * is);
      const u2 = Fn.create(r * is);
      const R = Point.BASE.multiplyUnsafe(u1).add(P.multiplyUnsafe(u2));
      if (R.is0())
        return false;
      const v = Fn.create(R.x);
      return v === r;
    } catch (e) {
      return false;
    }
  }
  function recoverPublicKey(signature, message, opts = {}) {
    const { prehash } = validateSigOpts(opts, defaultSigOpts);
    message = validateMsgAndHash(message, prehash);
    return Signature.fromBytes(signature, "recovered").recoverPublicKey(message).toBytes();
  }
  return Object.freeze({
    keygen,
    getPublicKey,
    getSharedSecret,
    utils,
    lengths,
    Point,
    sign,
    verify,
    recoverPublicKey,
    Signature,
    hash
  });
}
function _weierstrass_legacy_opts_to_new(c) {
  const CURVE = {
    a: c.a,
    b: c.b,
    p: c.Fp.ORDER,
    n: c.n,
    h: c.h,
    Gx: c.Gx,
    Gy: c.Gy
  };
  const Fp = c.Fp;
  let allowedLengths = c.allowedPrivateKeyLengths ? Array.from(new Set(c.allowedPrivateKeyLengths.map((l) => Math.ceil(l / 2)))) : undefined;
  const Fn = Field(CURVE.n, {
    BITS: c.nBitLength,
    allowedLengths,
    modFromBytes: c.wrapPrivateKey
  });
  const curveOpts = {
    Fp,
    Fn,
    allowInfinityPoint: c.allowInfinityPoint,
    endo: c.endo,
    isTorsionFree: c.isTorsionFree,
    clearCofactor: c.clearCofactor,
    fromBytes: c.fromBytes,
    toBytes: c.toBytes
  };
  return { CURVE, curveOpts };
}
function _ecdsa_legacy_opts_to_new(c) {
  const { CURVE, curveOpts } = _weierstrass_legacy_opts_to_new(c);
  const ecdsaOpts = {
    hmac: c.hmac,
    randomBytes: c.randomBytes,
    lowS: c.lowS,
    bits2int: c.bits2int,
    bits2int_modN: c.bits2int_modN
  };
  return { CURVE, curveOpts, hash: c.hash, ecdsaOpts };
}
function _ecdsa_new_output_to_legacy(c, _ecdsa) {
  const Point = _ecdsa.Point;
  return Object.assign({}, _ecdsa, {
    ProjectivePoint: Point,
    CURVE: Object.assign({}, c, nLength(Point.Fn.ORDER, Point.Fn.BITS))
  });
}
function weierstrass(c) {
  const { CURVE, curveOpts, hash, ecdsaOpts } = _ecdsa_legacy_opts_to_new(c);
  const Point = weierstrassN(CURVE, curveOpts);
  const signs = ecdsa(Point, hash, ecdsaOpts);
  return _ecdsa_new_output_to_legacy(c, signs);
}
var divNearest = (num, den) => (num + (num >= 0 ? den : -den) / _2n3) / den;
var DERErr;
var DER;
var _0n5;
var _1n5;
var _2n3;
var _3n2;
var _4n2;
var init_weierstrass = __esm(() => {
  init_hmac();
  init_utils();
  init_utils2();
  init_curve();
  init_modular();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  DERErr = class DERErr2 extends Error {
    constructor(m = "") {
      super(m);
    }
  };
  DER = {
    Err: DERErr,
    _tlv: {
      encode: (tag, data) => {
        const { Err: E } = DER;
        if (tag < 0 || tag > 256)
          throw new E("tlv.encode: wrong tag");
        if (data.length & 1)
          throw new E("tlv.encode: unpadded data");
        const dataLen = data.length / 2;
        const len = numberToHexUnpadded(dataLen);
        if (len.length / 2 & 128)
          throw new E("tlv.encode: long form length too big");
        const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
        const t = numberToHexUnpadded(tag);
        return t + lenLen + len + data;
      },
      decode(tag, data) {
        const { Err: E } = DER;
        let pos = 0;
        if (tag < 0 || tag > 256)
          throw new E("tlv.encode: wrong tag");
        if (data.length < 2 || data[pos++] !== tag)
          throw new E("tlv.decode: wrong tlv");
        const first = data[pos++];
        const isLong = !!(first & 128);
        let length = 0;
        if (!isLong)
          length = first;
        else {
          const lenLen = first & 127;
          if (!lenLen)
            throw new E("tlv.decode(long): indefinite length not supported");
          if (lenLen > 4)
            throw new E("tlv.decode(long): byte length is too big");
          const lengthBytes = data.subarray(pos, pos + lenLen);
          if (lengthBytes.length !== lenLen)
            throw new E("tlv.decode: length bytes not complete");
          if (lengthBytes[0] === 0)
            throw new E("tlv.decode(long): zero leftmost byte");
          for (const b of lengthBytes)
            length = length << 8 | b;
          pos += lenLen;
          if (length < 128)
            throw new E("tlv.decode(long): not minimal encoding");
        }
        const v = data.subarray(pos, pos + length);
        if (v.length !== length)
          throw new E("tlv.decode: wrong value length");
        return { v, l: data.subarray(pos + length) };
      }
    },
    _int: {
      encode(num) {
        const { Err: E } = DER;
        if (num < _0n5)
          throw new E("integer: negative integers are not allowed");
        let hex = numberToHexUnpadded(num);
        if (Number.parseInt(hex[0], 16) & 8)
          hex = "00" + hex;
        if (hex.length & 1)
          throw new E("unexpected DER parsing assertion: unpadded hex");
        return hex;
      },
      decode(data) {
        const { Err: E } = DER;
        if (data[0] & 128)
          throw new E("invalid signature integer: negative");
        if (data[0] === 0 && !(data[1] & 128))
          throw new E("invalid signature integer: unnecessary leading zero");
        return bytesToNumberBE(data);
      }
    },
    toSig(hex) {
      const { Err: E, _int: int, _tlv: tlv } = DER;
      const data = ensureBytes("signature", hex);
      const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
      if (seqLeftBytes.length)
        throw new E("invalid signature: left bytes after parsing");
      const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
      const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
      if (sLeftBytes.length)
        throw new E("invalid signature: left bytes after parsing");
      return { r: int.decode(rBytes), s: int.decode(sBytes) };
    },
    hexFromSig(sig) {
      const { _tlv: tlv, _int: int } = DER;
      const rs = tlv.encode(2, int.encode(sig.r));
      const ss = tlv.encode(2, int.encode(sig.s));
      const seq = rs + ss;
      return tlv.encode(48, seq);
    }
  };
  _0n5 = BigInt(0);
  _1n5 = BigInt(1);
  _2n3 = BigInt(2);
  _3n2 = BigInt(3);
  _4n2 = BigInt(4);
});
function createCurve(curveDef, defHash) {
  const create3 = (hash) => weierstrass({ ...curveDef, hash });
  return { ...create3(defHash), create: create3 };
}
var init__shortw_utils = __esm(() => {
  init_weierstrass();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
});
function i2osp(value, length) {
  anum(value);
  anum(length);
  if (value < 0 || value >= 1 << 8 * length)
    throw new Error("invalid I2OSP input: " + value);
  const res = Array.from({ length }).fill(0);
  for (let i = length - 1;i >= 0; i--) {
    res[i] = value & 255;
    value >>>= 8;
  }
  return new Uint8Array(res);
}
function strxor(a, b) {
  const arr = new Uint8Array(a.length);
  for (let i = 0;i < a.length; i++) {
    arr[i] = a[i] ^ b[i];
  }
  return arr;
}
function anum(item) {
  if (!Number.isSafeInteger(item))
    throw new Error("number expected");
}
function normDST(DST) {
  if (!isBytes(DST) && typeof DST !== "string")
    throw new Error("DST must be Uint8Array or string");
  return typeof DST === "string" ? utf8ToBytes(DST) : DST;
}
function expand_message_xmd(msg, DST, lenInBytes, H) {
  abytes(msg);
  anum(lenInBytes);
  DST = normDST(DST);
  if (DST.length > 255)
    DST = H(concatBytes(utf8ToBytes("H2C-OVERSIZE-DST-"), DST));
  const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
  const ell = Math.ceil(lenInBytes / b_in_bytes);
  if (lenInBytes > 65535 || ell > 255)
    throw new Error("expand_message_xmd: invalid lenInBytes");
  const DST_prime = concatBytes(DST, i2osp(DST.length, 1));
  const Z_pad = i2osp(0, r_in_bytes);
  const l_i_b_str = i2osp(lenInBytes, 2);
  const b = new Array(ell);
  const b_0 = H(concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
  b[0] = H(concatBytes(b_0, i2osp(1, 1), DST_prime));
  for (let i = 1;i <= ell; i++) {
    const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
    b[i] = H(concatBytes(...args));
  }
  const pseudo_random_bytes = concatBytes(...b);
  return pseudo_random_bytes.slice(0, lenInBytes);
}
function expand_message_xof(msg, DST, lenInBytes, k, H) {
  abytes(msg);
  anum(lenInBytes);
  DST = normDST(DST);
  if (DST.length > 255) {
    const dkLen = Math.ceil(2 * k / 8);
    DST = H.create({ dkLen }).update(utf8ToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
  }
  if (lenInBytes > 65535 || DST.length > 255)
    throw new Error("expand_message_xof: invalid lenInBytes");
  return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
}
function hash_to_field(msg, count, options) {
  _validateObject(options, {
    p: "bigint",
    m: "number",
    k: "number",
    hash: "function"
  });
  const { p, k, m, hash, expand, DST } = options;
  if (!isHash(options.hash))
    throw new Error("expected valid hash");
  abytes(msg);
  anum(count);
  const log2p = p.toString(2).length;
  const L = Math.ceil((log2p + k) / 8);
  const len_in_bytes = count * m * L;
  let prb;
  if (expand === "xmd") {
    prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
  } else if (expand === "xof") {
    prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
  } else if (expand === "_internal_pass") {
    prb = msg;
  } else {
    throw new Error('expand must be "xmd" or "xof"');
  }
  const u = new Array(count);
  for (let i = 0;i < count; i++) {
    const e = new Array(m);
    for (let j = 0;j < m; j++) {
      const elm_offset = L * (j + i * m);
      const tv = prb.subarray(elm_offset, elm_offset + L);
      e[j] = mod(os2ip(tv), p);
    }
    u[i] = e;
  }
  return u;
}
function isogenyMap(field, map) {
  const coeff = map.map((i) => Array.from(i).reverse());
  return (x, y) => {
    const [xn, xd, yn, yd] = coeff.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
    const [xd_inv, yd_inv] = FpInvertBatch(field, [xd, yd], true);
    x = field.mul(xn, xd_inv);
    y = field.mul(y, field.mul(yn, yd_inv));
    return { x, y };
  };
}
function createHasher2(Point, mapToCurve, defaults) {
  if (typeof mapToCurve !== "function")
    throw new Error("mapToCurve() must be defined");
  function map(num) {
    return Point.fromAffine(mapToCurve(num));
  }
  function clear(initial) {
    const P = initial.clearCofactor();
    if (P.equals(Point.ZERO))
      return Point.ZERO;
    P.assertValidity();
    return P;
  }
  return {
    defaults,
    hashToCurve(msg, options) {
      const opts = Object.assign({}, defaults, options);
      const u = hash_to_field(msg, 2, opts);
      const u0 = map(u[0]);
      const u1 = map(u[1]);
      return clear(u0.add(u1));
    },
    encodeToCurve(msg, options) {
      const optsDst = defaults.encodeDST ? { DST: defaults.encodeDST } : {};
      const opts = Object.assign({}, defaults, optsDst, options);
      const u = hash_to_field(msg, 1, opts);
      const u0 = map(u[0]);
      return clear(u0);
    },
    mapToCurve(scalars) {
      if (!Array.isArray(scalars))
        throw new Error("expected array of bigints");
      for (const i of scalars)
        if (typeof i !== "bigint")
          throw new Error("expected array of bigints");
      return clear(map(scalars));
    },
    hashToScalar(msg, options) {
      const N = Point.Fn.ORDER;
      const opts = Object.assign({}, defaults, { p: N, m: 1, DST: _DST_scalar }, options);
      return hash_to_field(msg, 1, opts)[0][0];
    }
  };
}
var os2ip;
var _DST_scalar;
var init_hash_to_curve = __esm(() => {
  init_utils2();
  init_modular();
  os2ip = bytesToNumberBE;
  _DST_scalar = utf8ToBytes("HashToScalar-");
});
var exports_secp256k1 = {};
__export(exports_secp256k1, {
  secp256k1_hasher: () => secp256k1_hasher,
  secp256k1: () => secp256k1,
  schnorr: () => schnorr,
  hashToCurve: () => hashToCurve,
  encodeToCurve: () => encodeToCurve
});
function sqrtMod(y) {
  const P = secp256k1_CURVE.p;
  const _3n3 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
  const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
  const b2 = y * y * y % P;
  const b3 = b2 * b2 * y % P;
  const b6 = pow2(b3, _3n3, P) * b3 % P;
  const b9 = pow2(b6, _3n3, P) * b3 % P;
  const b11 = pow2(b9, _2n4, P) * b2 % P;
  const b22 = pow2(b11, _11n, P) * b11 % P;
  const b44 = pow2(b22, _22n, P) * b22 % P;
  const b88 = pow2(b44, _44n, P) * b44 % P;
  const b176 = pow2(b88, _88n, P) * b88 % P;
  const b220 = pow2(b176, _44n, P) * b44 % P;
  const b223 = pow2(b220, _3n3, P) * b3 % P;
  const t1 = pow2(b223, _23n, P) * b22 % P;
  const t2 = pow2(t1, _6n, P) * b2 % P;
  const root = pow2(t2, _2n4, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y))
    throw new Error("Cannot find square root");
  return root;
}
function taggedHash(tag, ...messages) {
  let tagP = TAGGED_HASH_PREFIXES[tag];
  if (tagP === undefined) {
    const tagH = sha256(utf8ToBytes(tag));
    tagP = concatBytes(tagH, tagH);
    TAGGED_HASH_PREFIXES[tag] = tagP;
  }
  return sha256(concatBytes(tagP, ...messages));
}
function schnorrGetExtPubKey(priv) {
  const { Fn, BASE } = Pointk1;
  const d_ = _normFnElement(Fn, priv);
  const p = BASE.multiply(d_);
  const scalar = hasEven(p.y) ? d_ : Fn.neg(d_);
  return { scalar, bytes: pointToBytes(p) };
}
function lift_x(x) {
  const Fp = Fpk1;
  if (!Fp.isValidNot0(x))
    throw new Error("invalid x: Fail if x ≥ p");
  const xx = Fp.create(x * x);
  const c = Fp.create(xx * x + BigInt(7));
  let y = Fp.sqrt(c);
  if (!hasEven(y))
    y = Fp.neg(y);
  const p = Pointk1.fromAffine({ x, y });
  p.assertValidity();
  return p;
}
function challenge(...args) {
  return Pointk1.Fn.create(num(taggedHash("BIP0340/challenge", ...args)));
}
function schnorrGetPublicKey(secretKey) {
  return schnorrGetExtPubKey(secretKey).bytes;
}
function schnorrSign(message, secretKey, auxRand = randomBytes(32)) {
  const { Fn } = Pointk1;
  const m = ensureBytes("message", message);
  const { bytes: px, scalar: d } = schnorrGetExtPubKey(secretKey);
  const a = ensureBytes("auxRand", auxRand, 32);
  const t = Fn.toBytes(d ^ num(taggedHash("BIP0340/aux", a)));
  const rand = taggedHash("BIP0340/nonce", t, px, m);
  const { bytes: rx, scalar: k } = schnorrGetExtPubKey(rand);
  const e = challenge(rx, px, m);
  const sig = new Uint8Array(64);
  sig.set(rx, 0);
  sig.set(Fn.toBytes(Fn.create(k + e * d)), 32);
  if (!schnorrVerify(sig, m, px))
    throw new Error("sign: Invalid signature produced");
  return sig;
}
function schnorrVerify(signature, message, publicKey) {
  const { Fn, BASE } = Pointk1;
  const sig = ensureBytes("signature", signature, 64);
  const m = ensureBytes("message", message);
  const pub = ensureBytes("publicKey", publicKey, 32);
  try {
    const P = lift_x(num(pub));
    const r = num(sig.subarray(0, 32));
    if (!inRange(r, _1n6, secp256k1_CURVE.p))
      return false;
    const s = num(sig.subarray(32, 64));
    if (!inRange(s, _1n6, secp256k1_CURVE.n))
      return false;
    const e = challenge(Fn.toBytes(r), pointToBytes(P), m);
    const R = BASE.multiplyUnsafe(s).add(P.multiplyUnsafe(Fn.neg(e)));
    const { x, y } = R.toAffine();
    if (R.is0() || !hasEven(y) || x !== r)
      return false;
    return true;
  } catch (error) {
    return false;
  }
}
var secp256k1_CURVE;
var secp256k1_ENDO;
var _0n6;
var _1n6;
var _2n4;
var Fpk1;
var secp256k1;
var TAGGED_HASH_PREFIXES;
var pointToBytes = (point) => point.toBytes(true).slice(1);
var Pointk1;
var hasEven = (y) => y % _2n4 === _0n6;
var num;
var schnorr;
var isoMap;
var mapSWU;
var secp256k1_hasher;
var hashToCurve;
var encodeToCurve;
var init_secp256k1 = __esm(() => {
  init_sha2();
  init_utils();
  init__shortw_utils();
  init_hash_to_curve();
  init_modular();
  init_weierstrass();
  init_utils2();
  /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  secp256k1_CURVE = {
    p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
    n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
    h: BigInt(1),
    a: BigInt(0),
    b: BigInt(7),
    Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
    Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
  };
  secp256k1_ENDO = {
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    basises: [
      [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
      [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
    ]
  };
  _0n6 = /* @__PURE__ */ BigInt(0);
  _1n6 = /* @__PURE__ */ BigInt(1);
  _2n4 = /* @__PURE__ */ BigInt(2);
  Fpk1 = Field(secp256k1_CURVE.p, { sqrt: sqrtMod });
  secp256k1 = createCurve({ ...secp256k1_CURVE, Fp: Fpk1, lowS: true, endo: secp256k1_ENDO }, sha256);
  TAGGED_HASH_PREFIXES = {};
  Pointk1 = /* @__PURE__ */ (() => secp256k1.Point)();
  num = bytesToNumberBE;
  schnorr = /* @__PURE__ */ (() => {
    const size2 = 32;
    const seedLength = 48;
    const randomSecretKey = (seed = randomBytes(seedLength)) => {
      return mapHashToField(seed, secp256k1_CURVE.n);
    };
    secp256k1.utils.randomSecretKey;
    function keygen(seed) {
      const secretKey = randomSecretKey(seed);
      return { secretKey, publicKey: schnorrGetPublicKey(secretKey) };
    }
    return {
      keygen,
      getPublicKey: schnorrGetPublicKey,
      sign: schnorrSign,
      verify: schnorrVerify,
      Point: Pointk1,
      utils: {
        randomSecretKey,
        randomPrivateKey: randomSecretKey,
        taggedHash,
        lift_x,
        pointToBytes,
        numberToBytesBE,
        bytesToNumberBE,
        mod
      },
      lengths: {
        secretKey: size2,
        publicKey: size2,
        publicKeyHasPrefix: false,
        signature: size2 * 2,
        seed: seedLength
      }
    };
  })();
  isoMap = /* @__PURE__ */ (() => isogenyMap(Fpk1, [
    [
      "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7",
      "0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581",
      "0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262",
      "0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c"
    ],
    [
      "0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b",
      "0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14",
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ],
    [
      "0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c",
      "0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3",
      "0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931",
      "0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84"
    ],
    [
      "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b",
      "0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573",
      "0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f",
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]
  ].map((i) => i.map((j) => BigInt(j)))))();
  mapSWU = /* @__PURE__ */ (() => mapToCurveSimpleSWU(Fpk1, {
    A: BigInt("0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533"),
    B: BigInt("1771"),
    Z: Fpk1.create(BigInt("-11"))
  }))();
  secp256k1_hasher = /* @__PURE__ */ (() => createHasher2(secp256k1.Point, (scalars) => {
    const { x, y } = mapSWU(Fpk1.create(scalars[0]));
    return isoMap(x, y);
  }, {
    DST: "secp256k1_XMD:SHA-256_SSWU_RO_",
    encodeDST: "secp256k1_XMD:SHA-256_SSWU_NU_",
    p: Fpk1.ORDER,
    m: 1,
    k: 128,
    expand: "xmd",
    hash: sha256
  }))();
  hashToCurve = /* @__PURE__ */ (() => secp256k1_hasher.hashToCurve)();
  encodeToCurve = /* @__PURE__ */ (() => secp256k1_hasher.encodeToCurve)();
});
function isMessage(arg, schema) {
  const isMessage2 = arg !== null && typeof arg == "object" && "$typeName" in arg && typeof arg.$typeName == "string";
  if (!isMessage2) {
    return false;
  }
  if (schema === undefined) {
    return true;
  }
  return schema.typeName === arg.$typeName;
}
var ScalarType;
(function(ScalarType2) {
  ScalarType2[ScalarType2["DOUBLE"] = 1] = "DOUBLE";
  ScalarType2[ScalarType2["FLOAT"] = 2] = "FLOAT";
  ScalarType2[ScalarType2["INT64"] = 3] = "INT64";
  ScalarType2[ScalarType2["UINT64"] = 4] = "UINT64";
  ScalarType2[ScalarType2["INT32"] = 5] = "INT32";
  ScalarType2[ScalarType2["FIXED64"] = 6] = "FIXED64";
  ScalarType2[ScalarType2["FIXED32"] = 7] = "FIXED32";
  ScalarType2[ScalarType2["BOOL"] = 8] = "BOOL";
  ScalarType2[ScalarType2["STRING"] = 9] = "STRING";
  ScalarType2[ScalarType2["BYTES"] = 12] = "BYTES";
  ScalarType2[ScalarType2["UINT32"] = 13] = "UINT32";
  ScalarType2[ScalarType2["SFIXED32"] = 15] = "SFIXED32";
  ScalarType2[ScalarType2["SFIXED64"] = 16] = "SFIXED64";
  ScalarType2[ScalarType2["SINT32"] = 17] = "SINT32";
  ScalarType2[ScalarType2["SINT64"] = 18] = "SINT64";
})(ScalarType || (ScalarType = {}));
function varint64read() {
  let lowBits = 0;
  let highBits = 0;
  for (let shift = 0;shift < 28; shift += 7) {
    let b = this.buf[this.pos++];
    lowBits |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }
  let middleByte = this.buf[this.pos++];
  lowBits |= (middleByte & 15) << 28;
  highBits = (middleByte & 112) >> 4;
  if ((middleByte & 128) == 0) {
    this.assertBounds();
    return [lowBits, highBits];
  }
  for (let shift = 3;shift <= 31; shift += 7) {
    let b = this.buf[this.pos++];
    highBits |= (b & 127) << shift;
    if ((b & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
  }
  throw new Error("invalid varint");
}
function varint64write(lo, hi, bytes) {
  for (let i = 0;i < 28; i = i + 7) {
    const shift = lo >>> i;
    const hasNext = !(shift >>> 7 == 0 && hi == 0);
    const byte = (hasNext ? shift | 128 : shift) & 255;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }
  const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
  const hasMoreBits = !(hi >> 3 == 0);
  bytes.push((hasMoreBits ? splitBits | 128 : splitBits) & 255);
  if (!hasMoreBits) {
    return;
  }
  for (let i = 3;i < 31; i = i + 7) {
    const shift = hi >>> i;
    const hasNext = !(shift >>> 7 == 0);
    const byte = (hasNext ? shift | 128 : shift) & 255;
    bytes.push(byte);
    if (!hasNext) {
      return;
    }
  }
  bytes.push(hi >>> 31 & 1);
}
var TWO_PWR_32_DBL = 4294967296;
function int64FromString(dec) {
  const minus = dec[0] === "-";
  if (minus) {
    dec = dec.slice(1);
  }
  const base = 1e6;
  let lowBits = 0;
  let highBits = 0;
  function add1e6digit(begin, end) {
    const digit1e6 = Number(dec.slice(begin, end));
    highBits *= base;
    lowBits = lowBits * base + digit1e6;
    if (lowBits >= TWO_PWR_32_DBL) {
      highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
      lowBits = lowBits % TWO_PWR_32_DBL;
    }
  }
  add1e6digit(-24, -18);
  add1e6digit(-18, -12);
  add1e6digit(-12, -6);
  add1e6digit(-6);
  return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
}
function int64ToString(lo, hi) {
  let bits = newBits(lo, hi);
  const negative = bits.hi & 2147483648;
  if (negative) {
    bits = negate(bits.lo, bits.hi);
  }
  const result = uInt64ToString(bits.lo, bits.hi);
  return negative ? "-" + result : result;
}
function uInt64ToString(lo, hi) {
  ({ lo, hi } = toUnsigned(lo, hi));
  if (hi <= 2097151) {
    return String(TWO_PWR_32_DBL * hi + lo);
  }
  const low = lo & 16777215;
  const mid = (lo >>> 24 | hi << 8) & 16777215;
  const high = hi >> 16 & 65535;
  let digitA = low + mid * 6777216 + high * 6710656;
  let digitB = mid + high * 8147497;
  let digitC = high * 2;
  const base = 1e7;
  if (digitA >= base) {
    digitB += Math.floor(digitA / base);
    digitA %= base;
  }
  if (digitB >= base) {
    digitC += Math.floor(digitB / base);
    digitB %= base;
  }
  return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
}
function toUnsigned(lo, hi) {
  return { lo: lo >>> 0, hi: hi >>> 0 };
}
function newBits(lo, hi) {
  return { lo: lo | 0, hi: hi | 0 };
}
function negate(lowBits, highBits) {
  highBits = ~highBits;
  if (lowBits) {
    lowBits = ~lowBits + 1;
  } else {
    highBits += 1;
  }
  return newBits(lowBits, highBits);
}
var decimalFrom1e7WithLeadingZeros = (digit1e7) => {
  const partial = String(digit1e7);
  return "0000000".slice(partial.length) + partial;
};
function varint32write(value, bytes) {
  if (value >= 0) {
    while (value > 127) {
      bytes.push(value & 127 | 128);
      value = value >>> 7;
    }
    bytes.push(value);
  } else {
    for (let i = 0;i < 9; i++) {
      bytes.push(value & 127 | 128);
      value = value >> 7;
    }
    bytes.push(1);
  }
}
function varint32read() {
  let b = this.buf[this.pos++];
  let result = b & 127;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 7;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 14;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 127) << 21;
  if ((b & 128) == 0) {
    this.assertBounds();
    return result;
  }
  b = this.buf[this.pos++];
  result |= (b & 15) << 28;
  for (let readBytes = 5;(b & 128) !== 0 && readBytes < 10; readBytes++)
    b = this.buf[this.pos++];
  if ((b & 128) != 0)
    throw new Error("invalid varint");
  this.assertBounds();
  return result >>> 0;
}
var protoInt64 = /* @__PURE__ */ makeInt64Support();
function makeInt64Support() {
  const dv = new DataView(new ArrayBuffer(8));
  const ok = typeof BigInt === "function" && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function" && (typeof process != "object" || typeof process.env != "object" || process.env.BUF_BIGINT_DISABLE !== "1");
  if (ok) {
    const MIN = BigInt("-9223372036854775808");
    const MAX = BigInt("9223372036854775807");
    const UMIN = BigInt("0");
    const UMAX = BigInt("18446744073709551615");
    return {
      zero: BigInt(0),
      supported: true,
      parse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > MAX || bi < MIN) {
          throw new Error(`invalid int64: ${value}`);
        }
        return bi;
      },
      uParse(value) {
        const bi = typeof value == "bigint" ? value : BigInt(value);
        if (bi > UMAX || bi < UMIN) {
          throw new Error(`invalid uint64: ${value}`);
        }
        return bi;
      },
      enc(value) {
        dv.setBigInt64(0, this.parse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      uEnc(value) {
        dv.setBigInt64(0, this.uParse(value), true);
        return {
          lo: dv.getInt32(0, true),
          hi: dv.getInt32(4, true)
        };
      },
      dec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigInt64(0, true);
      },
      uDec(lo, hi) {
        dv.setInt32(0, lo, true);
        dv.setInt32(4, hi, true);
        return dv.getBigUint64(0, true);
      }
    };
  }
  return {
    zero: "0",
    supported: false,
    parse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return value;
    },
    uParse(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return value;
    },
    enc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertInt64String(value);
      return int64FromString(value);
    },
    uEnc(value) {
      if (typeof value != "string") {
        value = value.toString();
      }
      assertUInt64String(value);
      return int64FromString(value);
    },
    dec(lo, hi) {
      return int64ToString(lo, hi);
    },
    uDec(lo, hi) {
      return uInt64ToString(lo, hi);
    }
  };
}
function assertInt64String(value) {
  if (!/^-?[0-9]+$/.test(value)) {
    throw new Error("invalid int64: " + value);
  }
}
function assertUInt64String(value) {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("invalid uint64: " + value);
  }
}
function scalarZeroValue(type, longAsString) {
  switch (type) {
    case ScalarType.STRING:
      return "";
    case ScalarType.BOOL:
      return false;
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      return 0;
    case ScalarType.INT64:
    case ScalarType.UINT64:
    case ScalarType.SFIXED64:
    case ScalarType.FIXED64:
    case ScalarType.SINT64:
      return longAsString ? "0" : protoInt64.zero;
    case ScalarType.BYTES:
      return new Uint8Array(0);
    default:
      return 0;
  }
}
function isScalarZeroValue(type, value) {
  switch (type) {
    case ScalarType.BOOL:
      return value === false;
    case ScalarType.STRING:
      return value === "";
    case ScalarType.BYTES:
      return value instanceof Uint8Array && !value.byteLength;
    default:
      return value == 0;
  }
}
var IMPLICIT = 2;
var unsafeLocal = Symbol.for("reflect unsafe local");
function unsafeOneofCase(target, oneof) {
  const c = target[oneof.localName].case;
  if (c === undefined) {
    return c;
  }
  return oneof.fields.find((f) => f.localName === c);
}
function unsafeIsSet(target, field) {
  const name = field.localName;
  if (field.oneof) {
    return target[field.oneof.localName].case === name;
  }
  if (field.presence != IMPLICIT) {
    return target[name] !== undefined && Object.prototype.hasOwnProperty.call(target, name);
  }
  switch (field.fieldKind) {
    case "list":
      return target[name].length > 0;
    case "map":
      return Object.keys(target[name]).length > 0;
    case "scalar":
      return !isScalarZeroValue(field.scalar, target[name]);
    case "enum":
      return target[name] !== field.enum.values[0].number;
  }
  throw new Error("message field with implicit presence");
}
function unsafeIsSetExplicit(target, localName) {
  return Object.prototype.hasOwnProperty.call(target, localName) && target[localName] !== undefined;
}
function unsafeGet(target, field) {
  if (field.oneof) {
    const oneof = target[field.oneof.localName];
    if (oneof.case === field.localName) {
      return oneof.value;
    }
    return;
  }
  return target[field.localName];
}
function unsafeSet(target, field, value) {
  if (field.oneof) {
    target[field.oneof.localName] = {
      case: field.localName,
      value
    };
  } else {
    target[field.localName] = value;
  }
}
function unsafeClear(target, field) {
  const name = field.localName;
  if (field.oneof) {
    const oneofLocalName = field.oneof.localName;
    if (target[oneofLocalName].case === name) {
      target[oneofLocalName] = { case: undefined };
    }
  } else if (field.presence != IMPLICIT) {
    delete target[name];
  } else {
    switch (field.fieldKind) {
      case "map":
        target[name] = {};
        break;
      case "list":
        target[name] = [];
        break;
      case "enum":
        target[name] = field.enum.values[0].number;
        break;
      case "scalar":
        target[name] = scalarZeroValue(field.scalar, field.longAsString);
        break;
    }
  }
}
function isObject(arg) {
  return arg !== null && typeof arg == "object" && !Array.isArray(arg);
}
function isReflectList(arg, field) {
  var _a, _b, _c, _d;
  if (isObject(arg) && unsafeLocal in arg && "add" in arg && "field" in arg && typeof arg.field == "function") {
    if (field !== undefined) {
      const a = field;
      const b = arg.field();
      return a.listKind == b.listKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === undefined ? undefined : _a.typeName) === ((_b = b.message) === null || _b === undefined ? undefined : _b.typeName) && ((_c = a.enum) === null || _c === undefined ? undefined : _c.typeName) === ((_d = b.enum) === null || _d === undefined ? undefined : _d.typeName);
    }
    return true;
  }
  return false;
}
function isReflectMap(arg, field) {
  var _a, _b, _c, _d;
  if (isObject(arg) && unsafeLocal in arg && "has" in arg && "field" in arg && typeof arg.field == "function") {
    if (field !== undefined) {
      const a = field, b = arg.field();
      return a.mapKey === b.mapKey && a.mapKind == b.mapKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === undefined ? undefined : _a.typeName) === ((_b = b.message) === null || _b === undefined ? undefined : _b.typeName) && ((_c = a.enum) === null || _c === undefined ? undefined : _c.typeName) === ((_d = b.enum) === null || _d === undefined ? undefined : _d.typeName);
    }
    return true;
  }
  return false;
}
function isReflectMessage(arg, messageDesc) {
  return isObject(arg) && unsafeLocal in arg && "desc" in arg && isObject(arg.desc) && arg.desc.kind === "message" && (messageDesc === undefined || arg.desc.typeName == messageDesc.typeName);
}
function isWrapper(arg) {
  return isWrapperTypeName(arg.$typeName);
}
function isWrapperDesc(messageDesc) {
  const f = messageDesc.fields[0];
  return isWrapperTypeName(messageDesc.typeName) && f !== undefined && f.fieldKind == "scalar" && f.name == "value" && f.number == 1;
}
function isWrapperTypeName(name) {
  return name.startsWith("google.protobuf.") && [
    "DoubleValue",
    "FloatValue",
    "Int64Value",
    "UInt64Value",
    "Int32Value",
    "UInt32Value",
    "BoolValue",
    "StringValue",
    "BytesValue"
  ].includes(name.substring(16));
}
var EDITION_PROTO3 = 999;
var EDITION_PROTO2 = 998;
var IMPLICIT2 = 2;
function create(schema, init) {
  if (isMessage(init, schema)) {
    return init;
  }
  const message = createZeroMessage(schema);
  if (init !== undefined) {
    initMessage(schema, message, init);
  }
  return message;
}
function initMessage(messageDesc, message, init) {
  for (const member of messageDesc.members) {
    let value = init[member.localName];
    if (value == null) {
      continue;
    }
    let field;
    if (member.kind == "oneof") {
      const oneofField = unsafeOneofCase(init, member);
      if (!oneofField) {
        continue;
      }
      field = oneofField;
      value = unsafeGet(init, oneofField);
    } else {
      field = member;
    }
    switch (field.fieldKind) {
      case "message":
        value = toMessage(field, value);
        break;
      case "scalar":
        value = initScalar(field, value);
        break;
      case "list":
        value = initList(field, value);
        break;
      case "map":
        value = initMap(field, value);
        break;
    }
    unsafeSet(message, field, value);
  }
  return message;
}
function initScalar(field, value) {
  if (field.scalar == ScalarType.BYTES) {
    return toU8Arr(value);
  }
  return value;
}
function initMap(field, value) {
  if (isObject(value)) {
    if (field.scalar == ScalarType.BYTES) {
      return convertObjectValues(value, toU8Arr);
    }
    if (field.mapKind == "message") {
      return convertObjectValues(value, (val) => toMessage(field, val));
    }
  }
  return value;
}
function initList(field, value) {
  if (Array.isArray(value)) {
    if (field.scalar == ScalarType.BYTES) {
      return value.map(toU8Arr);
    }
    if (field.listKind == "message") {
      return value.map((item) => toMessage(field, item));
    }
  }
  return value;
}
function toMessage(field, value) {
  if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) {
    return initScalar(field.message.fields[0], value);
  }
  if (isObject(value)) {
    if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName !== "google.protobuf.Value") {
      return value;
    }
    if (!isMessage(value, field.message)) {
      return create(field.message, value);
    }
  }
  return value;
}
function toU8Arr(value) {
  return Array.isArray(value) ? new Uint8Array(value) : value;
}
function convertObjectValues(obj, fn) {
  const ret = {};
  for (const entry of Object.entries(obj)) {
    ret[entry[0]] = fn(entry[1]);
  }
  return ret;
}
var tokenZeroMessageField = Symbol();
var messagePrototypes = new WeakMap;
function createZeroMessage(desc) {
  let msg;
  if (!needsPrototypeChain(desc)) {
    msg = {
      $typeName: desc.typeName
    };
    for (const member of desc.members) {
      if (member.kind == "oneof" || member.presence == IMPLICIT2) {
        msg[member.localName] = createZeroField(member);
      }
    }
  } else {
    const cached = messagePrototypes.get(desc);
    let prototype;
    let members;
    if (cached) {
      ({ prototype, members } = cached);
    } else {
      prototype = {};
      members = new Set;
      for (const member of desc.members) {
        if (member.kind == "oneof") {
          continue;
        }
        if (member.fieldKind != "scalar" && member.fieldKind != "enum") {
          continue;
        }
        if (member.presence == IMPLICIT2) {
          continue;
        }
        members.add(member);
        prototype[member.localName] = createZeroField(member);
      }
      messagePrototypes.set(desc, { prototype, members });
    }
    msg = Object.create(prototype);
    msg.$typeName = desc.typeName;
    for (const member of desc.members) {
      if (members.has(member)) {
        continue;
      }
      if (member.kind == "field") {
        if (member.fieldKind == "message") {
          continue;
        }
        if (member.fieldKind == "scalar" || member.fieldKind == "enum") {
          if (member.presence != IMPLICIT2) {
            continue;
          }
        }
      }
      msg[member.localName] = createZeroField(member);
    }
  }
  return msg;
}
function needsPrototypeChain(desc) {
  switch (desc.file.edition) {
    case EDITION_PROTO3:
      return false;
    case EDITION_PROTO2:
      return true;
    default:
      return desc.fields.some((f) => f.presence != IMPLICIT2 && f.fieldKind != "message" && !f.oneof);
  }
}
function createZeroField(field) {
  if (field.kind == "oneof") {
    return { case: undefined };
  }
  if (field.fieldKind == "list") {
    return [];
  }
  if (field.fieldKind == "map") {
    return {};
  }
  if (field.fieldKind == "message") {
    return tokenZeroMessageField;
  }
  const defaultValue = field.getDefaultValue();
  if (defaultValue !== undefined) {
    return field.fieldKind == "scalar" && field.longAsString ? defaultValue.toString() : defaultValue;
  }
  return field.fieldKind == "scalar" ? scalarZeroValue(field.scalar, field.longAsString) : field.enum.values[0].number;
}
var errorNames = [
  "FieldValueInvalidError",
  "FieldListRangeError",
  "ForeignFieldError"
];

class FieldError extends Error {
  constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
    super(message);
    this.name = name;
    this.field = () => fieldOrOneof;
  }
}
function isFieldError(arg) {
  return arg instanceof Error && errorNames.includes(arg.name) && "field" in arg && typeof arg.field == "function";
}
var symbol = Symbol.for("@bufbuild/protobuf/text-encoding");
function getTextEncoding() {
  if (globalThis[symbol] == undefined) {
    const te = new globalThis.TextEncoder;
    const td = new globalThis.TextDecoder;
    globalThis[symbol] = {
      encodeUtf8(text) {
        return te.encode(text);
      },
      decodeUtf8(bytes) {
        return td.decode(bytes);
      },
      checkUtf8(text) {
        try {
          encodeURIComponent(text);
          return true;
        } catch (_) {
          return false;
        }
      }
    };
  }
  return globalThis[symbol];
}
var WireType;
(function(WireType2) {
  WireType2[WireType2["Varint"] = 0] = "Varint";
  WireType2[WireType2["Bit64"] = 1] = "Bit64";
  WireType2[WireType2["LengthDelimited"] = 2] = "LengthDelimited";
  WireType2[WireType2["StartGroup"] = 3] = "StartGroup";
  WireType2[WireType2["EndGroup"] = 4] = "EndGroup";
  WireType2[WireType2["Bit32"] = 5] = "Bit32";
})(WireType || (WireType = {}));
var FLOAT32_MAX = 340282346638528860000000000000000000000;
var FLOAT32_MIN = -340282346638528860000000000000000000000;
var UINT32_MAX = 4294967295;
var INT32_MAX = 2147483647;
var INT32_MIN = -2147483648;

class BinaryWriter {
  constructor(encodeUtf8 = getTextEncoding().encodeUtf8) {
    this.encodeUtf8 = encodeUtf8;
    this.stack = [];
    this.chunks = [];
    this.buf = [];
  }
  finish() {
    if (this.buf.length) {
      this.chunks.push(new Uint8Array(this.buf));
      this.buf = [];
    }
    let len = 0;
    for (let i = 0;i < this.chunks.length; i++)
      len += this.chunks[i].length;
    let bytes = new Uint8Array(len);
    let offset = 0;
    for (let i = 0;i < this.chunks.length; i++) {
      bytes.set(this.chunks[i], offset);
      offset += this.chunks[i].length;
    }
    this.chunks = [];
    return bytes;
  }
  fork() {
    this.stack.push({ chunks: this.chunks, buf: this.buf });
    this.chunks = [];
    this.buf = [];
    return this;
  }
  join() {
    let chunk = this.finish();
    let prev = this.stack.pop();
    if (!prev)
      throw new Error("invalid state, fork stack empty");
    this.chunks = prev.chunks;
    this.buf = prev.buf;
    this.uint32(chunk.byteLength);
    return this.raw(chunk);
  }
  tag(fieldNo, type) {
    return this.uint32((fieldNo << 3 | type) >>> 0);
  }
  raw(chunk) {
    if (this.buf.length) {
      this.chunks.push(new Uint8Array(this.buf));
      this.buf = [];
    }
    this.chunks.push(chunk);
    return this;
  }
  uint32(value) {
    assertUInt32(value);
    while (value > 127) {
      this.buf.push(value & 127 | 128);
      value = value >>> 7;
    }
    this.buf.push(value);
    return this;
  }
  int32(value) {
    assertInt32(value);
    varint32write(value, this.buf);
    return this;
  }
  bool(value) {
    this.buf.push(value ? 1 : 0);
    return this;
  }
  bytes(value) {
    this.uint32(value.byteLength);
    return this.raw(value);
  }
  string(value) {
    let chunk = this.encodeUtf8(value);
    this.uint32(chunk.byteLength);
    return this.raw(chunk);
  }
  float(value) {
    assertFloat32(value);
    let chunk = new Uint8Array(4);
    new DataView(chunk.buffer).setFloat32(0, value, true);
    return this.raw(chunk);
  }
  double(value) {
    let chunk = new Uint8Array(8);
    new DataView(chunk.buffer).setFloat64(0, value, true);
    return this.raw(chunk);
  }
  fixed32(value) {
    assertUInt32(value);
    let chunk = new Uint8Array(4);
    new DataView(chunk.buffer).setUint32(0, value, true);
    return this.raw(chunk);
  }
  sfixed32(value) {
    assertInt32(value);
    let chunk = new Uint8Array(4);
    new DataView(chunk.buffer).setInt32(0, value, true);
    return this.raw(chunk);
  }
  sint32(value) {
    assertInt32(value);
    value = (value << 1 ^ value >> 31) >>> 0;
    varint32write(value, this.buf);
    return this;
  }
  sfixed64(value) {
    let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = protoInt64.enc(value);
    view.setInt32(0, tc.lo, true);
    view.setInt32(4, tc.hi, true);
    return this.raw(chunk);
  }
  fixed64(value) {
    let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = protoInt64.uEnc(value);
    view.setInt32(0, tc.lo, true);
    view.setInt32(4, tc.hi, true);
    return this.raw(chunk);
  }
  int64(value) {
    let tc = protoInt64.enc(value);
    varint64write(tc.lo, tc.hi, this.buf);
    return this;
  }
  sint64(value) {
    const tc = protoInt64.enc(value), sign = tc.hi >> 31, lo = tc.lo << 1 ^ sign, hi = (tc.hi << 1 | tc.lo >>> 31) ^ sign;
    varint64write(lo, hi, this.buf);
    return this;
  }
  uint64(value) {
    const tc = protoInt64.uEnc(value);
    varint64write(tc.lo, tc.hi, this.buf);
    return this;
  }
}

class BinaryReader {
  constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
    this.decodeUtf8 = decodeUtf8;
    this.varint64 = varint64read;
    this.uint32 = varint32read;
    this.buf = buf;
    this.len = buf.length;
    this.pos = 0;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  tag() {
    let tag = this.uint32(), fieldNo = tag >>> 3, wireType = tag & 7;
    if (fieldNo <= 0 || wireType < 0 || wireType > 5)
      throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
    return [fieldNo, wireType];
  }
  skip(wireType, fieldNo) {
    let start = this.pos;
    switch (wireType) {
      case WireType.Varint:
        while (this.buf[this.pos++] & 128) {}
        break;
      case WireType.Bit64:
        this.pos += 4;
      case WireType.Bit32:
        this.pos += 4;
        break;
      case WireType.LengthDelimited:
        let len = this.uint32();
        this.pos += len;
        break;
      case WireType.StartGroup:
        for (;; ) {
          const [fn, wt] = this.tag();
          if (wt === WireType.EndGroup) {
            if (fieldNo !== undefined && fn !== fieldNo) {
              throw new Error("invalid end group tag");
            }
            break;
          }
          this.skip(wt, fn);
        }
        break;
      default:
        throw new Error("cant skip wire type " + wireType);
    }
    this.assertBounds();
    return this.buf.subarray(start, this.pos);
  }
  assertBounds() {
    if (this.pos > this.len)
      throw new RangeError("premature EOF");
  }
  int32() {
    return this.uint32() | 0;
  }
  sint32() {
    let zze = this.uint32();
    return zze >>> 1 ^ -(zze & 1);
  }
  int64() {
    return protoInt64.dec(...this.varint64());
  }
  uint64() {
    return protoInt64.uDec(...this.varint64());
  }
  sint64() {
    let [lo, hi] = this.varint64();
    let s = -(lo & 1);
    lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
    hi = hi >>> 1 ^ s;
    return protoInt64.dec(lo, hi);
  }
  bool() {
    let [lo, hi] = this.varint64();
    return lo !== 0 || hi !== 0;
  }
  fixed32() {
    return this.view.getUint32((this.pos += 4) - 4, true);
  }
  sfixed32() {
    return this.view.getInt32((this.pos += 4) - 4, true);
  }
  fixed64() {
    return protoInt64.uDec(this.sfixed32(), this.sfixed32());
  }
  sfixed64() {
    return protoInt64.dec(this.sfixed32(), this.sfixed32());
  }
  float() {
    return this.view.getFloat32((this.pos += 4) - 4, true);
  }
  double() {
    return this.view.getFloat64((this.pos += 8) - 8, true);
  }
  bytes() {
    let len = this.uint32(), start = this.pos;
    this.pos += len;
    this.assertBounds();
    return this.buf.subarray(start, start + len);
  }
  string() {
    return this.decodeUtf8(this.bytes());
  }
}
function assertInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid int32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
    throw new Error("invalid int32: " + arg);
}
function assertUInt32(arg) {
  if (typeof arg == "string") {
    arg = Number(arg);
  } else if (typeof arg != "number") {
    throw new Error("invalid uint32: " + typeof arg);
  }
  if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
    throw new Error("invalid uint32: " + arg);
}
function assertFloat32(arg) {
  if (typeof arg == "string") {
    const o = arg;
    arg = Number(arg);
    if (Number.isNaN(arg) && o !== "NaN") {
      throw new Error("invalid float32: " + o);
    }
  } else if (typeof arg != "number") {
    throw new Error("invalid float32: " + typeof arg);
  }
  if (Number.isFinite(arg) && (arg > FLOAT32_MAX || arg < FLOAT32_MIN))
    throw new Error("invalid float32: " + arg);
}
function checkField(field, value) {
  const check = field.fieldKind == "list" ? isReflectList(value, field) : field.fieldKind == "map" ? isReflectMap(value, field) : checkSingular(field, value);
  if (check === true) {
    return;
  }
  let reason;
  switch (field.fieldKind) {
    case "list":
      reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
      break;
    case "map":
      reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
      break;
    default: {
      reason = reasonSingular(field, value, check);
    }
  }
  return new FieldError(field, reason);
}
function checkListItem(field, index, value) {
  const check = checkSingular(field, value);
  if (check !== true) {
    return new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
  }
  return;
}
function checkMapEntry(field, key, value) {
  const checkKey = checkScalarValue(key, field.mapKey);
  if (checkKey !== true) {
    return new FieldError(field, `invalid map key: ${reasonSingular({ scalar: field.mapKey }, key, checkKey)}`);
  }
  const checkVal = checkSingular(field, value);
  if (checkVal !== true) {
    return new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`);
  }
  return;
}
function checkSingular(field, value) {
  if (field.scalar !== undefined) {
    return checkScalarValue(value, field.scalar);
  }
  if (field.enum !== undefined) {
    if (field.enum.open) {
      return Number.isInteger(value);
    }
    return field.enum.values.some((v) => v.number === value);
  }
  return isReflectMessage(value, field.message);
}
function checkScalarValue(value, scalar) {
  switch (scalar) {
    case ScalarType.DOUBLE:
      return typeof value == "number";
    case ScalarType.FLOAT:
      if (typeof value != "number") {
        return false;
      }
      if (Number.isNaN(value) || !Number.isFinite(value)) {
        return true;
      }
      if (value > FLOAT32_MAX || value < FLOAT32_MIN) {
        return `${value.toFixed()} out of range`;
      }
      return true;
    case ScalarType.INT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return false;
      }
      if (value > INT32_MAX || value < INT32_MIN) {
        return `${value.toFixed()} out of range`;
      }
      return true;
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return false;
      }
      if (value > UINT32_MAX || value < 0) {
        return `${value.toFixed()} out of range`;
      }
      return true;
    case ScalarType.BOOL:
      return typeof value == "boolean";
    case ScalarType.STRING:
      if (typeof value != "string") {
        return false;
      }
      return getTextEncoding().checkUtf8(value) || "invalid UTF8";
    case ScalarType.BYTES:
      return value instanceof Uint8Array;
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
        try {
          protoInt64.parse(value);
          return true;
        } catch (_) {
          return `${value} out of range`;
        }
      }
      return false;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
        try {
          protoInt64.uParse(value);
          return true;
        } catch (_) {
          return `${value} out of range`;
        }
      }
      return false;
  }
}
function reasonSingular(field, val, details) {
  details = typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
  if (field.scalar !== undefined) {
    return `expected ${scalarTypeDescription(field.scalar)}` + details;
  }
  if (field.enum !== undefined) {
    return `expected ${field.enum.toString()}` + details;
  }
  return `expected ${formatReflectMessage(field.message)}` + details;
}
function formatVal(val) {
  switch (typeof val) {
    case "object":
      if (val === null) {
        return "null";
      }
      if (val instanceof Uint8Array) {
        return `Uint8Array(${val.length})`;
      }
      if (Array.isArray(val)) {
        return `Array(${val.length})`;
      }
      if (isReflectList(val)) {
        return formatReflectList(val.field());
      }
      if (isReflectMap(val)) {
        return formatReflectMap(val.field());
      }
      if (isReflectMessage(val)) {
        return formatReflectMessage(val.desc);
      }
      if (isMessage(val)) {
        return `message ${val.$typeName}`;
      }
      return "object";
    case "string":
      return val.length > 30 ? "string" : `"${val.split('"').join("\\\"")}"`;
    case "boolean":
      return String(val);
    case "number":
      return String(val);
    case "bigint":
      return String(val) + "n";
    default:
      return typeof val;
  }
}
function formatReflectMessage(desc) {
  return `ReflectMessage (${desc.typeName})`;
}
function formatReflectList(field) {
  switch (field.listKind) {
    case "message":
      return `ReflectList (${field.message.toString()})`;
    case "enum":
      return `ReflectList (${field.enum.toString()})`;
    case "scalar":
      return `ReflectList (${ScalarType[field.scalar]})`;
  }
}
function formatReflectMap(field) {
  switch (field.mapKind) {
    case "message":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${field.message.toString()})`;
    case "enum":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${field.enum.toString()})`;
    case "scalar":
      return `ReflectMap (${ScalarType[field.mapKey]}, ${ScalarType[field.scalar]})`;
  }
}
function scalarTypeDescription(scalar) {
  switch (scalar) {
    case ScalarType.STRING:
      return "string";
    case ScalarType.BOOL:
      return "boolean";
    case ScalarType.INT64:
    case ScalarType.SINT64:
    case ScalarType.SFIXED64:
      return "bigint (int64)";
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return "bigint (uint64)";
    case ScalarType.BYTES:
      return "Uint8Array";
    case ScalarType.DOUBLE:
      return "number (float64)";
    case ScalarType.FLOAT:
      return "number (float32)";
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
      return "number (uint32)";
    case ScalarType.INT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      return "number (int32)";
  }
}
function reflect(messageDesc, message, check = true) {
  return new ReflectMessageImpl(messageDesc, message, check);
}

class ReflectMessageImpl {
  get sortedFields() {
    var _a;
    return (_a = this._sortedFields) !== null && _a !== undefined ? _a : this._sortedFields = this.desc.fields.concat().sort((a, b) => a.number - b.number);
  }
  constructor(messageDesc, message, check = true) {
    this.lists = new Map;
    this.maps = new Map;
    this.check = check;
    this.desc = messageDesc;
    this.message = this[unsafeLocal] = message !== null && message !== undefined ? message : create(messageDesc);
    this.fields = messageDesc.fields;
    this.oneofs = messageDesc.oneofs;
    this.members = messageDesc.members;
  }
  findNumber(number) {
    if (!this._fieldsByNumber) {
      this._fieldsByNumber = new Map(this.desc.fields.map((f) => [f.number, f]));
    }
    return this._fieldsByNumber.get(number);
  }
  oneofCase(oneof) {
    assertOwn(this.message, oneof);
    return unsafeOneofCase(this.message, oneof);
  }
  isSet(field) {
    assertOwn(this.message, field);
    return unsafeIsSet(this.message, field);
  }
  clear(field) {
    assertOwn(this.message, field);
    unsafeClear(this.message, field);
  }
  get(field) {
    assertOwn(this.message, field);
    const value = unsafeGet(this.message, field);
    switch (field.fieldKind) {
      case "list":
        let list = this.lists.get(field);
        if (!list || list[unsafeLocal] !== value) {
          this.lists.set(field, list = new ReflectListImpl(field, value, this.check));
        }
        return list;
      case "map":
        let map = this.maps.get(field);
        if (!map || map[unsafeLocal] !== value) {
          this.maps.set(field, map = new ReflectMapImpl(field, value, this.check));
        }
        return map;
      case "message":
        return messageToReflect(field, value, this.check);
      case "scalar":
        return value === undefined ? scalarZeroValue(field.scalar, false) : longToReflect(field, value);
      case "enum":
        return value !== null && value !== undefined ? value : field.enum.values[0].number;
    }
  }
  set(field, value) {
    assertOwn(this.message, field);
    if (this.check) {
      const err = checkField(field, value);
      if (err) {
        throw err;
      }
    }
    let local;
    if (field.fieldKind == "message") {
      local = messageToLocal(field, value);
    } else if (isReflectMap(value) || isReflectList(value)) {
      local = value[unsafeLocal];
    } else {
      local = longToLocal(field, value);
    }
    unsafeSet(this.message, field, local);
  }
  getUnknown() {
    return this.message.$unknown;
  }
  setUnknown(value) {
    this.message.$unknown = value;
  }
}
function assertOwn(owner, member) {
  if (member.parent.typeName !== owner.$typeName) {
    throw new FieldError(member, `cannot use ${member.toString()} with message ${owner.$typeName}`, "ForeignFieldError");
  }
}

class ReflectListImpl {
  field() {
    return this._field;
  }
  get size() {
    return this._arr.length;
  }
  constructor(field, unsafeInput, check) {
    this._field = field;
    this._arr = this[unsafeLocal] = unsafeInput;
    this.check = check;
  }
  get(index) {
    const item = this._arr[index];
    return item === undefined ? undefined : listItemToReflect(this._field, item, this.check);
  }
  set(index, item) {
    if (index < 0 || index >= this._arr.length) {
      throw new FieldError(this._field, `list item #${index + 1}: out of range`);
    }
    if (this.check) {
      const err = checkListItem(this._field, index, item);
      if (err) {
        throw err;
      }
    }
    this._arr[index] = listItemToLocal(this._field, item);
  }
  add(item) {
    if (this.check) {
      const err = checkListItem(this._field, this._arr.length, item);
      if (err) {
        throw err;
      }
    }
    this._arr.push(listItemToLocal(this._field, item));
    return;
  }
  clear() {
    this._arr.splice(0, this._arr.length);
  }
  [Symbol.iterator]() {
    return this.values();
  }
  keys() {
    return this._arr.keys();
  }
  *values() {
    for (const item of this._arr) {
      yield listItemToReflect(this._field, item, this.check);
    }
  }
  *entries() {
    for (let i = 0;i < this._arr.length; i++) {
      yield [i, listItemToReflect(this._field, this._arr[i], this.check)];
    }
  }
}

class ReflectMapImpl {
  constructor(field, unsafeInput, check = true) {
    this.obj = this[unsafeLocal] = unsafeInput !== null && unsafeInput !== undefined ? unsafeInput : {};
    this.check = check;
    this._field = field;
  }
  field() {
    return this._field;
  }
  set(key, value) {
    if (this.check) {
      const err = checkMapEntry(this._field, key, value);
      if (err) {
        throw err;
      }
    }
    this.obj[mapKeyToLocal(key)] = mapValueToLocal(this._field, value);
    return this;
  }
  delete(key) {
    const k = mapKeyToLocal(key);
    const has = Object.prototype.hasOwnProperty.call(this.obj, k);
    if (has) {
      delete this.obj[k];
    }
    return has;
  }
  clear() {
    for (const key of Object.keys(this.obj)) {
      delete this.obj[key];
    }
  }
  get(key) {
    let val = this.obj[mapKeyToLocal(key)];
    if (val !== undefined) {
      val = mapValueToReflect(this._field, val, this.check);
    }
    return val;
  }
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.obj, mapKeyToLocal(key));
  }
  *keys() {
    for (const objKey of Object.keys(this.obj)) {
      yield mapKeyToReflect(objKey, this._field.mapKey);
    }
  }
  *entries() {
    for (const objEntry of Object.entries(this.obj)) {
      yield [
        mapKeyToReflect(objEntry[0], this._field.mapKey),
        mapValueToReflect(this._field, objEntry[1], this.check)
      ];
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  get size() {
    return Object.keys(this.obj).length;
  }
  *values() {
    for (const val of Object.values(this.obj)) {
      yield mapValueToReflect(this._field, val, this.check);
    }
  }
  forEach(callbackfn, thisArg) {
    for (const mapEntry of this.entries()) {
      callbackfn.call(thisArg, mapEntry[1], mapEntry[0], this);
    }
  }
}
function messageToLocal(field, value) {
  if (!isReflectMessage(value)) {
    return value;
  }
  if (isWrapper(value.message) && !field.oneof && field.fieldKind == "message") {
    return value.message.value;
  }
  if (value.desc.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value") {
    return wktStructToLocal(value.message);
  }
  return value.message;
}
function messageToReflect(field, value, check) {
  if (value !== undefined) {
    if (isWrapperDesc(field.message) && !field.oneof && field.fieldKind == "message") {
      value = {
        $typeName: field.message.typeName,
        value: longToReflect(field.message.fields[0], value)
      };
    } else if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value" && isObject(value)) {
      value = wktStructToReflect(value);
    }
  }
  return new ReflectMessageImpl(field.message, value, check);
}
function listItemToLocal(field, value) {
  if (field.listKind == "message") {
    return messageToLocal(field, value);
  }
  return longToLocal(field, value);
}
function listItemToReflect(field, value, check) {
  if (field.listKind == "message") {
    return messageToReflect(field, value, check);
  }
  return longToReflect(field, value);
}
function mapValueToLocal(field, value) {
  if (field.mapKind == "message") {
    return messageToLocal(field, value);
  }
  return longToLocal(field, value);
}
function mapValueToReflect(field, value, check) {
  if (field.mapKind == "message") {
    return messageToReflect(field, value, check);
  }
  return value;
}
function mapKeyToLocal(key) {
  return typeof key == "string" || typeof key == "number" ? key : String(key);
}
function mapKeyToReflect(key, type) {
  switch (type) {
    case ScalarType.STRING:
      return key;
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32: {
      const n = Number.parseInt(key);
      if (Number.isFinite(n)) {
        return n;
      }
      break;
    }
    case ScalarType.BOOL:
      switch (key) {
        case "true":
          return true;
        case "false":
          return false;
      }
      break;
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      try {
        return protoInt64.uParse(key);
      } catch (_a) {}
      break;
    default:
      try {
        return protoInt64.parse(key);
      } catch (_b) {}
      break;
  }
  return key;
}
function longToReflect(field, value) {
  switch (field.scalar) {
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if ("longAsString" in field && field.longAsString && typeof value == "string") {
        value = protoInt64.parse(value);
      }
      break;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if ("longAsString" in field && field.longAsString && typeof value == "string") {
        value = protoInt64.uParse(value);
      }
      break;
  }
  return value;
}
function longToLocal(field, value) {
  switch (field.scalar) {
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      if ("longAsString" in field && field.longAsString) {
        value = String(value);
      } else if (typeof value == "string" || typeof value == "number") {
        value = protoInt64.parse(value);
      }
      break;
    case ScalarType.FIXED64:
    case ScalarType.UINT64:
      if ("longAsString" in field && field.longAsString) {
        value = String(value);
      } else if (typeof value == "string" || typeof value == "number") {
        value = protoInt64.uParse(value);
      }
      break;
  }
  return value;
}
function wktStructToReflect(json) {
  const struct = {
    $typeName: "google.protobuf.Struct",
    fields: {}
  };
  if (isObject(json)) {
    for (const [k, v] of Object.entries(json)) {
      struct.fields[k] = wktValueToReflect(v);
    }
  }
  return struct;
}
function wktStructToLocal(val) {
  const json = {};
  for (const [k, v] of Object.entries(val.fields)) {
    json[k] = wktValueToLocal(v);
  }
  return json;
}
function wktValueToLocal(val) {
  switch (val.kind.case) {
    case "structValue":
      return wktStructToLocal(val.kind.value);
    case "listValue":
      return val.kind.value.values.map(wktValueToLocal);
    case "nullValue":
    case undefined:
      return null;
    default:
      return val.kind.value;
  }
}
function wktValueToReflect(json) {
  const value = {
    $typeName: "google.protobuf.Value",
    kind: { case: undefined }
  };
  switch (typeof json) {
    case "number":
      value.kind = { case: "numberValue", value: json };
      break;
    case "string":
      value.kind = { case: "stringValue", value: json };
      break;
    case "boolean":
      value.kind = { case: "boolValue", value: json };
      break;
    case "object":
      if (json === null) {
        const nullValue = 0;
        value.kind = { case: "nullValue", value: nullValue };
      } else if (Array.isArray(json)) {
        const listValue = {
          $typeName: "google.protobuf.ListValue",
          values: []
        };
        if (Array.isArray(json)) {
          for (const e of json) {
            listValue.values.push(wktValueToReflect(e));
          }
        }
        value.kind = {
          case: "listValue",
          value: listValue
        };
      } else {
        value.kind = {
          case: "structValue",
          value: wktStructToReflect(json)
        };
      }
      break;
  }
  return value;
}
function base64Decode(base64Str) {
  const table = getDecodeTable();
  let es = base64Str.length * 3 / 4;
  if (base64Str[base64Str.length - 2] == "=")
    es -= 2;
  else if (base64Str[base64Str.length - 1] == "=")
    es -= 1;
  let bytes = new Uint8Array(es), bytePos = 0, groupPos = 0, b, p = 0;
  for (let i = 0;i < base64Str.length; i++) {
    b = table[base64Str.charCodeAt(i)];
    if (b === undefined) {
      switch (base64Str[i]) {
        case "=":
          groupPos = 0;
        case `
`:
        case "\r":
        case "\t":
        case " ":
          continue;
        default:
          throw Error("invalid base64 string");
      }
    }
    switch (groupPos) {
      case 0:
        p = b;
        groupPos = 1;
        break;
      case 1:
        bytes[bytePos++] = p << 2 | (b & 48) >> 4;
        p = b;
        groupPos = 2;
        break;
      case 2:
        bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
        p = b;
        groupPos = 3;
        break;
      case 3:
        bytes[bytePos++] = (p & 3) << 6 | b;
        groupPos = 0;
        break;
    }
  }
  if (groupPos == 1)
    throw Error("invalid base64 string");
  return bytes.subarray(0, bytePos);
}
var encodeTableStd;
var encodeTableUrl;
var decodeTable;
function getEncodeTable(encoding) {
  if (!encodeTableStd) {
    encodeTableStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    encodeTableUrl = encodeTableStd.slice(0, -2).concat("-", "_");
  }
  return encoding == "url" ? encodeTableUrl : encodeTableStd;
}
function getDecodeTable() {
  if (!decodeTable) {
    decodeTable = [];
    const encodeTable = getEncodeTable("std");
    for (let i = 0;i < encodeTable.length; i++)
      decodeTable[encodeTable[i].charCodeAt(0)] = i;
    decodeTable[45] = encodeTable.indexOf("+");
    decodeTable[95] = encodeTable.indexOf("/");
  }
  return decodeTable;
}
function protoCamelCase(snakeCase) {
  let capNext = false;
  const b = [];
  for (let i = 0;i < snakeCase.length; i++) {
    let c = snakeCase.charAt(i);
    switch (c) {
      case "_":
        capNext = true;
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        b.push(c);
        capNext = false;
        break;
      default:
        if (capNext) {
          capNext = false;
          c = c.toUpperCase();
        }
        b.push(c);
        break;
    }
  }
  return b.join("");
}
var reservedObjectProperties = new Set([
  "constructor",
  "toString",
  "toJSON",
  "valueOf"
]);
function safeObjectProperty(name) {
  return reservedObjectProperties.has(name) ? name + "$" : name;
}
function restoreJsonNames(message) {
  for (const f of message.field) {
    if (!unsafeIsSetExplicit(f, "jsonName")) {
      f.jsonName = protoCamelCase(f.name);
    }
  }
  message.nestedType.forEach(restoreJsonNames);
}
function parseTextFormatEnumValue(descEnum, value) {
  const enumValue = descEnum.values.find((v) => v.name === value);
  if (!enumValue) {
    throw new Error(`cannot parse ${descEnum} default value: ${value}`);
  }
  return enumValue.number;
}
function parseTextFormatScalarValue(type, value) {
  switch (type) {
    case ScalarType.STRING:
      return value;
    case ScalarType.BYTES: {
      const u = unescapeBytesDefaultValue(value);
      if (u === false) {
        throw new Error(`cannot parse ${ScalarType[type]} default value: ${value}`);
      }
      return u;
    }
    case ScalarType.INT64:
    case ScalarType.SFIXED64:
    case ScalarType.SINT64:
      return protoInt64.parse(value);
    case ScalarType.UINT64:
    case ScalarType.FIXED64:
      return protoInt64.uParse(value);
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      switch (value) {
        case "inf":
          return Number.POSITIVE_INFINITY;
        case "-inf":
          return Number.NEGATIVE_INFINITY;
        case "nan":
          return Number.NaN;
        default:
          return parseFloat(value);
      }
    case ScalarType.BOOL:
      return value === "true";
    case ScalarType.INT32:
    case ScalarType.UINT32:
    case ScalarType.SINT32:
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
      return parseInt(value, 10);
  }
}
function unescapeBytesDefaultValue(str) {
  const b = [];
  const input = {
    tail: str,
    c: "",
    next() {
      if (this.tail.length == 0) {
        return false;
      }
      this.c = this.tail[0];
      this.tail = this.tail.substring(1);
      return true;
    },
    take(n) {
      if (this.tail.length >= n) {
        const r = this.tail.substring(0, n);
        this.tail = this.tail.substring(n);
        return r;
      }
      return false;
    }
  };
  while (input.next()) {
    switch (input.c) {
      case "\\":
        if (input.next()) {
          switch (input.c) {
            case "\\":
              b.push(input.c.charCodeAt(0));
              break;
            case "b":
              b.push(8);
              break;
            case "f":
              b.push(12);
              break;
            case "n":
              b.push(10);
              break;
            case "r":
              b.push(13);
              break;
            case "t":
              b.push(9);
              break;
            case "v":
              b.push(11);
              break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7": {
              const s = input.c;
              const t = input.take(2);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 8);
              if (Number.isNaN(n)) {
                return false;
              }
              b.push(n);
              break;
            }
            case "x": {
              const s = input.c;
              const t = input.take(2);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 16);
              if (Number.isNaN(n)) {
                return false;
              }
              b.push(n);
              break;
            }
            case "u": {
              const s = input.c;
              const t = input.take(4);
              if (t === false) {
                return false;
              }
              const n = parseInt(s + t, 16);
              if (Number.isNaN(n)) {
                return false;
              }
              const chunk = new Uint8Array(4);
              const view = new DataView(chunk.buffer);
              view.setInt32(0, n, true);
              b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
              break;
            }
            case "U": {
              const s = input.c;
              const t = input.take(8);
              if (t === false) {
                return false;
              }
              const tc = protoInt64.uEnc(s + t);
              const chunk = new Uint8Array(8);
              const view = new DataView(chunk.buffer);
              view.setInt32(0, tc.lo, true);
              view.setInt32(4, tc.hi, true);
              b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
              break;
            }
          }
        }
        break;
      default:
        b.push(input.c.charCodeAt(0));
    }
  }
  return new Uint8Array(b);
}
function* nestedTypes(desc) {
  switch (desc.kind) {
    case "file":
      for (const message of desc.messages) {
        yield message;
        yield* nestedTypes(message);
      }
      yield* desc.enums;
      yield* desc.services;
      yield* desc.extensions;
      break;
    case "message":
      for (const message of desc.nestedMessages) {
        yield message;
        yield* nestedTypes(message);
      }
      yield* desc.nestedEnums;
      yield* desc.nestedExtensions;
      break;
  }
}
function createFileRegistry(...args) {
  const registry = createBaseRegistry();
  if (!args.length) {
    return registry;
  }
  if ("$typeName" in args[0] && args[0].$typeName == "google.protobuf.FileDescriptorSet") {
    for (const file of args[0].file) {
      addFile(file, registry);
    }
    return registry;
  }
  if ("$typeName" in args[0]) {
    let recurseDeps = function(file) {
      const deps = [];
      for (const protoFileName of file.dependency) {
        if (registry.getFile(protoFileName) != null) {
          continue;
        }
        if (seen.has(protoFileName)) {
          continue;
        }
        const dep = resolve(protoFileName);
        if (!dep) {
          throw new Error(`Unable to resolve ${protoFileName}, imported by ${file.name}`);
        }
        if ("kind" in dep) {
          registry.addFile(dep, false, true);
        } else {
          seen.add(dep.name);
          deps.push(dep);
        }
      }
      return deps.concat(...deps.map(recurseDeps));
    };
    const input = args[0];
    const resolve = args[1];
    const seen = new Set;
    for (const file of [input, ...recurseDeps(input)].reverse()) {
      addFile(file, registry);
    }
  } else {
    for (const fileReg of args) {
      for (const file of fileReg.files) {
        registry.addFile(file);
      }
    }
  }
  return registry;
}
function createBaseRegistry() {
  const types = new Map;
  const extendees = new Map;
  const files = new Map;
  return {
    kind: "registry",
    types,
    extendees,
    [Symbol.iterator]() {
      return types.values();
    },
    get files() {
      return files.values();
    },
    addFile(file, skipTypes, withDeps) {
      files.set(file.proto.name, file);
      if (!skipTypes) {
        for (const type of nestedTypes(file)) {
          this.add(type);
        }
      }
      if (withDeps) {
        for (const f of file.dependencies) {
          this.addFile(f, skipTypes, withDeps);
        }
      }
    },
    add(desc) {
      if (desc.kind == "extension") {
        let numberToExt = extendees.get(desc.extendee.typeName);
        if (!numberToExt) {
          extendees.set(desc.extendee.typeName, numberToExt = new Map);
        }
        numberToExt.set(desc.number, desc);
      }
      types.set(desc.typeName, desc);
    },
    get(typeName) {
      return types.get(typeName);
    },
    getFile(fileName) {
      return files.get(fileName);
    },
    getMessage(typeName) {
      const t = types.get(typeName);
      return (t === null || t === undefined ? undefined : t.kind) == "message" ? t : undefined;
    },
    getEnum(typeName) {
      const t = types.get(typeName);
      return (t === null || t === undefined ? undefined : t.kind) == "enum" ? t : undefined;
    },
    getExtension(typeName) {
      const t = types.get(typeName);
      return (t === null || t === undefined ? undefined : t.kind) == "extension" ? t : undefined;
    },
    getExtensionFor(extendee, no) {
      var _a;
      return (_a = extendees.get(extendee.typeName)) === null || _a === undefined ? undefined : _a.get(no);
    },
    getService(typeName) {
      const t = types.get(typeName);
      return (t === null || t === undefined ? undefined : t.kind) == "service" ? t : undefined;
    }
  };
}
var EDITION_PROTO22 = 998;
var EDITION_PROTO32 = 999;
var TYPE_STRING = 9;
var TYPE_GROUP = 10;
var TYPE_MESSAGE = 11;
var TYPE_BYTES = 12;
var TYPE_ENUM = 14;
var LABEL_REPEATED = 3;
var LABEL_REQUIRED = 2;
var JS_STRING = 1;
var IDEMPOTENCY_UNKNOWN = 0;
var EXPLICIT = 1;
var IMPLICIT3 = 2;
var LEGACY_REQUIRED = 3;
var PACKED = 1;
var DELIMITED = 2;
var OPEN = 1;
var featureDefaults = {
  998: {
    fieldPresence: 1,
    enumType: 2,
    repeatedFieldEncoding: 2,
    utf8Validation: 3,
    messageEncoding: 1,
    jsonFormat: 2,
    enforceNamingStyle: 2,
    defaultSymbolVisibility: 1
  },
  999: {
    fieldPresence: 2,
    enumType: 1,
    repeatedFieldEncoding: 1,
    utf8Validation: 2,
    messageEncoding: 1,
    jsonFormat: 1,
    enforceNamingStyle: 2,
    defaultSymbolVisibility: 1
  },
  1000: {
    fieldPresence: 1,
    enumType: 1,
    repeatedFieldEncoding: 1,
    utf8Validation: 2,
    messageEncoding: 1,
    jsonFormat: 1,
    enforceNamingStyle: 2,
    defaultSymbolVisibility: 1
  }
};
function addFile(proto, reg) {
  var _a, _b;
  const file = {
    kind: "file",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    edition: getFileEdition(proto),
    name: proto.name.replace(/\.proto$/, ""),
    dependencies: findFileDependencies(proto, reg),
    enums: [],
    messages: [],
    extensions: [],
    services: [],
    toString() {
      return `file ${proto.name}`;
    }
  };
  const mapEntriesStore = new Map;
  const mapEntries = {
    get(typeName) {
      return mapEntriesStore.get(typeName);
    },
    add(desc) {
      var _a2;
      assert(((_a2 = desc.proto.options) === null || _a2 === undefined ? undefined : _a2.mapEntry) === true);
      mapEntriesStore.set(desc.typeName, desc);
    }
  };
  for (const enumProto of proto.enumType) {
    addEnum(enumProto, file, undefined, reg);
  }
  for (const messageProto of proto.messageType) {
    addMessage(messageProto, file, undefined, reg, mapEntries);
  }
  for (const serviceProto of proto.service) {
    addService(serviceProto, file, reg);
  }
  addExtensions(file, reg);
  for (const mapEntry of mapEntriesStore.values()) {
    addFields(mapEntry, reg, mapEntries);
  }
  for (const message of file.messages) {
    addFields(message, reg, mapEntries);
    addExtensions(message, reg);
  }
  reg.addFile(file, true);
}
function addExtensions(desc, reg) {
  switch (desc.kind) {
    case "file":
      for (const proto of desc.proto.extension) {
        const ext = newField(proto, desc, reg);
        desc.extensions.push(ext);
        reg.add(ext);
      }
      break;
    case "message":
      for (const proto of desc.proto.extension) {
        const ext = newField(proto, desc, reg);
        desc.nestedExtensions.push(ext);
        reg.add(ext);
      }
      for (const message of desc.nestedMessages) {
        addExtensions(message, reg);
      }
      break;
  }
}
function addFields(message, reg, mapEntries) {
  const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
  const oneofsSeen = new Set;
  for (const proto of message.proto.field) {
    const oneof = findOneof(proto, allOneofs);
    const field = newField(proto, message, reg, oneof, mapEntries);
    message.fields.push(field);
    message.field[field.localName] = field;
    if (oneof === undefined) {
      message.members.push(field);
    } else {
      oneof.fields.push(field);
      if (!oneofsSeen.has(oneof)) {
        oneofsSeen.add(oneof);
        message.members.push(oneof);
      }
    }
  }
  for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) {
    message.oneofs.push(oneof);
  }
  for (const child of message.nestedMessages) {
    addFields(child, reg, mapEntries);
  }
}
function addEnum(proto, file, parent, reg) {
  var _a, _b, _c, _d, _e;
  const sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
  const desc = {
    kind: "enum",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    file,
    parent,
    open: true,
    name: proto.name,
    typeName: makeTypeName(proto, parent, file),
    value: {},
    values: [],
    sharedPrefix,
    toString() {
      return `enum ${this.typeName}`;
    }
  };
  desc.open = isEnumOpen(desc);
  reg.add(desc);
  for (const p of proto.value) {
    const name = p.name;
    desc.values.push(desc.value[p.number] = {
      kind: "enum_value",
      proto: p,
      deprecated: (_d = (_c = p.options) === null || _c === undefined ? undefined : _c.deprecated) !== null && _d !== undefined ? _d : false,
      parent: desc,
      name,
      localName: safeObjectProperty(sharedPrefix == undefined ? name : name.substring(sharedPrefix.length)),
      number: p.number,
      toString() {
        return `enum value ${desc.typeName}.${name}`;
      }
    });
  }
  ((_e = parent === null || parent === undefined ? undefined : parent.nestedEnums) !== null && _e !== undefined ? _e : file.enums).push(desc);
}
function addMessage(proto, file, parent, reg, mapEntries) {
  var _a, _b, _c, _d;
  const desc = {
    kind: "message",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    file,
    parent,
    name: proto.name,
    typeName: makeTypeName(proto, parent, file),
    fields: [],
    field: {},
    oneofs: [],
    members: [],
    nestedEnums: [],
    nestedMessages: [],
    nestedExtensions: [],
    toString() {
      return `message ${this.typeName}`;
    }
  };
  if (((_c = proto.options) === null || _c === undefined ? undefined : _c.mapEntry) === true) {
    mapEntries.add(desc);
  } else {
    ((_d = parent === null || parent === undefined ? undefined : parent.nestedMessages) !== null && _d !== undefined ? _d : file.messages).push(desc);
    reg.add(desc);
  }
  for (const enumProto of proto.enumType) {
    addEnum(enumProto, file, desc, reg);
  }
  for (const messageProto of proto.nestedType) {
    addMessage(messageProto, file, desc, reg, mapEntries);
  }
}
function addService(proto, file, reg) {
  var _a, _b;
  const desc = {
    kind: "service",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    file,
    name: proto.name,
    typeName: makeTypeName(proto, undefined, file),
    methods: [],
    method: {},
    toString() {
      return `service ${this.typeName}`;
    }
  };
  file.services.push(desc);
  reg.add(desc);
  for (const methodProto of proto.method) {
    const method = newMethod(methodProto, desc, reg);
    desc.methods.push(method);
    desc.method[method.localName] = method;
  }
}
function newMethod(proto, parent, reg) {
  var _a, _b, _c, _d;
  let methodKind;
  if (proto.clientStreaming && proto.serverStreaming) {
    methodKind = "bidi_streaming";
  } else if (proto.clientStreaming) {
    methodKind = "client_streaming";
  } else if (proto.serverStreaming) {
    methodKind = "server_streaming";
  } else {
    methodKind = "unary";
  }
  const input = reg.getMessage(trimLeadingDot(proto.inputType));
  const output = reg.getMessage(trimLeadingDot(proto.outputType));
  assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
  assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
  const name = proto.name;
  return {
    kind: "rpc",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    parent,
    name,
    localName: safeObjectProperty(name.length ? safeObjectProperty(name[0].toLowerCase() + name.substring(1)) : name),
    methodKind,
    input,
    output,
    idempotency: (_d = (_c = proto.options) === null || _c === undefined ? undefined : _c.idempotencyLevel) !== null && _d !== undefined ? _d : IDEMPOTENCY_UNKNOWN,
    toString() {
      return `rpc ${parent.typeName}.${name}`;
    }
  };
}
function newOneof(proto, parent) {
  return {
    kind: "oneof",
    proto,
    deprecated: false,
    parent,
    fields: [],
    name: proto.name,
    localName: safeObjectProperty(protoCamelCase(proto.name)),
    toString() {
      return `oneof ${parent.typeName}.${this.name}`;
    }
  };
}
function newField(proto, parentOrFile, reg, oneof, mapEntries) {
  var _a, _b, _c;
  const isExtension = mapEntries === undefined;
  const field = {
    kind: "field",
    proto,
    deprecated: (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null && _b !== undefined ? _b : false,
    name: proto.name,
    number: proto.number,
    scalar: undefined,
    message: undefined,
    enum: undefined,
    presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
    listKind: undefined,
    mapKind: undefined,
    mapKey: undefined,
    delimitedEncoding: undefined,
    packed: undefined,
    longAsString: false,
    getDefaultValue: undefined
  };
  if (isExtension) {
    const file = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
    const parent = parentOrFile.kind == "file" ? undefined : parentOrFile;
    const typeName = makeTypeName(proto, parent, file);
    field.kind = "extension";
    field.file = file;
    field.parent = parent;
    field.oneof = undefined;
    field.typeName = typeName;
    field.jsonName = `[${typeName}]`;
    field.toString = () => `extension ${typeName}`;
    const extendee = reg.getMessage(trimLeadingDot(proto.extendee));
    assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
    field.extendee = extendee;
  } else {
    const parent = parentOrFile;
    assert(parent.kind == "message");
    field.parent = parent;
    field.oneof = oneof;
    field.localName = oneof ? protoCamelCase(proto.name) : safeObjectProperty(protoCamelCase(proto.name));
    field.jsonName = proto.jsonName;
    field.toString = () => `field ${parent.typeName}.${proto.name}`;
  }
  const label = proto.label;
  const type = proto.type;
  const jstype = (_c = proto.options) === null || _c === undefined ? undefined : _c.jstype;
  if (label === LABEL_REPEATED) {
    const mapEntry = type == TYPE_MESSAGE ? mapEntries === null || mapEntries === undefined ? undefined : mapEntries.get(trimLeadingDot(proto.typeName)) : undefined;
    if (mapEntry) {
      field.fieldKind = "map";
      const { key, value } = findMapEntryFields(mapEntry);
      field.mapKey = key.scalar;
      field.mapKind = value.fieldKind;
      field.message = value.message;
      field.delimitedEncoding = false;
      field.enum = value.enum;
      field.scalar = value.scalar;
      return field;
    }
    field.fieldKind = "list";
    switch (type) {
      case TYPE_MESSAGE:
      case TYPE_GROUP:
        field.listKind = "message";
        field.message = reg.getMessage(trimLeadingDot(proto.typeName));
        assert(field.message);
        field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
        break;
      case TYPE_ENUM:
        field.listKind = "enum";
        field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
        assert(field.enum);
        break;
      default:
        field.listKind = "scalar";
        field.scalar = type;
        field.longAsString = jstype == JS_STRING;
        break;
    }
    field.packed = isPackedField(proto, parentOrFile);
    return field;
  }
  switch (type) {
    case TYPE_MESSAGE:
    case TYPE_GROUP:
      field.fieldKind = "message";
      field.message = reg.getMessage(trimLeadingDot(proto.typeName));
      assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
      field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
      field.getDefaultValue = () => {
        return;
      };
      break;
    case TYPE_ENUM: {
      const enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
      assert(enumeration !== undefined, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
      field.fieldKind = "enum";
      field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
      field.getDefaultValue = () => {
        return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatEnumValue(enumeration, proto.defaultValue) : undefined;
      };
      break;
    }
    default: {
      field.fieldKind = "scalar";
      field.scalar = type;
      field.longAsString = jstype == JS_STRING;
      field.getDefaultValue = () => {
        return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatScalarValue(type, proto.defaultValue) : undefined;
      };
      break;
    }
  }
  return field;
}
function getFileEdition(proto) {
  switch (proto.syntax) {
    case "":
    case "proto2":
      return EDITION_PROTO22;
    case "proto3":
      return EDITION_PROTO32;
    case "editions":
      if (proto.edition in featureDefaults) {
        return proto.edition;
      }
      throw new Error(`${proto.name}: unsupported edition`);
    default:
      throw new Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
  }
}
function findFileDependencies(proto, reg) {
  return proto.dependency.map((wantName) => {
    const dep = reg.getFile(wantName);
    if (!dep) {
      throw new Error(`Cannot find ${wantName}, imported by ${proto.name}`);
    }
    return dep;
  });
}
function findEnumSharedPrefix(enumName, values) {
  const prefix = camelToSnakeCase(enumName) + "_";
  for (const value of values) {
    if (!value.name.toLowerCase().startsWith(prefix)) {
      return;
    }
    const shortName = value.name.substring(prefix.length);
    if (shortName.length == 0) {
      return;
    }
    if (/^\d/.test(shortName)) {
      return;
    }
  }
  return prefix;
}
function camelToSnakeCase(camel) {
  return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
}
function makeTypeName(proto, parent, file) {
  let typeName;
  if (parent) {
    typeName = `${parent.typeName}.${proto.name}`;
  } else if (file.proto.package.length > 0) {
    typeName = `${file.proto.package}.${proto.name}`;
  } else {
    typeName = `${proto.name}`;
  }
  return typeName;
}
function trimLeadingDot(typeName) {
  return typeName.startsWith(".") ? typeName.substring(1) : typeName;
}
function findOneof(proto, allOneofs) {
  if (!unsafeIsSetExplicit(proto, "oneofIndex")) {
    return;
  }
  if (proto.proto3Optional) {
    return;
  }
  const oneof = allOneofs[proto.oneofIndex];
  assert(oneof, `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`);
  return oneof;
}
function getFieldPresence(proto, oneof, isExtension, parent) {
  if (proto.label == LABEL_REQUIRED) {
    return LEGACY_REQUIRED;
  }
  if (proto.label == LABEL_REPEATED) {
    return IMPLICIT3;
  }
  if (!!oneof || proto.proto3Optional) {
    return EXPLICIT;
  }
  if (isExtension) {
    return EXPLICIT;
  }
  const resolved = resolveFeature("fieldPresence", { proto, parent });
  if (resolved == IMPLICIT3 && (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) {
    return EXPLICIT;
  }
  return resolved;
}
function isPackedField(proto, parent) {
  if (proto.label != LABEL_REPEATED) {
    return false;
  }
  switch (proto.type) {
    case TYPE_STRING:
    case TYPE_BYTES:
    case TYPE_GROUP:
    case TYPE_MESSAGE:
      return false;
  }
  const o = proto.options;
  if (o && unsafeIsSetExplicit(o, "packed")) {
    return o.packed;
  }
  return PACKED == resolveFeature("repeatedFieldEncoding", {
    proto,
    parent
  });
}
function findMapEntryFields(mapEntry) {
  const key = mapEntry.fields.find((f) => f.number === 1);
  const value = mapEntry.fields.find((f) => f.number === 2);
  assert(key && key.fieldKind == "scalar" && key.scalar != ScalarType.BYTES && key.scalar != ScalarType.FLOAT && key.scalar != ScalarType.DOUBLE && value && value.fieldKind != "list" && value.fieldKind != "map");
  return { key, value };
}
function isEnumOpen(desc) {
  var _a;
  return OPEN == resolveFeature("enumType", {
    proto: desc.proto,
    parent: (_a = desc.parent) !== null && _a !== undefined ? _a : desc.file
  });
}
function isDelimitedEncoding(proto, parent) {
  if (proto.type == TYPE_GROUP) {
    return true;
  }
  return DELIMITED == resolveFeature("messageEncoding", {
    proto,
    parent
  });
}
function resolveFeature(name, ref) {
  var _a, _b;
  const featureSet = (_a = ref.proto.options) === null || _a === undefined ? undefined : _a.features;
  if (featureSet) {
    const val = featureSet[name];
    if (val != 0) {
      return val;
    }
  }
  if ("kind" in ref) {
    if (ref.kind == "message") {
      return resolveFeature(name, (_b = ref.parent) !== null && _b !== undefined ? _b : ref.file);
    }
    const editionDefaults = featureDefaults[ref.edition];
    if (!editionDefaults) {
      throw new Error(`feature default for edition ${ref.edition} not found`);
    }
    return editionDefaults[name];
  }
  return resolveFeature(name, ref.parent);
}
function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}
function boot(boot2) {
  const root = bootFileDescriptorProto(boot2);
  root.messageType.forEach(restoreJsonNames);
  const reg = createFileRegistry(root, () => {
    return;
  });
  return reg.getFile(root.name);
}
function bootFileDescriptorProto(init) {
  const proto = Object.create({
    syntax: "",
    edition: 0
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FileDescriptorProto", dependency: [], publicDependency: [], weakDependency: [], optionDependency: [], service: [], extension: [] }, init), { messageType: init.messageType.map(bootDescriptorProto), enumType: init.enumType.map(bootEnumDescriptorProto) }));
}
function bootDescriptorProto(init) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const proto = Object.create({
    visibility: 0
  });
  return Object.assign(proto, {
    $typeName: "google.protobuf.DescriptorProto",
    name: init.name,
    field: (_b = (_a = init.field) === null || _a === undefined ? undefined : _a.map(bootFieldDescriptorProto)) !== null && _b !== undefined ? _b : [],
    extension: [],
    nestedType: (_d = (_c = init.nestedType) === null || _c === undefined ? undefined : _c.map(bootDescriptorProto)) !== null && _d !== undefined ? _d : [],
    enumType: (_f = (_e = init.enumType) === null || _e === undefined ? undefined : _e.map(bootEnumDescriptorProto)) !== null && _f !== undefined ? _f : [],
    extensionRange: (_h = (_g = init.extensionRange) === null || _g === undefined ? undefined : _g.map((e) => Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, e))) !== null && _h !== undefined ? _h : [],
    oneofDecl: [],
    reservedRange: [],
    reservedName: []
  });
}
function bootFieldDescriptorProto(init) {
  const proto = Object.create({
    label: 1,
    typeName: "",
    extendee: "",
    defaultValue: "",
    oneofIndex: 0,
    jsonName: "",
    proto3Optional: false
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, init), { options: init.options ? bootFieldOptions(init.options) : undefined }));
}
function bootFieldOptions(init) {
  var _a, _b, _c;
  const proto = Object.create({
    ctype: 0,
    packed: false,
    jstype: 0,
    lazy: false,
    unverifiedLazy: false,
    deprecated: false,
    weak: false,
    debugRedact: false,
    retention: 0
  });
  return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, init), { targets: (_a = init.targets) !== null && _a !== undefined ? _a : [], editionDefaults: (_c = (_b = init.editionDefaults) === null || _b === undefined ? undefined : _b.map((e) => Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, e))) !== null && _c !== undefined ? _c : [], uninterpretedOption: [] }));
}
function bootEnumDescriptorProto(init) {
  const proto = Object.create({
    visibility: 0
  });
  return Object.assign(proto, {
    $typeName: "google.protobuf.EnumDescriptorProto",
    name: init.name,
    reservedName: [],
    reservedRange: [],
    value: init.value.map((e) => Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, e))
  });
}
function messageDesc(file, path, ...paths) {
  return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]);
}
var file_google_protobuf_descriptor = /* @__PURE__ */ boot({ name: "google/protobuf/descriptor.proto", package: "google.protobuf", messageType: [{ name: "FileDescriptorSet", field: [{ name: "file", number: 1, type: 11, label: 3, typeName: ".google.protobuf.FileDescriptorProto" }], extensionRange: [{ start: 536000000, end: 536000001 }] }, { name: "FileDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "package", number: 2, type: 9, label: 1 }, { name: "dependency", number: 3, type: 9, label: 3 }, { name: "public_dependency", number: 10, type: 5, label: 3 }, { name: "weak_dependency", number: 11, type: 5, label: 3 }, { name: "option_dependency", number: 15, type: 9, label: 3 }, { name: "message_type", number: 4, type: 11, label: 3, typeName: ".google.protobuf.DescriptorProto" }, { name: "enum_type", number: 5, type: 11, label: 3, typeName: ".google.protobuf.EnumDescriptorProto" }, { name: "service", number: 6, type: 11, label: 3, typeName: ".google.protobuf.ServiceDescriptorProto" }, { name: "extension", number: 7, type: 11, label: 3, typeName: ".google.protobuf.FieldDescriptorProto" }, { name: "options", number: 8, type: 11, label: 1, typeName: ".google.protobuf.FileOptions" }, { name: "source_code_info", number: 9, type: 11, label: 1, typeName: ".google.protobuf.SourceCodeInfo" }, { name: "syntax", number: 12, type: 9, label: 1 }, { name: "edition", number: 14, type: 14, label: 1, typeName: ".google.protobuf.Edition" }] }, { name: "DescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "field", number: 2, type: 11, label: 3, typeName: ".google.protobuf.FieldDescriptorProto" }, { name: "extension", number: 6, type: 11, label: 3, typeName: ".google.protobuf.FieldDescriptorProto" }, { name: "nested_type", number: 3, type: 11, label: 3, typeName: ".google.protobuf.DescriptorProto" }, { name: "enum_type", number: 4, type: 11, label: 3, typeName: ".google.protobuf.EnumDescriptorProto" }, { name: "extension_range", number: 5, type: 11, label: 3, typeName: ".google.protobuf.DescriptorProto.ExtensionRange" }, { name: "oneof_decl", number: 8, type: 11, label: 3, typeName: ".google.protobuf.OneofDescriptorProto" }, { name: "options", number: 7, type: 11, label: 1, typeName: ".google.protobuf.MessageOptions" }, { name: "reserved_range", number: 9, type: 11, label: 3, typeName: ".google.protobuf.DescriptorProto.ReservedRange" }, { name: "reserved_name", number: 10, type: 9, label: 3 }, { name: "visibility", number: 11, type: 14, label: 1, typeName: ".google.protobuf.SymbolVisibility" }], nestedType: [{ name: "ExtensionRange", field: [{ name: "start", number: 1, type: 5, label: 1 }, { name: "end", number: 2, type: 5, label: 1 }, { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.ExtensionRangeOptions" }] }, { name: "ReservedRange", field: [{ name: "start", number: 1, type: 5, label: 1 }, { name: "end", number: 2, type: 5, label: 1 }] }] }, { name: "ExtensionRangeOptions", field: [{ name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }, { name: "declaration", number: 2, type: 11, label: 3, typeName: ".google.protobuf.ExtensionRangeOptions.Declaration", options: { retention: 2 } }, { name: "features", number: 50, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "verification", number: 3, type: 14, label: 1, typeName: ".google.protobuf.ExtensionRangeOptions.VerificationState", defaultValue: "UNVERIFIED", options: { retention: 2 } }], nestedType: [{ name: "Declaration", field: [{ name: "number", number: 1, type: 5, label: 1 }, { name: "full_name", number: 2, type: 9, label: 1 }, { name: "type", number: 3, type: 9, label: 1 }, { name: "reserved", number: 5, type: 8, label: 1 }, { name: "repeated", number: 6, type: 8, label: 1 }] }], enumType: [{ name: "VerificationState", value: [{ name: "DECLARATION", number: 0 }, { name: "UNVERIFIED", number: 1 }] }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "FieldDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "number", number: 3, type: 5, label: 1 }, { name: "label", number: 4, type: 14, label: 1, typeName: ".google.protobuf.FieldDescriptorProto.Label" }, { name: "type", number: 5, type: 14, label: 1, typeName: ".google.protobuf.FieldDescriptorProto.Type" }, { name: "type_name", number: 6, type: 9, label: 1 }, { name: "extendee", number: 2, type: 9, label: 1 }, { name: "default_value", number: 7, type: 9, label: 1 }, { name: "oneof_index", number: 9, type: 5, label: 1 }, { name: "json_name", number: 10, type: 9, label: 1 }, { name: "options", number: 8, type: 11, label: 1, typeName: ".google.protobuf.FieldOptions" }, { name: "proto3_optional", number: 17, type: 8, label: 1 }], enumType: [{ name: "Type", value: [{ name: "TYPE_DOUBLE", number: 1 }, { name: "TYPE_FLOAT", number: 2 }, { name: "TYPE_INT64", number: 3 }, { name: "TYPE_UINT64", number: 4 }, { name: "TYPE_INT32", number: 5 }, { name: "TYPE_FIXED64", number: 6 }, { name: "TYPE_FIXED32", number: 7 }, { name: "TYPE_BOOL", number: 8 }, { name: "TYPE_STRING", number: 9 }, { name: "TYPE_GROUP", number: 10 }, { name: "TYPE_MESSAGE", number: 11 }, { name: "TYPE_BYTES", number: 12 }, { name: "TYPE_UINT32", number: 13 }, { name: "TYPE_ENUM", number: 14 }, { name: "TYPE_SFIXED32", number: 15 }, { name: "TYPE_SFIXED64", number: 16 }, { name: "TYPE_SINT32", number: 17 }, { name: "TYPE_SINT64", number: 18 }] }, { name: "Label", value: [{ name: "LABEL_OPTIONAL", number: 1 }, { name: "LABEL_REPEATED", number: 3 }, { name: "LABEL_REQUIRED", number: 2 }] }] }, { name: "OneofDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "options", number: 2, type: 11, label: 1, typeName: ".google.protobuf.OneofOptions" }] }, { name: "EnumDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "value", number: 2, type: 11, label: 3, typeName: ".google.protobuf.EnumValueDescriptorProto" }, { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.EnumOptions" }, { name: "reserved_range", number: 4, type: 11, label: 3, typeName: ".google.protobuf.EnumDescriptorProto.EnumReservedRange" }, { name: "reserved_name", number: 5, type: 9, label: 3 }, { name: "visibility", number: 6, type: 14, label: 1, typeName: ".google.protobuf.SymbolVisibility" }], nestedType: [{ name: "EnumReservedRange", field: [{ name: "start", number: 1, type: 5, label: 1 }, { name: "end", number: 2, type: 5, label: 1 }] }] }, { name: "EnumValueDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "number", number: 2, type: 5, label: 1 }, { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.EnumValueOptions" }] }, { name: "ServiceDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "method", number: 2, type: 11, label: 3, typeName: ".google.protobuf.MethodDescriptorProto" }, { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.ServiceOptions" }] }, { name: "MethodDescriptorProto", field: [{ name: "name", number: 1, type: 9, label: 1 }, { name: "input_type", number: 2, type: 9, label: 1 }, { name: "output_type", number: 3, type: 9, label: 1 }, { name: "options", number: 4, type: 11, label: 1, typeName: ".google.protobuf.MethodOptions" }, { name: "client_streaming", number: 5, type: 8, label: 1, defaultValue: "false" }, { name: "server_streaming", number: 6, type: 8, label: 1, defaultValue: "false" }] }, { name: "FileOptions", field: [{ name: "java_package", number: 1, type: 9, label: 1 }, { name: "java_outer_classname", number: 8, type: 9, label: 1 }, { name: "java_multiple_files", number: 10, type: 8, label: 1, defaultValue: "false" }, { name: "java_generate_equals_and_hash", number: 20, type: 8, label: 1, options: { deprecated: true } }, { name: "java_string_check_utf8", number: 27, type: 8, label: 1, defaultValue: "false" }, { name: "optimize_for", number: 9, type: 14, label: 1, typeName: ".google.protobuf.FileOptions.OptimizeMode", defaultValue: "SPEED" }, { name: "go_package", number: 11, type: 9, label: 1 }, { name: "cc_generic_services", number: 16, type: 8, label: 1, defaultValue: "false" }, { name: "java_generic_services", number: 17, type: 8, label: 1, defaultValue: "false" }, { name: "py_generic_services", number: 18, type: 8, label: 1, defaultValue: "false" }, { name: "deprecated", number: 23, type: 8, label: 1, defaultValue: "false" }, { name: "cc_enable_arenas", number: 31, type: 8, label: 1, defaultValue: "true" }, { name: "objc_class_prefix", number: 36, type: 9, label: 1 }, { name: "csharp_namespace", number: 37, type: 9, label: 1 }, { name: "swift_prefix", number: 39, type: 9, label: 1 }, { name: "php_class_prefix", number: 40, type: 9, label: 1 }, { name: "php_namespace", number: 41, type: 9, label: 1 }, { name: "php_metadata_namespace", number: 44, type: 9, label: 1 }, { name: "ruby_package", number: 45, type: 9, label: 1 }, { name: "features", number: 50, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], enumType: [{ name: "OptimizeMode", value: [{ name: "SPEED", number: 1 }, { name: "CODE_SIZE", number: 2 }, { name: "LITE_RUNTIME", number: 3 }] }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "MessageOptions", field: [{ name: "message_set_wire_format", number: 1, type: 8, label: 1, defaultValue: "false" }, { name: "no_standard_descriptor_accessor", number: 2, type: 8, label: 1, defaultValue: "false" }, { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" }, { name: "map_entry", number: 7, type: 8, label: 1 }, { name: "deprecated_legacy_json_field_conflicts", number: 11, type: 8, label: 1, options: { deprecated: true } }, { name: "features", number: 12, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "FieldOptions", field: [{ name: "ctype", number: 1, type: 14, label: 1, typeName: ".google.protobuf.FieldOptions.CType", defaultValue: "STRING" }, { name: "packed", number: 2, type: 8, label: 1 }, { name: "jstype", number: 6, type: 14, label: 1, typeName: ".google.protobuf.FieldOptions.JSType", defaultValue: "JS_NORMAL" }, { name: "lazy", number: 5, type: 8, label: 1, defaultValue: "false" }, { name: "unverified_lazy", number: 15, type: 8, label: 1, defaultValue: "false" }, { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" }, { name: "weak", number: 10, type: 8, label: 1, defaultValue: "false" }, { name: "debug_redact", number: 16, type: 8, label: 1, defaultValue: "false" }, { name: "retention", number: 17, type: 14, label: 1, typeName: ".google.protobuf.FieldOptions.OptionRetention" }, { name: "targets", number: 19, type: 14, label: 3, typeName: ".google.protobuf.FieldOptions.OptionTargetType" }, { name: "edition_defaults", number: 20, type: 11, label: 3, typeName: ".google.protobuf.FieldOptions.EditionDefault" }, { name: "features", number: 21, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "feature_support", number: 22, type: 11, label: 1, typeName: ".google.protobuf.FieldOptions.FeatureSupport" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], nestedType: [{ name: "EditionDefault", field: [{ name: "edition", number: 3, type: 14, label: 1, typeName: ".google.protobuf.Edition" }, { name: "value", number: 2, type: 9, label: 1 }] }, { name: "FeatureSupport", field: [{ name: "edition_introduced", number: 1, type: 14, label: 1, typeName: ".google.protobuf.Edition" }, { name: "edition_deprecated", number: 2, type: 14, label: 1, typeName: ".google.protobuf.Edition" }, { name: "deprecation_warning", number: 3, type: 9, label: 1 }, { name: "edition_removed", number: 4, type: 14, label: 1, typeName: ".google.protobuf.Edition" }] }], enumType: [{ name: "CType", value: [{ name: "STRING", number: 0 }, { name: "CORD", number: 1 }, { name: "STRING_PIECE", number: 2 }] }, { name: "JSType", value: [{ name: "JS_NORMAL", number: 0 }, { name: "JS_STRING", number: 1 }, { name: "JS_NUMBER", number: 2 }] }, { name: "OptionRetention", value: [{ name: "RETENTION_UNKNOWN", number: 0 }, { name: "RETENTION_RUNTIME", number: 1 }, { name: "RETENTION_SOURCE", number: 2 }] }, { name: "OptionTargetType", value: [{ name: "TARGET_TYPE_UNKNOWN", number: 0 }, { name: "TARGET_TYPE_FILE", number: 1 }, { name: "TARGET_TYPE_EXTENSION_RANGE", number: 2 }, { name: "TARGET_TYPE_MESSAGE", number: 3 }, { name: "TARGET_TYPE_FIELD", number: 4 }, { name: "TARGET_TYPE_ONEOF", number: 5 }, { name: "TARGET_TYPE_ENUM", number: 6 }, { name: "TARGET_TYPE_ENUM_ENTRY", number: 7 }, { name: "TARGET_TYPE_SERVICE", number: 8 }, { name: "TARGET_TYPE_METHOD", number: 9 }] }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "OneofOptions", field: [{ name: "features", number: 1, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "EnumOptions", field: [{ name: "allow_alias", number: 2, type: 8, label: 1 }, { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" }, { name: "deprecated_legacy_json_field_conflicts", number: 6, type: 8, label: 1, options: { deprecated: true } }, { name: "features", number: 7, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "EnumValueOptions", field: [{ name: "deprecated", number: 1, type: 8, label: 1, defaultValue: "false" }, { name: "features", number: 2, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "debug_redact", number: 3, type: 8, label: 1, defaultValue: "false" }, { name: "feature_support", number: 4, type: 11, label: 1, typeName: ".google.protobuf.FieldOptions.FeatureSupport" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "ServiceOptions", field: [{ name: "features", number: 34, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "deprecated", number: 33, type: 8, label: 1, defaultValue: "false" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "MethodOptions", field: [{ name: "deprecated", number: 33, type: 8, label: 1, defaultValue: "false" }, { name: "idempotency_level", number: 34, type: 14, label: 1, typeName: ".google.protobuf.MethodOptions.IdempotencyLevel", defaultValue: "IDEMPOTENCY_UNKNOWN" }, { name: "features", number: 35, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "uninterpreted_option", number: 999, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption" }], enumType: [{ name: "IdempotencyLevel", value: [{ name: "IDEMPOTENCY_UNKNOWN", number: 0 }, { name: "NO_SIDE_EFFECTS", number: 1 }, { name: "IDEMPOTENT", number: 2 }] }], extensionRange: [{ start: 1000, end: 536870912 }] }, { name: "UninterpretedOption", field: [{ name: "name", number: 2, type: 11, label: 3, typeName: ".google.protobuf.UninterpretedOption.NamePart" }, { name: "identifier_value", number: 3, type: 9, label: 1 }, { name: "positive_int_value", number: 4, type: 4, label: 1 }, { name: "negative_int_value", number: 5, type: 3, label: 1 }, { name: "double_value", number: 6, type: 1, label: 1 }, { name: "string_value", number: 7, type: 12, label: 1 }, { name: "aggregate_value", number: 8, type: 9, label: 1 }], nestedType: [{ name: "NamePart", field: [{ name: "name_part", number: 1, type: 9, label: 2 }, { name: "is_extension", number: 2, type: 8, label: 2 }] }] }, { name: "FeatureSet", field: [{ name: "field_presence", number: 1, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.FieldPresence", options: { retention: 1, targets: [4, 1], editionDefaults: [{ value: "EXPLICIT", edition: 900 }, { value: "IMPLICIT", edition: 999 }, { value: "EXPLICIT", edition: 1000 }] } }, { name: "enum_type", number: 2, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.EnumType", options: { retention: 1, targets: [6, 1], editionDefaults: [{ value: "CLOSED", edition: 900 }, { value: "OPEN", edition: 999 }] } }, { name: "repeated_field_encoding", number: 3, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.RepeatedFieldEncoding", options: { retention: 1, targets: [4, 1], editionDefaults: [{ value: "EXPANDED", edition: 900 }, { value: "PACKED", edition: 999 }] } }, { name: "utf8_validation", number: 4, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.Utf8Validation", options: { retention: 1, targets: [4, 1], editionDefaults: [{ value: "NONE", edition: 900 }, { value: "VERIFY", edition: 999 }] } }, { name: "message_encoding", number: 5, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.MessageEncoding", options: { retention: 1, targets: [4, 1], editionDefaults: [{ value: "LENGTH_PREFIXED", edition: 900 }] } }, { name: "json_format", number: 6, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.JsonFormat", options: { retention: 1, targets: [3, 6, 1], editionDefaults: [{ value: "LEGACY_BEST_EFFORT", edition: 900 }, { value: "ALLOW", edition: 999 }] } }, { name: "enforce_naming_style", number: 7, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.EnforceNamingStyle", options: { retention: 2, targets: [1, 2, 3, 4, 5, 6, 7, 8, 9], editionDefaults: [{ value: "STYLE_LEGACY", edition: 900 }, { value: "STYLE2024", edition: 1001 }] } }, { name: "default_symbol_visibility", number: 8, type: 14, label: 1, typeName: ".google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility", options: { retention: 2, targets: [1], editionDefaults: [{ value: "EXPORT_ALL", edition: 900 }, { value: "EXPORT_TOP_LEVEL", edition: 1001 }] } }], nestedType: [{ name: "VisibilityFeature", enumType: [{ name: "DefaultSymbolVisibility", value: [{ name: "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN", number: 0 }, { name: "EXPORT_ALL", number: 1 }, { name: "EXPORT_TOP_LEVEL", number: 2 }, { name: "LOCAL_ALL", number: 3 }, { name: "STRICT", number: 4 }] }] }], enumType: [{ name: "FieldPresence", value: [{ name: "FIELD_PRESENCE_UNKNOWN", number: 0 }, { name: "EXPLICIT", number: 1 }, { name: "IMPLICIT", number: 2 }, { name: "LEGACY_REQUIRED", number: 3 }] }, { name: "EnumType", value: [{ name: "ENUM_TYPE_UNKNOWN", number: 0 }, { name: "OPEN", number: 1 }, { name: "CLOSED", number: 2 }] }, { name: "RepeatedFieldEncoding", value: [{ name: "REPEATED_FIELD_ENCODING_UNKNOWN", number: 0 }, { name: "PACKED", number: 1 }, { name: "EXPANDED", number: 2 }] }, { name: "Utf8Validation", value: [{ name: "UTF8_VALIDATION_UNKNOWN", number: 0 }, { name: "VERIFY", number: 2 }, { name: "NONE", number: 3 }] }, { name: "MessageEncoding", value: [{ name: "MESSAGE_ENCODING_UNKNOWN", number: 0 }, { name: "LENGTH_PREFIXED", number: 1 }, { name: "DELIMITED", number: 2 }] }, { name: "JsonFormat", value: [{ name: "JSON_FORMAT_UNKNOWN", number: 0 }, { name: "ALLOW", number: 1 }, { name: "LEGACY_BEST_EFFORT", number: 2 }] }, { name: "EnforceNamingStyle", value: [{ name: "ENFORCE_NAMING_STYLE_UNKNOWN", number: 0 }, { name: "STYLE2024", number: 1 }, { name: "STYLE_LEGACY", number: 2 }] }], extensionRange: [{ start: 1000, end: 9995 }, { start: 9995, end: 1e4 }, { start: 1e4, end: 10001 }] }, { name: "FeatureSetDefaults", field: [{ name: "defaults", number: 1, type: 11, label: 3, typeName: ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault" }, { name: "minimum_edition", number: 4, type: 14, label: 1, typeName: ".google.protobuf.Edition" }, { name: "maximum_edition", number: 5, type: 14, label: 1, typeName: ".google.protobuf.Edition" }], nestedType: [{ name: "FeatureSetEditionDefault", field: [{ name: "edition", number: 3, type: 14, label: 1, typeName: ".google.protobuf.Edition" }, { name: "overridable_features", number: 4, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }, { name: "fixed_features", number: 5, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" }] }] }, { name: "SourceCodeInfo", field: [{ name: "location", number: 1, type: 11, label: 3, typeName: ".google.protobuf.SourceCodeInfo.Location" }], nestedType: [{ name: "Location", field: [{ name: "path", number: 1, type: 5, label: 3, options: { packed: true } }, { name: "span", number: 2, type: 5, label: 3, options: { packed: true } }, { name: "leading_comments", number: 3, type: 9, label: 1 }, { name: "trailing_comments", number: 4, type: 9, label: 1 }, { name: "leading_detached_comments", number: 6, type: 9, label: 3 }] }], extensionRange: [{ start: 536000000, end: 536000001 }] }, { name: "GeneratedCodeInfo", field: [{ name: "annotation", number: 1, type: 11, label: 3, typeName: ".google.protobuf.GeneratedCodeInfo.Annotation" }], nestedType: [{ name: "Annotation", field: [{ name: "path", number: 1, type: 5, label: 3, options: { packed: true } }, { name: "source_file", number: 2, type: 9, label: 1 }, { name: "begin", number: 3, type: 5, label: 1 }, { name: "end", number: 4, type: 5, label: 1 }, { name: "semantic", number: 5, type: 14, label: 1, typeName: ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic" }], enumType: [{ name: "Semantic", value: [{ name: "NONE", number: 0 }, { name: "SET", number: 1 }, { name: "ALIAS", number: 2 }] }] }] }], enumType: [{ name: "Edition", value: [{ name: "EDITION_UNKNOWN", number: 0 }, { name: "EDITION_LEGACY", number: 900 }, { name: "EDITION_PROTO2", number: 998 }, { name: "EDITION_PROTO3", number: 999 }, { name: "EDITION_2023", number: 1000 }, { name: "EDITION_2024", number: 1001 }, { name: "EDITION_1_TEST_ONLY", number: 1 }, { name: "EDITION_2_TEST_ONLY", number: 2 }, { name: "EDITION_99997_TEST_ONLY", number: 99997 }, { name: "EDITION_99998_TEST_ONLY", number: 99998 }, { name: "EDITION_99999_TEST_ONLY", number: 99999 }, { name: "EDITION_MAX", number: 2147483647 }] }, { name: "SymbolVisibility", value: [{ name: "VISIBILITY_UNSET", number: 0 }, { name: "VISIBILITY_LOCAL", number: 1 }, { name: "VISIBILITY_EXPORT", number: 2 }] }] });
var FileDescriptorProtoSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_descriptor, 1);
var ExtensionRangeOptions_VerificationState;
(function(ExtensionRangeOptions_VerificationState2) {
  ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["DECLARATION"] = 0] = "DECLARATION";
  ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["UNVERIFIED"] = 1] = "UNVERIFIED";
})(ExtensionRangeOptions_VerificationState || (ExtensionRangeOptions_VerificationState = {}));
var FieldDescriptorProto_Type;
(function(FieldDescriptorProto_Type2) {
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["DOUBLE"] = 1] = "DOUBLE";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FLOAT"] = 2] = "FLOAT";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT64"] = 3] = "INT64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT64"] = 4] = "UINT64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT32"] = 5] = "INT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED64"] = 6] = "FIXED64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED32"] = 7] = "FIXED32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BOOL"] = 8] = "BOOL";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["STRING"] = 9] = "STRING";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["GROUP"] = 10] = "GROUP";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["MESSAGE"] = 11] = "MESSAGE";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BYTES"] = 12] = "BYTES";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT32"] = 13] = "UINT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["ENUM"] = 14] = "ENUM";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED32"] = 15] = "SFIXED32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED64"] = 16] = "SFIXED64";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT32"] = 17] = "SINT32";
  FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT64"] = 18] = "SINT64";
})(FieldDescriptorProto_Type || (FieldDescriptorProto_Type = {}));
var FieldDescriptorProto_Label;
(function(FieldDescriptorProto_Label2) {
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["OPTIONAL"] = 1] = "OPTIONAL";
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REPEATED"] = 3] = "REPEATED";
  FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REQUIRED"] = 2] = "REQUIRED";
})(FieldDescriptorProto_Label || (FieldDescriptorProto_Label = {}));
var FileOptions_OptimizeMode;
(function(FileOptions_OptimizeMode2) {
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["SPEED"] = 1] = "SPEED";
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["CODE_SIZE"] = 2] = "CODE_SIZE";
  FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
})(FileOptions_OptimizeMode || (FileOptions_OptimizeMode = {}));
var FieldOptions_CType;
(function(FieldOptions_CType2) {
  FieldOptions_CType2[FieldOptions_CType2["STRING"] = 0] = "STRING";
  FieldOptions_CType2[FieldOptions_CType2["CORD"] = 1] = "CORD";
  FieldOptions_CType2[FieldOptions_CType2["STRING_PIECE"] = 2] = "STRING_PIECE";
})(FieldOptions_CType || (FieldOptions_CType = {}));
var FieldOptions_JSType;
(function(FieldOptions_JSType2) {
  FieldOptions_JSType2[FieldOptions_JSType2["JS_NORMAL"] = 0] = "JS_NORMAL";
  FieldOptions_JSType2[FieldOptions_JSType2["JS_STRING"] = 1] = "JS_STRING";
  FieldOptions_JSType2[FieldOptions_JSType2["JS_NUMBER"] = 2] = "JS_NUMBER";
})(FieldOptions_JSType || (FieldOptions_JSType = {}));
var FieldOptions_OptionRetention;
(function(FieldOptions_OptionRetention2) {
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
  FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
})(FieldOptions_OptionRetention || (FieldOptions_OptionRetention = {}));
var FieldOptions_OptionTargetType;
(function(FieldOptions_OptionTargetType2) {
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
  FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
})(FieldOptions_OptionTargetType || (FieldOptions_OptionTargetType = {}));
var MethodOptions_IdempotencyLevel;
(function(MethodOptions_IdempotencyLevel2) {
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
  MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENT"] = 2] = "IDEMPOTENT";
})(MethodOptions_IdempotencyLevel || (MethodOptions_IdempotencyLevel = {}));
var FeatureSet_VisibilityFeature_DefaultSymbolVisibility;
(function(FeatureSet_VisibilityFeature_DefaultSymbolVisibility2) {
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["DEFAULT_SYMBOL_VISIBILITY_UNKNOWN"] = 0] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_ALL"] = 1] = "EXPORT_ALL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_TOP_LEVEL"] = 2] = "EXPORT_TOP_LEVEL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["LOCAL_ALL"] = 3] = "LOCAL_ALL";
  FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["STRICT"] = 4] = "STRICT";
})(FeatureSet_VisibilityFeature_DefaultSymbolVisibility || (FeatureSet_VisibilityFeature_DefaultSymbolVisibility = {}));
var FeatureSet_FieldPresence;
(function(FeatureSet_FieldPresence2) {
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["EXPLICIT"] = 1] = "EXPLICIT";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["IMPLICIT"] = 2] = "IMPLICIT";
  FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
})(FeatureSet_FieldPresence || (FeatureSet_FieldPresence = {}));
var FeatureSet_EnumType;
(function(FeatureSet_EnumType2) {
  FeatureSet_EnumType2[FeatureSet_EnumType2["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
  FeatureSet_EnumType2[FeatureSet_EnumType2["OPEN"] = 1] = "OPEN";
  FeatureSet_EnumType2[FeatureSet_EnumType2["CLOSED"] = 2] = "CLOSED";
})(FeatureSet_EnumType || (FeatureSet_EnumType = {}));
var FeatureSet_RepeatedFieldEncoding;
(function(FeatureSet_RepeatedFieldEncoding2) {
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["PACKED"] = 1] = "PACKED";
  FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["EXPANDED"] = 2] = "EXPANDED";
})(FeatureSet_RepeatedFieldEncoding || (FeatureSet_RepeatedFieldEncoding = {}));
var FeatureSet_Utf8Validation;
(function(FeatureSet_Utf8Validation2) {
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["VERIFY"] = 2] = "VERIFY";
  FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["NONE"] = 3] = "NONE";
})(FeatureSet_Utf8Validation || (FeatureSet_Utf8Validation = {}));
var FeatureSet_MessageEncoding;
(function(FeatureSet_MessageEncoding2) {
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
  FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["DELIMITED"] = 2] = "DELIMITED";
})(FeatureSet_MessageEncoding || (FeatureSet_MessageEncoding = {}));
var FeatureSet_JsonFormat;
(function(FeatureSet_JsonFormat2) {
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["ALLOW"] = 1] = "ALLOW";
  FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
})(FeatureSet_JsonFormat || (FeatureSet_JsonFormat = {}));
var FeatureSet_EnforceNamingStyle;
(function(FeatureSet_EnforceNamingStyle2) {
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["ENFORCE_NAMING_STYLE_UNKNOWN"] = 0] = "ENFORCE_NAMING_STYLE_UNKNOWN";
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE2024"] = 1] = "STYLE2024";
  FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE_LEGACY"] = 2] = "STYLE_LEGACY";
})(FeatureSet_EnforceNamingStyle || (FeatureSet_EnforceNamingStyle = {}));
var GeneratedCodeInfo_Annotation_Semantic;
(function(GeneratedCodeInfo_Annotation_Semantic2) {
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["NONE"] = 0] = "NONE";
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["SET"] = 1] = "SET";
  GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["ALIAS"] = 2] = "ALIAS";
})(GeneratedCodeInfo_Annotation_Semantic || (GeneratedCodeInfo_Annotation_Semantic = {}));
var Edition;
(function(Edition2) {
  Edition2[Edition2["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
  Edition2[Edition2["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
  Edition2[Edition2["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
  Edition2[Edition2["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
  Edition2[Edition2["EDITION_2023"] = 1000] = "EDITION_2023";
  Edition2[Edition2["EDITION_2024"] = 1001] = "EDITION_2024";
  Edition2[Edition2["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
  Edition2[Edition2["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
  Edition2[Edition2["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
  Edition2[Edition2["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
  Edition2[Edition2["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
  Edition2[Edition2["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
})(Edition || (Edition = {}));
var SymbolVisibility;
(function(SymbolVisibility2) {
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_UNSET"] = 0] = "VISIBILITY_UNSET";
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_LOCAL"] = 1] = "VISIBILITY_LOCAL";
  SymbolVisibility2[SymbolVisibility2["VISIBILITY_EXPORT"] = 2] = "VISIBILITY_EXPORT";
})(SymbolVisibility || (SymbolVisibility = {}));
var readDefaults = {
  readUnknownFields: true
};
function makeReadOptions(options) {
  return options ? Object.assign(Object.assign({}, readDefaults), options) : readDefaults;
}
function fromBinary(schema, bytes, options) {
  const msg = reflect(schema, undefined, false);
  readMessage(msg, new BinaryReader(bytes), makeReadOptions(options), false, bytes.byteLength);
  return msg.message;
}
function readMessage(message, reader, options, delimited, lengthOrDelimitedFieldNo) {
  var _a;
  const end = delimited ? reader.len : reader.pos + lengthOrDelimitedFieldNo;
  let fieldNo;
  let wireType;
  const unknownFields = (_a = message.getUnknown()) !== null && _a !== undefined ? _a : [];
  while (reader.pos < end) {
    [fieldNo, wireType] = reader.tag();
    if (delimited && wireType == WireType.EndGroup) {
      break;
    }
    const field = message.findNumber(fieldNo);
    if (!field) {
      const data = reader.skip(wireType, fieldNo);
      if (options.readUnknownFields) {
        unknownFields.push({ no: fieldNo, wireType, data });
      }
      continue;
    }
    readField(message, reader, field, wireType, options);
  }
  if (delimited) {
    if (wireType != WireType.EndGroup || fieldNo !== lengthOrDelimitedFieldNo) {
      throw new Error("invalid end group tag");
    }
  }
  if (unknownFields.length > 0) {
    message.setUnknown(unknownFields);
  }
}
function readField(message, reader, field, wireType, options) {
  var _a;
  switch (field.fieldKind) {
    case "scalar":
      message.set(field, readScalar(reader, field.scalar));
      break;
    case "enum":
      const val = readScalar(reader, ScalarType.INT32);
      if (field.enum.open) {
        message.set(field, val);
      } else {
        const ok = field.enum.values.some((v) => v.number === val);
        if (ok) {
          message.set(field, val);
        } else if (options.readUnknownFields) {
          const data = new BinaryWriter().int32(val).finish();
          const unknownFields = (_a = message.getUnknown()) !== null && _a !== undefined ? _a : [];
          unknownFields.push({ no: field.number, wireType, data });
          message.setUnknown(unknownFields);
        }
      }
      break;
    case "message":
      message.set(field, readMessageField(reader, options, field, message.get(field)));
      break;
    case "list":
      readListField(reader, wireType, message.get(field), options);
      break;
    case "map":
      readMapEntry(reader, message.get(field), options);
      break;
  }
}
function readMapEntry(reader, map, options) {
  const field = map.field();
  let key;
  let val;
  const len = reader.uint32();
  const end = reader.pos + len;
  while (reader.pos < end) {
    const [fieldNo] = reader.tag();
    switch (fieldNo) {
      case 1:
        key = readScalar(reader, field.mapKey);
        break;
      case 2:
        switch (field.mapKind) {
          case "scalar":
            val = readScalar(reader, field.scalar);
            break;
          case "enum":
            val = reader.int32();
            break;
          case "message":
            val = readMessageField(reader, options, field);
            break;
        }
        break;
    }
  }
  if (key === undefined) {
    key = scalarZeroValue(field.mapKey, false);
  }
  if (val === undefined) {
    switch (field.mapKind) {
      case "scalar":
        val = scalarZeroValue(field.scalar, false);
        break;
      case "enum":
        val = field.enum.values[0].number;
        break;
      case "message":
        val = reflect(field.message, undefined, false);
        break;
    }
  }
  map.set(key, val);
}
function readListField(reader, wireType, list, options) {
  var _a;
  const field = list.field();
  if (field.listKind === "message") {
    list.add(readMessageField(reader, options, field));
    return;
  }
  const scalarType = (_a = field.scalar) !== null && _a !== undefined ? _a : ScalarType.INT32;
  const packed = wireType == WireType.LengthDelimited && scalarType != ScalarType.STRING && scalarType != ScalarType.BYTES;
  if (!packed) {
    list.add(readScalar(reader, scalarType));
    return;
  }
  const e = reader.uint32() + reader.pos;
  while (reader.pos < e) {
    list.add(readScalar(reader, scalarType));
  }
}
function readMessageField(reader, options, field, mergeMessage) {
  const delimited = field.delimitedEncoding;
  const message = mergeMessage !== null && mergeMessage !== undefined ? mergeMessage : reflect(field.message, undefined, false);
  readMessage(message, reader, options, delimited, delimited ? field.number : reader.uint32());
  return message;
}
function readScalar(reader, type) {
  switch (type) {
    case ScalarType.STRING:
      return reader.string();
    case ScalarType.BOOL:
      return reader.bool();
    case ScalarType.DOUBLE:
      return reader.double();
    case ScalarType.FLOAT:
      return reader.float();
    case ScalarType.INT32:
      return reader.int32();
    case ScalarType.INT64:
      return reader.int64();
    case ScalarType.UINT64:
      return reader.uint64();
    case ScalarType.FIXED64:
      return reader.fixed64();
    case ScalarType.BYTES:
      return reader.bytes();
    case ScalarType.FIXED32:
      return reader.fixed32();
    case ScalarType.SFIXED32:
      return reader.sfixed32();
    case ScalarType.SFIXED64:
      return reader.sfixed64();
    case ScalarType.SINT64:
      return reader.sint64();
    case ScalarType.UINT32:
      return reader.uint32();
    case ScalarType.SINT32:
      return reader.sint32();
  }
}
function fileDesc(b64, imports) {
  var _a;
  const root = fromBinary(FileDescriptorProtoSchema, base64Decode(b64));
  root.messageType.forEach(restoreJsonNames);
  root.dependency = (_a = imports === null || imports === undefined ? undefined : imports.map((f) => f.proto.name)) !== null && _a !== undefined ? _a : [];
  const reg = createFileRegistry(root, (protoFileName) => imports === null || imports === undefined ? undefined : imports.find((f) => f.proto.name === protoFileName));
  return reg.getFile(root.name);
}
var file_google_protobuf_timestamp = /* @__PURE__ */ fileDesc("Ch9nb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvEg9nb29nbGUucHJvdG9idWYiKwoJVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAVChQEKE2NvbS5nb29nbGUucHJvdG9idWZCDlRpbWVzdGFtcFByb3RvUAFaMmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3RpbWVzdGFtcHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
var TimestampSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_timestamp, 0);
function timestampFromDate(date) {
  return timestampFromMs(date.getTime());
}
function timestampDate(timestamp) {
  return new Date(timestampMs(timestamp));
}
function timestampFromMs(timestampMs) {
  const seconds = Math.floor(timestampMs / 1000);
  return create(TimestampSchema, {
    seconds: protoInt64.parse(seconds),
    nanos: (timestampMs - seconds * 1000) * 1e6
  });
}
function timestampMs(timestamp) {
  return Number(timestamp.seconds) * 1000 + Math.round(timestamp.nanos / 1e6);
}
var file_google_protobuf_any = /* @__PURE__ */ fileDesc("Chlnb29nbGUvcHJvdG9idWYvYW55LnByb3RvEg9nb29nbGUucHJvdG9idWYiJgoDQW55EhAKCHR5cGVfdXJsGAEgASgJEg0KBXZhbHVlGAIgASgMQnYKE2NvbS5nb29nbGUucHJvdG9idWZCCEFueVByb3RvUAFaLGdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2FueXBiogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
var AnySchema = /* @__PURE__ */ messageDesc(file_google_protobuf_any, 0);
var LEGACY_REQUIRED2 = 3;
var writeDefaults = {
  writeUnknownFields: true
};
function makeWriteOptions(options) {
  return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
}
function toBinary(schema, message, options) {
  return writeFields(new BinaryWriter, makeWriteOptions(options), reflect(schema, message)).finish();
}
function writeFields(writer, opts, msg) {
  var _a;
  for (const f of msg.sortedFields) {
    if (!msg.isSet(f)) {
      if (f.presence == LEGACY_REQUIRED2) {
        throw new Error(`cannot encode ${f} to binary: required field not set`);
      }
      continue;
    }
    writeField(writer, opts, msg, f);
  }
  if (opts.writeUnknownFields) {
    for (const { no, wireType, data } of (_a = msg.getUnknown()) !== null && _a !== undefined ? _a : []) {
      writer.tag(no, wireType).raw(data);
    }
  }
  return writer;
}
function writeField(writer, opts, msg, field) {
  var _a;
  switch (field.fieldKind) {
    case "scalar":
    case "enum":
      writeScalar(writer, msg.desc.typeName, field.name, (_a = field.scalar) !== null && _a !== undefined ? _a : ScalarType.INT32, field.number, msg.get(field));
      break;
    case "list":
      writeListField(writer, opts, field, msg.get(field));
      break;
    case "message":
      writeMessageField(writer, opts, field, msg.get(field));
      break;
    case "map":
      for (const [key, val] of msg.get(field)) {
        writeMapEntry(writer, opts, field, key, val);
      }
      break;
  }
}
function writeScalar(writer, msgName, fieldName, scalarType, fieldNo, value) {
  writeScalarValue(writer.tag(fieldNo, writeTypeOfScalar(scalarType)), msgName, fieldName, scalarType, value);
}
function writeMessageField(writer, opts, field, message) {
  if (field.delimitedEncoding) {
    writeFields(writer.tag(field.number, WireType.StartGroup), opts, message).tag(field.number, WireType.EndGroup);
  } else {
    writeFields(writer.tag(field.number, WireType.LengthDelimited).fork(), opts, message).join();
  }
}
function writeListField(writer, opts, field, list) {
  var _a;
  if (field.listKind == "message") {
    for (const item of list) {
      writeMessageField(writer, opts, field, item);
    }
    return;
  }
  const scalarType = (_a = field.scalar) !== null && _a !== undefined ? _a : ScalarType.INT32;
  if (field.packed) {
    if (!list.size) {
      return;
    }
    writer.tag(field.number, WireType.LengthDelimited).fork();
    for (const item of list) {
      writeScalarValue(writer, field.parent.typeName, field.name, scalarType, item);
    }
    writer.join();
    return;
  }
  for (const item of list) {
    writeScalar(writer, field.parent.typeName, field.name, scalarType, field.number, item);
  }
}
function writeMapEntry(writer, opts, field, key, value) {
  var _a;
  writer.tag(field.number, WireType.LengthDelimited).fork();
  writeScalar(writer, field.parent.typeName, field.name, field.mapKey, 1, key);
  switch (field.mapKind) {
    case "scalar":
    case "enum":
      writeScalar(writer, field.parent.typeName, field.name, (_a = field.scalar) !== null && _a !== undefined ? _a : ScalarType.INT32, 2, value);
      break;
    case "message":
      writeFields(writer.tag(2, WireType.LengthDelimited).fork(), opts, value).join();
      break;
  }
  writer.join();
}
function writeScalarValue(writer, msgName, fieldName, type, value) {
  try {
    switch (type) {
      case ScalarType.STRING:
        writer.string(value);
        break;
      case ScalarType.BOOL:
        writer.bool(value);
        break;
      case ScalarType.DOUBLE:
        writer.double(value);
        break;
      case ScalarType.FLOAT:
        writer.float(value);
        break;
      case ScalarType.INT32:
        writer.int32(value);
        break;
      case ScalarType.INT64:
        writer.int64(value);
        break;
      case ScalarType.UINT64:
        writer.uint64(value);
        break;
      case ScalarType.FIXED64:
        writer.fixed64(value);
        break;
      case ScalarType.BYTES:
        writer.bytes(value);
        break;
      case ScalarType.FIXED32:
        writer.fixed32(value);
        break;
      case ScalarType.SFIXED32:
        writer.sfixed32(value);
        break;
      case ScalarType.SFIXED64:
        writer.sfixed64(value);
        break;
      case ScalarType.SINT64:
        writer.sint64(value);
        break;
      case ScalarType.UINT32:
        writer.uint32(value);
        break;
      case ScalarType.SINT32:
        writer.sint32(value);
        break;
    }
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`cannot encode field ${msgName}.${fieldName} to binary: ${e.message}`);
    }
    throw e;
  }
}
function writeTypeOfScalar(type) {
  switch (type) {
    case ScalarType.BYTES:
    case ScalarType.STRING:
      return WireType.LengthDelimited;
    case ScalarType.DOUBLE:
    case ScalarType.FIXED64:
    case ScalarType.SFIXED64:
      return WireType.Bit64;
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
    case ScalarType.FLOAT:
      return WireType.Bit32;
    default:
      return WireType.Varint;
  }
}
function anyPack(schema, message, into) {
  let ret = false;
  if (!into) {
    into = create(AnySchema);
    ret = true;
  }
  into.value = toBinary(schema, message);
  into.typeUrl = typeNameToUrl(message.$typeName);
  return ret ? into : undefined;
}
function anyIs(any, descOrTypeName) {
  if (any.typeUrl === "") {
    return false;
  }
  const want = typeof descOrTypeName == "string" ? descOrTypeName : descOrTypeName.typeName;
  const got = typeUrlToName(any.typeUrl);
  return want === got;
}
function anyUnpack(any, registryOrMessageDesc) {
  if (any.typeUrl === "") {
    return;
  }
  const desc = registryOrMessageDesc.kind == "message" ? registryOrMessageDesc : registryOrMessageDesc.getMessage(typeUrlToName(any.typeUrl));
  if (!desc || !anyIs(any, desc)) {
    return;
  }
  return fromBinary(desc, any.value);
}
function typeNameToUrl(name) {
  return `type.googleapis.com/${name}`;
}
function typeUrlToName(url) {
  const slash = url.lastIndexOf("/");
  const name = slash >= 0 ? url.substring(slash + 1) : url;
  if (!name.length) {
    throw new Error(`invalid type url: ${url}`);
  }
  return name;
}
var file_google_protobuf_duration = /* @__PURE__ */ fileDesc("Ch5nb29nbGUvcHJvdG9idWYvZHVyYXRpb24ucHJvdG8SD2dvb2dsZS5wcm90b2J1ZiIqCghEdXJhdGlvbhIPCgdzZWNvbmRzGAEgASgDEg0KBW5hbm9zGAIgASgFQoMBChNjb20uZ29vZ2xlLnByb3RvYnVmQg1EdXJhdGlvblByb3RvUAFaMWdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2R1cmF0aW9ucGL4AQGiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw");
var file_google_protobuf_empty = /* @__PURE__ */ fileDesc("Chtnb29nbGUvcHJvdG9idWYvZW1wdHkucHJvdG8SD2dvb2dsZS5wcm90b2J1ZiIHCgVFbXB0eUJ9ChNjb20uZ29vZ2xlLnByb3RvYnVmQgpFbXB0eVByb3RvUAFaLmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2VtcHR5cGL4AQGiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw");
var file_google_protobuf_struct = /* @__PURE__ */ fileDesc("Chxnb29nbGUvcHJvdG9idWYvc3RydWN0LnByb3RvEg9nb29nbGUucHJvdG9idWYihAEKBlN0cnVjdBIzCgZmaWVsZHMYASADKAsyIy5nb29nbGUucHJvdG9idWYuU3RydWN0LkZpZWxkc0VudHJ5GkUKC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIlCgV2YWx1ZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZToCOAEi6gEKBVZhbHVlEjAKCm51bGxfdmFsdWUYASABKA4yGi5nb29nbGUucHJvdG9idWYuTnVsbFZhbHVlSAASFgoMbnVtYmVyX3ZhbHVlGAIgASgBSAASFgoMc3RyaW5nX3ZhbHVlGAMgASgJSAASFAoKYm9vbF92YWx1ZRgEIAEoCEgAEi8KDHN0cnVjdF92YWx1ZRgFIAEoCzIXLmdvb2dsZS5wcm90b2J1Zi5TdHJ1Y3RIABIwCgpsaXN0X3ZhbHVlGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLkxpc3RWYWx1ZUgAQgYKBGtpbmQiMwoJTGlzdFZhbHVlEiYKBnZhbHVlcxgBIAMoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZSobCglOdWxsVmFsdWUSDgoKTlVMTF9WQUxVRRAAQn8KE2NvbS5nb29nbGUucHJvdG9idWZCC1N0cnVjdFByb3RvUAFaL2dvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3N0cnVjdHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
var StructSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 0);
var ValueSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 1);
var ListValueSchema = /* @__PURE__ */ messageDesc(file_google_protobuf_struct, 2);
var NullValue;
(function(NullValue2) {
  NullValue2[NullValue2["NULL_VALUE"] = 0] = "NULL_VALUE";
})(NullValue || (NullValue = {}));
function setExtension(message, extension, value) {
  var _a;
  assertExtendee(extension, message);
  const ufs = ((_a = message.$unknown) !== null && _a !== undefined ? _a : []).filter((uf) => uf.no !== extension.number);
  const [container, field] = createExtensionContainer(extension, value);
  const writer = new BinaryWriter;
  writeField(writer, { writeUnknownFields: true }, container, field);
  const reader = new BinaryReader(writer.finish());
  while (reader.pos < reader.len) {
    const [no, wireType] = reader.tag();
    const data = reader.skip(wireType, no);
    ufs.push({ no, wireType, data });
  }
  message.$unknown = ufs;
}
function createExtensionContainer(extension, value) {
  const localName = extension.typeName;
  const field = Object.assign(Object.assign({}, extension), { kind: "field", parent: extension.extendee, localName });
  const desc = Object.assign(Object.assign({}, extension.extendee), { fields: [field], members: [field], oneofs: [] });
  const container = create(desc, value !== undefined ? { [localName]: value } : undefined);
  return [
    reflect(desc, container),
    field,
    () => {
      const value2 = container[localName];
      if (value2 === undefined) {
        const desc2 = extension.message;
        if (isWrapperDesc(desc2)) {
          return scalarZeroValue(desc2.fields[0].scalar, desc2.fields[0].longAsString);
        }
        return create(desc2);
      }
      return value2;
    }
  ];
}
function assertExtendee(extension, message) {
  if (extension.extendee.typeName != message.$typeName) {
    throw new Error(`extension ${extension.typeName} can only be applied to message ${extension.extendee.typeName}`);
  }
}
var jsonReadDefaults = {
  ignoreUnknownFields: false
};
function makeReadOptions2(options) {
  return options ? Object.assign(Object.assign({}, jsonReadDefaults), options) : jsonReadDefaults;
}
function fromJson(schema, json, options) {
  const msg = reflect(schema);
  try {
    readMessage2(msg, json, makeReadOptions2(options));
  } catch (e) {
    if (isFieldError(e)) {
      throw new Error(`cannot decode ${e.field()} from JSON: ${e.message}`, {
        cause: e
      });
    }
    throw e;
  }
  return msg.message;
}
function readMessage2(msg, json, opts) {
  var _a;
  if (tryWktFromJson(msg, json, opts)) {
    return;
  }
  if (json == null || Array.isArray(json) || typeof json != "object") {
    throw new Error(`cannot decode ${msg.desc} from JSON: ${formatVal(json)}`);
  }
  const oneofSeen = new Map;
  const jsonNames = new Map;
  for (const field of msg.desc.fields) {
    jsonNames.set(field.name, field).set(field.jsonName, field);
  }
  for (const [jsonKey, jsonValue] of Object.entries(json)) {
    const field = jsonNames.get(jsonKey);
    if (field) {
      if (field.oneof) {
        if (jsonValue === null && field.fieldKind == "scalar") {
          continue;
        }
        const seen = oneofSeen.get(field.oneof);
        if (seen !== undefined) {
          throw new FieldError(field.oneof, `oneof set multiple times by ${seen.name} and ${field.name}`);
        }
        oneofSeen.set(field.oneof, field);
      }
      readField2(msg, field, jsonValue, opts);
    } else {
      let extension = undefined;
      if (jsonKey.startsWith("[") && jsonKey.endsWith("]") && (extension = (_a = opts.registry) === null || _a === undefined ? undefined : _a.getExtension(jsonKey.substring(1, jsonKey.length - 1))) && extension.extendee.typeName === msg.desc.typeName) {
        const [container, field2, get] = createExtensionContainer(extension);
        readField2(container, field2, jsonValue, opts);
        setExtension(msg.message, extension, get());
      }
      if (!extension && !opts.ignoreUnknownFields) {
        throw new Error(`cannot decode ${msg.desc} from JSON: key "${jsonKey}" is unknown`);
      }
    }
  }
}
function readField2(msg, field, json, opts) {
  switch (field.fieldKind) {
    case "scalar":
      readScalarField(msg, field, json);
      break;
    case "enum":
      readEnumField(msg, field, json, opts);
      break;
    case "message":
      readMessageField2(msg, field, json, opts);
      break;
    case "list":
      readListField2(msg.get(field), json, opts);
      break;
    case "map":
      readMapField(msg.get(field), json, opts);
      break;
  }
}
function readMapField(map, json, opts) {
  if (json === null) {
    return;
  }
  const field = map.field();
  if (typeof json != "object" || Array.isArray(json)) {
    throw new FieldError(field, "expected object, got " + formatVal(json));
  }
  for (const [jsonMapKey, jsonMapValue] of Object.entries(json)) {
    if (jsonMapValue === null) {
      throw new FieldError(field, "map value must not be null");
    }
    let value;
    switch (field.mapKind) {
      case "message":
        const msgValue = reflect(field.message);
        readMessage2(msgValue, jsonMapValue, opts);
        value = msgValue;
        break;
      case "enum":
        value = readEnum(field.enum, jsonMapValue, opts.ignoreUnknownFields, true);
        if (value === tokenIgnoredUnknownEnum) {
          return;
        }
        break;
      case "scalar":
        value = scalarFromJson(field, jsonMapValue, true);
        break;
    }
    const key = mapKeyFromJson(field.mapKey, jsonMapKey);
    map.set(key, value);
  }
}
function readListField2(list, json, opts) {
  if (json === null) {
    return;
  }
  const field = list.field();
  if (!Array.isArray(json)) {
    throw new FieldError(field, "expected Array, got " + formatVal(json));
  }
  for (const jsonItem of json) {
    if (jsonItem === null) {
      throw new FieldError(field, "list item must not be null");
    }
    switch (field.listKind) {
      case "message":
        const msgValue = reflect(field.message);
        readMessage2(msgValue, jsonItem, opts);
        list.add(msgValue);
        break;
      case "enum":
        const enumValue = readEnum(field.enum, jsonItem, opts.ignoreUnknownFields, true);
        if (enumValue !== tokenIgnoredUnknownEnum) {
          list.add(enumValue);
        }
        break;
      case "scalar":
        list.add(scalarFromJson(field, jsonItem, true));
        break;
    }
  }
}
function readMessageField2(msg, field, json, opts) {
  if (json === null && field.message.typeName != "google.protobuf.Value") {
    msg.clear(field);
    return;
  }
  const msgValue = msg.isSet(field) ? msg.get(field) : reflect(field.message);
  readMessage2(msgValue, json, opts);
  msg.set(field, msgValue);
}
function readEnumField(msg, field, json, opts) {
  const enumValue = readEnum(field.enum, json, opts.ignoreUnknownFields, false);
  if (enumValue === tokenNull) {
    msg.clear(field);
  } else if (enumValue !== tokenIgnoredUnknownEnum) {
    msg.set(field, enumValue);
  }
}
function readScalarField(msg, field, json) {
  const scalarValue = scalarFromJson(field, json, false);
  if (scalarValue === tokenNull) {
    msg.clear(field);
  } else {
    msg.set(field, scalarValue);
  }
}
var tokenIgnoredUnknownEnum = Symbol();
function readEnum(desc, json, ignoreUnknownFields, nullAsZeroValue) {
  if (json === null) {
    if (desc.typeName == "google.protobuf.NullValue") {
      return 0;
    }
    return nullAsZeroValue ? desc.values[0].number : tokenNull;
  }
  switch (typeof json) {
    case "number":
      if (Number.isInteger(json)) {
        return json;
      }
      break;
    case "string":
      const value = desc.values.find((ev) => ev.name === json);
      if (value !== undefined) {
        return value.number;
      }
      if (ignoreUnknownFields) {
        return tokenIgnoredUnknownEnum;
      }
      break;
  }
  throw new Error(`cannot decode ${desc} from JSON: ${formatVal(json)}`);
}
var tokenNull = Symbol();
function scalarFromJson(field, json, nullAsZeroValue) {
  if (json === null) {
    if (nullAsZeroValue) {
      return scalarZeroValue(field.scalar, false);
    }
    return tokenNull;
  }
  switch (field.scalar) {
    case ScalarType.DOUBLE:
    case ScalarType.FLOAT:
      if (json === "NaN")
        return NaN;
      if (json === "Infinity")
        return Number.POSITIVE_INFINITY;
      if (json === "-Infinity")
        return Number.NEGATIVE_INFINITY;
      if (typeof json == "number") {
        if (Number.isNaN(json)) {
          throw new FieldError(field, "unexpected NaN number");
        }
        if (!Number.isFinite(json)) {
          throw new FieldError(field, "unexpected infinite number");
        }
        break;
      }
      if (typeof json == "string") {
        if (json === "") {
          break;
        }
        if (json.trim().length !== json.length) {
          break;
        }
        const float = Number(json);
        if (!Number.isFinite(float)) {
          break;
        }
        return float;
      }
      break;
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
    case ScalarType.UINT32:
      return int32FromJson(json);
    case ScalarType.BYTES:
      if (typeof json == "string") {
        if (json === "") {
          return new Uint8Array(0);
        }
        try {
          return base64Decode(json);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          throw new FieldError(field, message);
        }
      }
      break;
  }
  return json;
}
function mapKeyFromJson(type, json) {
  switch (type) {
    case ScalarType.BOOL:
      switch (json) {
        case "true":
          return true;
        case "false":
          return false;
      }
      return json;
    case ScalarType.INT32:
    case ScalarType.FIXED32:
    case ScalarType.UINT32:
    case ScalarType.SFIXED32:
    case ScalarType.SINT32:
      return int32FromJson(json);
    default:
      return json;
  }
}
function int32FromJson(json) {
  if (typeof json == "string") {
    if (json === "") {
      return json;
    }
    if (json.trim().length !== json.length) {
      return json;
    }
    const num2 = Number(json);
    if (Number.isNaN(num2)) {
      return json;
    }
    return num2;
  }
  return json;
}
function tryWktFromJson(msg, jsonValue, opts) {
  if (!msg.desc.typeName.startsWith("google.protobuf.")) {
    return false;
  }
  switch (msg.desc.typeName) {
    case "google.protobuf.Any":
      anyFromJson(msg.message, jsonValue, opts);
      return true;
    case "google.protobuf.Timestamp":
      timestampFromJson(msg.message, jsonValue);
      return true;
    case "google.protobuf.Duration":
      durationFromJson(msg.message, jsonValue);
      return true;
    case "google.protobuf.FieldMask":
      fieldMaskFromJson(msg.message, jsonValue);
      return true;
    case "google.protobuf.Struct":
      structFromJson(msg.message, jsonValue);
      return true;
    case "google.protobuf.Value":
      valueFromJson(msg.message, jsonValue);
      return true;
    case "google.protobuf.ListValue":
      listValueFromJson(msg.message, jsonValue);
      return true;
    default:
      if (isWrapperDesc(msg.desc)) {
        const valueField = msg.desc.fields[0];
        if (jsonValue === null) {
          msg.clear(valueField);
        } else {
          msg.set(valueField, scalarFromJson(valueField, jsonValue, true));
        }
        return true;
      }
      return false;
  }
}
function anyFromJson(any, json, opts) {
  var _a;
  if (json === null || Array.isArray(json) || typeof json != "object") {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: expected object but got ${formatVal(json)}`);
  }
  if (Object.keys(json).length == 0) {
    return;
  }
  const typeUrl = json["@type"];
  if (typeof typeUrl != "string" || typeUrl == "") {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is empty`);
  }
  const typeName = typeUrl.includes("/") ? typeUrl.substring(typeUrl.lastIndexOf("/") + 1) : typeUrl;
  if (!typeName.length) {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is invalid`);
  }
  const desc = (_a = opts.registry) === null || _a === undefined ? undefined : _a.getMessage(typeName);
  if (!desc) {
    throw new Error(`cannot decode message ${any.$typeName} from JSON: ${typeUrl} is not in the type registry`);
  }
  const msg = reflect(desc);
  if (typeName.startsWith("google.protobuf.") && Object.prototype.hasOwnProperty.call(json, "value")) {
    const value = json.value;
    readMessage2(msg, value, opts);
  } else {
    const copy = Object.assign({}, json);
    delete copy["@type"];
    readMessage2(msg, copy, opts);
  }
  anyPack(msg.desc, msg.message, any);
}
function timestampFromJson(timestamp, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: ${formatVal(json)}`);
  }
  const matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
  if (!matches) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
  }
  const ms = Date.parse(matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z"));
  if (Number.isNaN(ms)) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
  }
  if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z")) {
    throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
  }
  timestamp.seconds = protoInt64.parse(ms / 1000);
  timestamp.nanos = 0;
  if (matches[7]) {
    timestamp.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
  }
}
function durationFromJson(duration, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  const match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
  if (match === null) {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  const longSeconds = Number(match[1]);
  if (longSeconds > 315576000000 || longSeconds < -315576000000) {
    throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
  }
  duration.seconds = protoInt64.parse(longSeconds);
  if (typeof match[2] !== "string") {
    return;
  }
  const nanosStr = match[2] + "0".repeat(9 - match[2].length);
  duration.nanos = parseInt(nanosStr);
  if (longSeconds < 0 || Object.is(longSeconds, -0)) {
    duration.nanos = -duration.nanos;
  }
}
function fieldMaskFromJson(fieldMask, json) {
  if (typeof json !== "string") {
    throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: ${formatVal(json)}`);
  }
  if (json === "") {
    return;
  }
  function camelToSnake(str) {
    if (str.includes("_")) {
      throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: path names must be lowerCamelCase`);
    }
    const sc = str.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
    return sc[0] === "_" ? sc.substring(1) : sc;
  }
  fieldMask.paths = json.split(",").map(camelToSnake);
}
function structFromJson(struct, json) {
  if (typeof json != "object" || json == null || Array.isArray(json)) {
    throw new Error(`cannot decode message ${struct.$typeName} from JSON ${formatVal(json)}`);
  }
  for (const [k, v] of Object.entries(json)) {
    const parsedV = create(ValueSchema);
    valueFromJson(parsedV, v);
    struct.fields[k] = parsedV;
  }
}
function valueFromJson(value, json) {
  switch (typeof json) {
    case "number":
      value.kind = { case: "numberValue", value: json };
      break;
    case "string":
      value.kind = { case: "stringValue", value: json };
      break;
    case "boolean":
      value.kind = { case: "boolValue", value: json };
      break;
    case "object":
      if (json === null) {
        value.kind = { case: "nullValue", value: NullValue.NULL_VALUE };
      } else if (Array.isArray(json)) {
        const listValue = create(ListValueSchema);
        listValueFromJson(listValue, json);
        value.kind = { case: "listValue", value: listValue };
      } else {
        const struct = create(StructSchema);
        structFromJson(struct, json);
        value.kind = { case: "structValue", value: struct };
      }
      break;
    default:
      throw new Error(`cannot decode message ${value.$typeName} from JSON ${formatVal(json)}`);
  }
  return value;
}
function listValueFromJson(listValue, json) {
  if (!Array.isArray(json)) {
    throw new Error(`cannot decode message ${listValue.$typeName} from JSON ${formatVal(json)}`);
  }
  for (const e of json) {
    const value = create(ValueSchema);
    valueFromJson(value, e);
    listValue.values.push(value);
  }
}
var file_values_v1_values = /* @__PURE__ */ fileDesc("ChZ2YWx1ZXMvdjEvdmFsdWVzLnByb3RvEgl2YWx1ZXMudjEigQMKBVZhbHVlEhYKDHN0cmluZ192YWx1ZRgBIAEoCUgAEhQKCmJvb2xfdmFsdWUYAiABKAhIABIVCgtieXRlc192YWx1ZRgDIAEoDEgAEiMKCW1hcF92YWx1ZRgEIAEoCzIOLnZhbHVlcy52MS5NYXBIABIlCgpsaXN0X3ZhbHVlGAUgASgLMg8udmFsdWVzLnYxLkxpc3RIABIrCg1kZWNpbWFsX3ZhbHVlGAYgASgLMhIudmFsdWVzLnYxLkRlY2ltYWxIABIZCgtpbnQ2NF92YWx1ZRgHIAEoA0ICMABIABIpCgxiaWdpbnRfdmFsdWUYCSABKAsyES52YWx1ZXMudjEuQmlnSW50SAASMAoKdGltZV92YWx1ZRgKIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBIABIXCg1mbG9hdDY0X3ZhbHVlGAsgASgBSAASGgoMdWludDY0X3ZhbHVlGAwgASgEQgIwAEgAQgcKBXZhbHVlSgQICBAJIisKBkJpZ0ludBIPCgdhYnNfdmFsGAEgASgMEhAKBHNpZ24YAiABKANCAjAAInIKA01hcBIqCgZmaWVsZHMYASADKAsyGi52YWx1ZXMudjEuTWFwLkZpZWxkc0VudHJ5Gj8KC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIfCgV2YWx1ZRgCIAEoCzIQLnZhbHVlcy52MS5WYWx1ZToCOAEiKAoETGlzdBIgCgZmaWVsZHMYAiADKAsyEC52YWx1ZXMudjEuVmFsdWUiQwoHRGVjaW1hbBImCgtjb2VmZmljaWVudBgBIAEoCzIRLnZhbHVlcy52MS5CaWdJbnQSEAoIZXhwb25lbnQYAiABKAVCYQoNY29tLnZhbHVlcy52MUILVmFsdWVzUHJvdG9QAaICA1ZYWKoCCVZhbHVlcy5WMcoCCVZhbHVlc1xWMeICFVZhbHVlc1xWMVxHUEJNZXRhZGF0YeoCClZhbHVlczo6VjFiBnByb3RvMw", [file_google_protobuf_timestamp]);
var ValueSchema2 = /* @__PURE__ */ messageDesc(file_values_v1_values, 0);
var BigIntSchema = /* @__PURE__ */ messageDesc(file_values_v1_values, 1);
var MapSchema = /* @__PURE__ */ messageDesc(file_values_v1_values, 2);
var ListSchema = /* @__PURE__ */ messageDesc(file_values_v1_values, 3);
var DecimalSchema = /* @__PURE__ */ messageDesc(file_values_v1_values, 4);
var file_sdk_v1alpha_sdk = /* @__PURE__ */ fileDesc("ChVzZGsvdjFhbHBoYS9zZGsucHJvdG8SC3Nkay52MWFscGhhIrQBChVTaW1wbGVDb25zZW5zdXNJbnB1dHMSIQoFdmFsdWUYASABKAsyEC52YWx1ZXMudjEuVmFsdWVIABIPCgVlcnJvchgCIAEoCUgAEjUKC2Rlc2NyaXB0b3JzGAMgASgLMiAuc2RrLnYxYWxwaGEuQ29uc2Vuc3VzRGVzY3JpcHRvchIhCgdkZWZhdWx0GAQgASgLMhAudmFsdWVzLnYxLlZhbHVlQg0KC29ic2VydmF0aW9uIpABCglGaWVsZHNNYXASMgoGZmllbGRzGAEgAygLMiIuc2RrLnYxYWxwaGEuRmllbGRzTWFwLkZpZWxkc0VudHJ5Gk8KC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIvCgV2YWx1ZRgCIAEoCzIgLnNkay52MWFscGhhLkNvbnNlbnN1c0Rlc2NyaXB0b3I6AjgBIoYBChNDb25zZW5zdXNEZXNjcmlwdG9yEjMKC2FnZ3JlZ2F0aW9uGAEgASgOMhwuc2RrLnYxYWxwaGEuQWdncmVnYXRpb25UeXBlSAASLAoKZmllbGRzX21hcBgCIAEoCzIWLnNkay52MWFscGhhLkZpZWxkc01hcEgAQgwKCmRlc2NyaXB0b3IiagoNUmVwb3J0UmVxdWVzdBIXCg9lbmNvZGVkX3BheWxvYWQYASABKAwSFAoMZW5jb2Rlcl9uYW1lGAIgASgJEhQKDHNpZ25pbmdfYWxnbxgDIAEoCRIUCgxoYXNoaW5nX2FsZ28YBCABKAkilwEKDlJlcG9ydFJlc3BvbnNlEhUKDWNvbmZpZ19kaWdlc3QYASABKAwSEgoGc2VxX25yGAIgASgEQgIwABIWCg5yZXBvcnRfY29udGV4dBgDIAEoDBISCgpyYXdfcmVwb3J0GAQgASgMEi4KBHNpZ3MYBSADKAsyIC5zZGsudjFhbHBoYS5BdHRyaWJ1dGVkU2lnbmF0dXJlIjsKE0F0dHJpYnV0ZWRTaWduYXR1cmUSEQoJc2lnbmF0dXJlGAEgASgMEhEKCXNpZ25lcl9pZBgCIAEoDSJrChFDYXBhYmlsaXR5UmVxdWVzdBIKCgJpZBgBIAEoCRIlCgdwYXlsb2FkGAIgASgLMhQuZ29vZ2xlLnByb3RvYnVmLkFueRIOCgZtZXRob2QYAyABKAkSEwoLY2FsbGJhY2tfaWQYBCABKAUiWgoSQ2FwYWJpbGl0eVJlc3BvbnNlEicKB3BheWxvYWQYASABKAsyFC5nb29nbGUucHJvdG9idWYuQW55SAASDwoFZXJyb3IYAiABKAlIAEIKCghyZXNwb25zZSJYChNUcmlnZ2VyU3Vic2NyaXB0aW9uEgoKAmlkGAEgASgJEiUKB3BheWxvYWQYAiABKAsyFC5nb29nbGUucHJvdG9idWYuQW55Eg4KBm1ldGhvZBgDIAEoCSJVChpUcmlnZ2VyU3Vic2NyaXB0aW9uUmVxdWVzdBI3Cg1zdWJzY3JpcHRpb25zGAEgAygLMiAuc2RrLnYxYWxwaGEuVHJpZ2dlclN1YnNjcmlwdGlvbiJACgdUcmlnZ2VyEg4KAmlkGAEgASgEQgIwABIlCgdwYXlsb2FkGAIgASgLMhQuZ29vZ2xlLnByb3RvYnVmLkFueSInChhBd2FpdENhcGFiaWxpdGllc1JlcXVlc3QSCwoDaWRzGAEgAygFIrgBChlBd2FpdENhcGFiaWxpdGllc1Jlc3BvbnNlEkgKCXJlc3BvbnNlcxgBIAMoCzI1LnNkay52MWFscGhhLkF3YWl0Q2FwYWJpbGl0aWVzUmVzcG9uc2UuUmVzcG9uc2VzRW50cnkaUQoOUmVzcG9uc2VzRW50cnkSCwoDa2V5GAEgASgFEi4KBXZhbHVlGAIgASgLMh8uc2RrLnYxYWxwaGEuQ2FwYWJpbGl0eVJlc3BvbnNlOgI4ASKgAQoORXhlY3V0ZVJlcXVlc3QSDgoGY29uZmlnGAEgASgMEisKCXN1YnNjcmliZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eUgAEicKB3RyaWdnZXIYAyABKAsyFC5zZGsudjFhbHBoYS5UcmlnZ2VySAASHQoRbWF4X3Jlc3BvbnNlX3NpemUYBCABKARCAjAAQgkKB3JlcXVlc3QimQEKD0V4ZWN1dGlvblJlc3VsdBIhCgV2YWx1ZRgBIAEoCzIQLnZhbHVlcy52MS5WYWx1ZUgAEg8KBWVycm9yGAIgASgJSAASSAoVdHJpZ2dlcl9zdWJzY3JpcHRpb25zGAMgASgLMicuc2RrLnYxYWxwaGEuVHJpZ2dlclN1YnNjcmlwdGlvblJlcXVlc3RIAEIICgZyZXN1bHQiVgoRR2V0U2VjcmV0c1JlcXVlc3QSLAoIcmVxdWVzdHMYASADKAsyGi5zZGsudjFhbHBoYS5TZWNyZXRSZXF1ZXN0EhMKC2NhbGxiYWNrX2lkGAIgASgFIiIKE0F3YWl0U2VjcmV0c1JlcXVlc3QSCwoDaWRzGAEgAygFIqsBChRBd2FpdFNlY3JldHNSZXNwb25zZRJDCglyZXNwb25zZXMYASADKAsyMC5zZGsudjFhbHBoYS5Bd2FpdFNlY3JldHNSZXNwb25zZS5SZXNwb25zZXNFbnRyeRpOCg5SZXNwb25zZXNFbnRyeRILCgNrZXkYASABKAUSKwoFdmFsdWUYAiABKAsyHC5zZGsudjFhbHBoYS5TZWNyZXRSZXNwb25zZXM6AjgBIi4KDVNlY3JldFJlcXVlc3QSCgoCaWQYASABKAkSEQoJbmFtZXNwYWNlGAIgASgJIkUKBlNlY3JldBIKCgJpZBgBIAEoCRIRCgluYW1lc3BhY2UYAiABKAkSDQoFb3duZXIYAyABKAkSDQoFdmFsdWUYBCABKAkiSgoLU2VjcmV0RXJyb3ISCgoCaWQYASABKAkSEQoJbmFtZXNwYWNlGAIgASgJEg0KBW93bmVyGAMgASgJEg0KBWVycm9yGAQgASgJIm4KDlNlY3JldFJlc3BvbnNlEiUKBnNlY3JldBgBIAEoCzITLnNkay52MWFscGhhLlNlY3JldEgAEikKBWVycm9yGAIgASgLMhguc2RrLnYxYWxwaGEuU2VjcmV0RXJyb3JIAEIKCghyZXNwb25zZSJBCg9TZWNyZXRSZXNwb25zZXMSLgoJcmVzcG9uc2VzGAEgAygLMhsuc2RrLnYxYWxwaGEuU2VjcmV0UmVzcG9uc2UquAEKD0FnZ3JlZ2F0aW9uVHlwZRIgChxBR0dSRUdBVElPTl9UWVBFX1VOU1BFQ0lGSUVEEAASGwoXQUdHUkVHQVRJT05fVFlQRV9NRURJQU4QARIeChpBR0dSRUdBVElPTl9UWVBFX0lERU5USUNBTBACEiIKHkFHR1JFR0FUSU9OX1RZUEVfQ09NTU9OX1BSRUZJWBADEiIKHkFHR1JFR0FUSU9OX1RZUEVfQ09NTU9OX1NVRkZJWBAEKjkKBE1vZGUSFAoQTU9ERV9VTlNQRUNJRklFRBAAEgwKCE1PREVfRE9OEAESDQoJTU9ERV9OT0RFEAJCaAoPY29tLnNkay52MWFscGhhQghTZGtQcm90b1ABogIDU1hYqgILU2RrLlYxYWxwaGHKAgtTZGtcVjFhbHBoYeICF1Nka1xWMWFscGhhXEdQQk1ldGFkYXRh6gIMU2RrOjpWMWFscGhhYgZwcm90bzM", [file_google_protobuf_any, file_google_protobuf_empty, file_values_v1_values]);
var SimpleConsensusInputsSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 0);
var ReportRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 3);
var ReportResponseSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 4);
var AttributedSignatureSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 5);
var CapabilityRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 6);
var TriggerSubscriptionRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 9);
var AwaitCapabilitiesRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 11);
var AwaitCapabilitiesResponseSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 12);
var ExecuteRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 13);
var ExecutionResultSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 14);
var GetSecretsRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 15);
var AwaitSecretsRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 16);
var AwaitSecretsResponseSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 17);
var SecretRequestSchema = /* @__PURE__ */ messageDesc(file_sdk_v1alpha_sdk, 18);
var AggregationType;
(function(AggregationType2) {
  AggregationType2[AggregationType2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  AggregationType2[AggregationType2["MEDIAN"] = 1] = "MEDIAN";
  AggregationType2[AggregationType2["IDENTICAL"] = 2] = "IDENTICAL";
  AggregationType2[AggregationType2["COMMON_PREFIX"] = 3] = "COMMON_PREFIX";
  AggregationType2[AggregationType2["COMMON_SUFFIX"] = 4] = "COMMON_SUFFIX";
})(AggregationType || (AggregationType = {}));
var Mode;
(function(Mode2) {
  Mode2[Mode2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  Mode2[Mode2["DON"] = 1] = "DON";
  Mode2[Mode2["NODE"] = 2] = "NODE";
})(Mode || (Mode = {}));
var file_tools_generator_v1alpha_cre_metadata = /* @__PURE__ */ fileDesc("Cip0b29scy9nZW5lcmF0b3IvdjFhbHBoYS9jcmVfbWV0YWRhdGEucHJvdG8SF3Rvb2xzLmdlbmVyYXRvci52MWFscGhhIoQBCgtTdHJpbmdMYWJlbBJECghkZWZhdWx0cxgBIAMoCzIyLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLlN0cmluZ0xhYmVsLkRlZmF1bHRzRW50cnkaLwoNRGVmYXVsdHNFbnRyeRILCgNrZXkYASABKAkSDQoFdmFsdWUYAiABKAk6AjgBIogBCgtVaW50NjRMYWJlbBJECghkZWZhdWx0cxgBIAMoCzIyLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLlVpbnQ2NExhYmVsLkRlZmF1bHRzRW50cnkaMwoNRGVmYXVsdHNFbnRyeRILCgNrZXkYASABKAkSEQoFdmFsdWUYAiABKARCAjAAOgI4ASKEAQoLVWludDMyTGFiZWwSRAoIZGVmYXVsdHMYASADKAsyMi50b29scy5nZW5lcmF0b3IudjFhbHBoYS5VaW50MzJMYWJlbC5EZWZhdWx0c0VudHJ5Gi8KDURlZmF1bHRzRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgNOgI4ASKGAQoKSW50NjRMYWJlbBJDCghkZWZhdWx0cxgBIAMoCzIxLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLkludDY0TGFiZWwuRGVmYXVsdHNFbnRyeRozCg1EZWZhdWx0c0VudHJ5EgsKA2tleRgBIAEoCRIRCgV2YWx1ZRgCIAEoA0ICMAA6AjgBIoIBCgpJbnQzMkxhYmVsEkMKCGRlZmF1bHRzGAEgAygLMjEudG9vbHMuZ2VuZXJhdG9yLnYxYWxwaGEuSW50MzJMYWJlbC5EZWZhdWx0c0VudHJ5Gi8KDURlZmF1bHRzRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgFOgI4ASLBAgoFTGFiZWwSPAoMc3RyaW5nX2xhYmVsGAEgASgLMiQudG9vbHMuZ2VuZXJhdG9yLnYxYWxwaGEuU3RyaW5nTGFiZWxIABI8Cgx1aW50NjRfbGFiZWwYAiABKAsyJC50b29scy5nZW5lcmF0b3IudjFhbHBoYS5VaW50NjRMYWJlbEgAEjoKC2ludDY0X2xhYmVsGAMgASgLMiMudG9vbHMuZ2VuZXJhdG9yLnYxYWxwaGEuSW50NjRMYWJlbEgAEjwKDHVpbnQzMl9sYWJlbBgEIAEoCzIkLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLlVpbnQzMkxhYmVsSAASOgoLaW50MzJfbGFiZWwYBSABKAsyIy50b29scy5nZW5lcmF0b3IudjFhbHBoYS5JbnQzMkxhYmVsSABCBgoEa2luZCLkAQoSQ2FwYWJpbGl0eU1ldGFkYXRhEh8KBG1vZGUYASABKA4yES5zZGsudjFhbHBoYS5Nb2RlEhUKDWNhcGFiaWxpdHlfaWQYAiABKAkSRwoGbGFiZWxzGAMgAygLMjcudG9vbHMuZ2VuZXJhdG9yLnYxYWxwaGEuQ2FwYWJpbGl0eU1ldGFkYXRhLkxhYmVsc0VudHJ5Gk0KC0xhYmVsc0VudHJ5EgsKA2tleRgBIAEoCRItCgV2YWx1ZRgCIAEoCzIeLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLkxhYmVsOgI4ASI2ChhDYXBhYmlsaXR5TWV0aG9kTWV0YWRhdGESGgoSbWFwX3RvX3VudHlwZWRfYXBpGAEgASgIOm4KCmNhcGFiaWxpdHkSHy5nb29nbGUucHJvdG9idWYuU2VydmljZU9wdGlvbnMY0IYDIAEoCzIrLnRvb2xzLmdlbmVyYXRvci52MWFscGhhLkNhcGFiaWxpdHlNZXRhZGF0YVIKY2FwYWJpbGl0eTprCgZtZXRob2QSHi5nb29nbGUucHJvdG9idWYuTWV0aG9kT3B0aW9ucxjRhgMgASgLMjEudG9vbHMuZ2VuZXJhdG9yLnYxYWxwaGEuQ2FwYWJpbGl0eU1ldGhvZE1ldGFkYXRhUgZtZXRob2RCrwEKG2NvbS50b29scy5nZW5lcmF0b3IudjFhbHBoYUIQQ3JlTWV0YWRhdGFQcm90b1ABogIDVEdYqgIXVG9vbHMuR2VuZXJhdG9yLlYxYWxwaGHKAhhUb29sc1xHZW5lcmF0b3JfXFYxYWxwaGHiAiRUb29sc1xHZW5lcmF0b3JfXFYxYWxwaGFcR1BCTWV0YWRhdGHqAhlUb29sczo6R2VuZXJhdG9yOjpWMWFscGhhYgZwcm90bzM", [file_google_protobuf_descriptor, file_sdk_v1alpha_sdk]);
var ConfidenceLevel;
(function(ConfidenceLevel2) {
  ConfidenceLevel2[ConfidenceLevel2["SAFE"] = 0] = "SAFE";
  ConfidenceLevel2[ConfidenceLevel2["LATEST"] = 1] = "LATEST";
  ConfidenceLevel2[ConfidenceLevel2["FINALIZED"] = 2] = "FINALIZED";
})(ConfidenceLevel || (ConfidenceLevel = {}));
var ReceiverContractExecutionStatus;
(function(ReceiverContractExecutionStatus2) {
  ReceiverContractExecutionStatus2[ReceiverContractExecutionStatus2["SUCCESS"] = 0] = "SUCCESS";
  ReceiverContractExecutionStatus2[ReceiverContractExecutionStatus2["REVERTED"] = 1] = "REVERTED";
})(ReceiverContractExecutionStatus || (ReceiverContractExecutionStatus = {}));
var TxStatus;
(function(TxStatus2) {
  TxStatus2[TxStatus2["FATAL"] = 0] = "FATAL";
  TxStatus2[TxStatus2["REVERTED"] = 1] = "REVERTED";
  TxStatus2[TxStatus2["SUCCESS"] = 2] = "SUCCESS";
})(TxStatus || (TxStatus = {}));
init_getAddress();
init_keccak256();
function publicKeyToAddress(publicKey) {
  const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
  return checksumAddress(`0x${address}`);
}
init_size();
init_fromHex();
init_toHex();
async function recoverPublicKey({ hash, signature }) {
  const hashHex = isHex(hash) ? hash : toHex(hash);
  const { secp256k1: secp256k12 } = await Promise.resolve().then(() => (init_secp256k1(), exports_secp256k1));
  const signature_ = (() => {
    if (typeof signature === "object" && "r" in signature && "s" in signature) {
      const { r, s, v, yParity } = signature;
      const yParityOrV2 = Number(yParity ?? v);
      const recoveryBit2 = toRecoveryBit(yParityOrV2);
      return new secp256k12.Signature(hexToBigInt(r), hexToBigInt(s)).addRecoveryBit(recoveryBit2);
    }
    const signatureHex = isHex(signature) ? signature : toHex(signature);
    if (size(signatureHex) !== 65)
      throw new Error("invalid signature length");
    const yParityOrV = hexToNumber(`0x${signatureHex.slice(130)}`);
    const recoveryBit = toRecoveryBit(yParityOrV);
    return secp256k12.Signature.fromCompact(signatureHex.substring(2, 130)).addRecoveryBit(recoveryBit);
  })();
  const publicKey = signature_.recoverPublicKey(hashHex.substring(2)).toHex(false);
  return `0x${publicKey}`;
}
function toRecoveryBit(yParityOrV) {
  if (yParityOrV === 0 || yParityOrV === 1)
    return yParityOrV;
  if (yParityOrV === 27)
    return 0;
  if (yParityOrV === 28)
    return 1;
  throw new Error("Invalid yParityOrV value");
}
async function recoverAddress({ hash, signature }) {
  return publicKeyToAddress(await recoverPublicKey({ hash, signature }));
}
init_toBytes();
init_toHex();
init_getAddress();
init_keccak256();
function productionEnvironment() {
  return {
    chainSelector: 5009297550715157269n,
    registryAddress: "0x76c9cf548b4179F8901cda1f8623568b58215E62"
  };
}

class DonModeError extends Error {
  constructor() {
    super("cannot use Runtime inside RunInNodeMode");
    this.name = "DonModeError";
  }
}

class NodeModeError extends Error {
  constructor() {
    super("cannot use NodeRuntime outside RunInNodeMode");
    this.name = "NodeModeError";
  }
}

class SecretsError extends Error {
  secretRequest;
  error;
  constructor(secretRequest, error) {
    super(`secret retrieval failed for ${secretRequest.id || "unknown"} (namespace: ${secretRequest.namespace || "default"}): ${error}. Verify the secret name is correct and that the secret has been configured for this workflow`);
    this.secretRequest = secretRequest;
    this.error = error;
    this.name = "SecretsError";
  }
}

class NullReportError extends Error {
  constructor() {
    super("null report");
    this.name = "NullReportError";
  }
}

class WrongSignatureCountError extends Error {
  constructor() {
    super("wrong number of signatures");
    this.name = "WrongSignatureCountError";
  }
}

class ParseSignatureError extends Error {
  constructor() {
    super("failed to parse signature");
    this.name = "ParseSignatureError";
  }
}

class RecoverSignerError extends Error {
  constructor() {
    super("failed to recover signer address from signature");
    this.name = "RecoverSignerError";
  }
}

class UnknownSignerError extends Error {
  constructor() {
    super("invalid signature");
    this.name = "UnknownSignerError";
  }
}

class DuplicateSignerError extends Error {
  constructor() {
    super("duplicate signer");
    this.name = "DuplicateSignerError";
  }
}

class RawReportTooShortError extends Error {
  need;
  got;
  constructor(need, got) {
    super(`raw report too short to contain metadata header: need ${need} bytes, got ${got}`);
    this.need = need;
    this.got = got;
    this.name = "RawReportTooShortError";
  }
}
var donInfoCache = new Map;
var GET_DON_SELECTOR = new Uint8Array([35, 83, 116, 5]);
var GET_NODES_BY_P2P_IDS_SELECTOR = new Uint8Array([5, 165, 25, 102]);
function cacheKey(env, donID) {
  return `${env.chainSelector.toString()}:${donID}`;
}
function normalizeRegistryHex(addr) {
  return addr.trim().replace(/^0[xX]/, "").toLowerCase();
}
function decodeRegistryAddress(registryAddress) {
  const hex = normalizeRegistryHex(registryAddress);
  if (hex.length !== 40) {
    throw new Error(`invalid registry address ${JSON.stringify(registryAddress)}`);
  }
  return hexToBytes(`0x${hex}`);
}
function padUint256(v) {
  const n = typeof v === "bigint" ? v : BigInt(v);
  const b = new Uint8Array(32);
  const view = new DataView(b.buffer);
  view.setBigUint64(24, n, false);
  return b;
}
function bytesToBigIntBE(word) {
  let x = 0n;
  for (let i = 0;i < word.length; i++) {
    x = x << 8n | BigInt(word[i]);
  }
  return x;
}
function readUint256AsInt(word) {
  const b = bytesToBigIntBE(word);
  if (b > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("ABI uint256 value too large for Number");
  }
  return Number(b);
}
function protoVarint(v) {
  const out = [];
  let n = typeof v === "bigint" ? v : BigInt(v);
  while (n >= 128n) {
    out.push(Number(n & 0x7fn) | 128);
    n >>= 7n;
  }
  out.push(Number(n));
  return out;
}
function protoTag(field, wireType) {
  return protoVarint(field << 3 | wireType);
}
function protoLenBytes(data) {
  return [...protoVarint(data.length), ...data];
}
function buildCallContractRequestBytes(registryAddr, callData) {
  const callMsg = new Uint8Array([
    ...protoTag(2, 2),
    ...protoLenBytes(registryAddr),
    ...protoTag(3, 2),
    ...protoLenBytes(callData)
  ]);
  const bigInt = new Uint8Array([
    ...protoTag(1, 2),
    ...protoLenBytes(new Uint8Array([3])),
    ...protoTag(2, 0),
    ...protoVarint(0xffffffffffffffffn)
  ]);
  return new Uint8Array([
    ...protoTag(2, 2),
    ...protoLenBytes(bigInt),
    ...protoTag(1, 2),
    ...protoLenBytes(callMsg)
  ]);
}
function decodeCallContractReplyData(bytes) {
  const reader = new BinaryReader(bytes);
  while (reader.pos < reader.len) {
    const [fieldNo, wireType] = reader.tag();
    if (fieldNo === 1 && wireType === WireType.LengthDelimited) {
      return reader.bytes();
    }
    reader.skip(wireType);
  }
  throw new Error("data field not found in CallContractReply");
}
var CALL_CONTRACT_REQUEST_TYPE_URL = "type.googleapis.com/capabilities.blockchain.evm.v1alpha.CallContractRequest";
function callContract(runtime, capID, registryAddr, callData) {
  const reqBytes = buildCallContractRequestBytes(registryAddr, callData);
  const anyPayload = create(AnySchema, {
    typeUrl: CALL_CONTRACT_REQUEST_TYPE_URL,
    value: reqBytes
  });
  const rt = runtime;
  const callbackId = rt.nextCallId++;
  const req = create(CapabilityRequestSchema, {
    id: capID,
    method: "CallContract",
    payload: anyPayload,
    callbackId
  });
  if (!rt.helpers.call(req)) {
    throw new Error(`EVM capability '${capID}' not found`);
  }
  const awaitResp = rt.helpers.await(create(AwaitCapabilitiesRequestSchema, { ids: [callbackId] }), rt.maxResponseSize);
  const capResp = awaitResp?.responses?.[callbackId];
  if (!capResp) {
    throw new Error(`no response from EVM capability '${capID}'`);
  }
  const response = capResp.response;
  if (response.case === "error") {
    throw new Error(response.value);
  }
  if (response.case !== "payload") {
    throw new Error(`unexpected response '${response.case}' from EVM capability '${capID}'`);
  }
  return decodeCallContractReplyData(response.value.value);
}
function encodeGetDONCalldata(donID) {
  const padded = new Uint8Array(32);
  const view = new DataView(padded.buffer);
  view.setUint32(28, donID >>> 0, false);
  const out = new Uint8Array(4 + 32);
  out.set(GET_DON_SELECTOR, 0);
  out.set(padded, 4);
  return out;
}
function concatBytes3(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const r = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    r.set(p, o);
    o += p.length;
  }
  return r;
}
function encodeGetNodesByP2PIdsCalldata(p2pIds) {
  const chunks = [
    GET_NODES_BY_P2P_IDS_SELECTOR,
    padUint256(32),
    padUint256(p2pIds.length)
  ];
  for (const id of p2pIds) {
    if (id.length !== 32) {
      throw new Error("p2p id must be 32 bytes");
    }
    chunks.push(new Uint8Array(id));
  }
  return concatBytes3(chunks);
}
var NODE_TUPLE_HEAD_SIZE = 288;
function fetchDONInfo(runtime, env, donID) {
  const key = cacheKey(env, donID);
  const hit = donInfoCache.get(key);
  if (hit) {
    return hit;
  }
  const registryAddr = decodeRegistryAddress(env.registryAddress);
  const capID = `evm:ChainSelector:${env.chainSelector.toString()}@1.0.0`;
  const getDONABI = callContract(runtime, capID, registryAddr, encodeGetDONCalldata(donID));
  if (getDONABI.length < 224) {
    throw new Error(`getDON ABI response too short: ${getDONABI.length} bytes`);
  }
  const f = readUint256AsInt(getDONABI.subarray(96, 128));
  const tupleStart = 32;
  const nodeP2PIdsPtr = readUint256AsInt(getDONABI.subarray(192, 224));
  const nodeCountOff = tupleStart + nodeP2PIdsPtr;
  if (nodeCountOff + 32 > getDONABI.length) {
    throw new Error("getDON ABI: nodeP2PIds pointer out of range");
  }
  const nodeCount = readUint256AsInt(getDONABI.subarray(nodeCountOff, nodeCountOff + 32));
  if (nodeCountOff + 32 + nodeCount * 32 > getDONABI.length) {
    throw new Error("getDON ABI: nodeP2PIds data out of range");
  }
  const nodeP2PIds = [];
  for (let i = 0;i < nodeCount; i++) {
    const start = nodeCountOff + 32 + i * 32;
    nodeP2PIds.push(getDONABI.subarray(start, start + 32));
  }
  if (nodeCount === 0) {
    const info2 = { f, signers: new Map };
    donInfoCache.set(key, info2);
    return info2;
  }
  const getNodesABI = callContract(runtime, capID, registryAddr, encodeGetNodesByP2PIdsCalldata(nodeP2PIds));
  if (getNodesABI.length < 64) {
    throw new Error(`getNodesByP2PIds ABI response too short: ${getNodesABI.length} bytes`);
  }
  const outerPtr = readUint256AsInt(getNodesABI.subarray(0, 32));
  if (outerPtr + 32 > getNodesABI.length) {
    throw new Error("getNodesByP2PIds ABI: outer pointer out of range");
  }
  const returnedCount = readUint256AsInt(getNodesABI.subarray(outerPtr, outerPtr + 32));
  const signers = new Map;
  for (let i = 0;i < returnedCount; i++) {
    const elemPtrOff = outerPtr + 32 + i * 32;
    if (elemPtrOff + 32 > getNodesABI.length) {
      break;
    }
    const elemPtr = readUint256AsInt(getNodesABI.subarray(elemPtrOff, elemPtrOff + 32));
    const tupleBase = outerPtr + 32 + elemPtr;
    if (tupleBase + NODE_TUPLE_HEAD_SIZE > getNodesABI.length) {
      break;
    }
    const nodeOperatorId = Number(bytesToBigIntBE(getNodesABI.subarray(tupleBase, tupleBase + 32)) & 0xffffffffn);
    const signerSlot = tupleBase + 3 * 32;
    const addrBytes = getNodesABI.subarray(signerSlot, signerSlot + 20);
    const addr = getAddress(toHex(addrBytes));
    signers.set(addr, nodeOperatorId);
  }
  const info = { f, signers };
  donInfoCache.set(key, info);
  return info;
}
function computeReportHash(rawReport, reportContext) {
  const innerHash = keccak256(toHex(rawReport));
  return keccak256(concatHex([innerHash, toHex(reportContext)]));
}
function addressKeyNo0x(addr) {
  return addr.slice(2).toLowerCase();
}
async function verifySigs(report, f, signers) {
  const required = f + 1;
  const sigs = report.sigs;
  if (sigs.length < required) {
    throw new WrongSignatureCountError;
  }
  const reportHash = computeReportHash(report.rawReport, report.reportContext);
  const seen = new Set;
  const accepted = [];
  const skipErrs = [];
  for (let i = 0;i < sigs.length; i++) {
    if (accepted.length === required) {
      break;
    }
    const attrSig = sigs[i];
    const sigBytes = new Uint8Array(attrSig.signature);
    if (sigBytes.length !== 65) {
      skipErrs.push(new ParseSignatureError);
      continue;
    }
    const normalized = new Uint8Array(sigBytes);
    if (normalized[64] === 27 || normalized[64] === 28) {
      normalized[64] -= 27;
    }
    let recovered;
    try {
      recovered = await recoverAddress({
        hash: reportHash,
        signature: toHex(normalized)
      });
    } catch {
      skipErrs.push(new RecoverSignerError);
      continue;
    }
    const key = addressKeyNo0x(recovered);
    if (seen.has(key)) {
      skipErrs.push(new DuplicateSignerError);
      continue;
    }
    seen.add(key);
    const nodeOperatorId = signers.get(key);
    if (nodeOperatorId === undefined) {
      skipErrs.push(new UnknownSignerError);
      continue;
    }
    attrSig.signerId = nodeOperatorId;
    accepted.push(attrSig);
  }
  if (accepted.length < required) {
    if (skipErrs.length > 0) {
      throw new AggregateError(skipErrs);
    }
    throw new WrongSignatureCountError;
  }
  report.sigs = accepted;
}
function mergeReportParseConfig(overrides) {
  return {
    acceptedZones: overrides?.acceptedZones ?? [],
    acceptedEnvironments: overrides !== undefined ? overrides.acceptedEnvironments ?? [] : [productionEnvironment()],
    skipSignatureVerification: overrides?.skipSignatureVerification ?? false
  };
}
function normalizeDonSigners(signers) {
  const out = new Map;
  for (const [addr, id] of signers) {
    out.set(addr.slice(2).toLowerCase(), id);
  }
  return out;
}
var REPORT_METADATA_HEADER_LENGTH = 109;
var REPORT_METADATA_OFFSETS = {
  version: 0,
  versionSize: 1,
  executionId: 1,
  executionIdSize: 32,
  timestamp: 33,
  timestampSize: 4,
  donId: 37,
  donIdSize: 4,
  donConfigVersion: 41,
  donConfigVersionSize: 4,
  workflowId: 45,
  workflowIdSize: 32,
  workflowName: 77,
  workflowNameSize: 10,
  workflowOwner: 87,
  workflowOwnerSize: 20,
  reportId: 107,
  reportIdSize: 2,
  bodyStart: 109
};
function encodeHexLower(bytes) {
  let out = "";
  for (let i = 0;i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
function readUint32BE(raw, offset) {
  return new DataView(raw.buffer, raw.byteOffset + offset, 4).getUint32(0, false);
}
function parseReportMetadataHeader(raw) {
  if (raw === undefined || raw === null) {
    throw new NullReportError;
  }
  if (raw.length < REPORT_METADATA_HEADER_LENGTH) {
    throw new RawReportTooShortError(REPORT_METADATA_HEADER_LENGTH, raw.length);
  }
  const o = REPORT_METADATA_OFFSETS;
  const workflowNameBytes = raw.subarray(o.workflowName, o.workflowName + o.workflowNameSize);
  return {
    version: raw[o.version],
    executionId: encodeHexLower(raw.subarray(o.executionId, o.executionId + o.executionIdSize)),
    timestamp: readUint32BE(raw, o.timestamp),
    donId: readUint32BE(raw, o.donId),
    donConfigVersion: readUint32BE(raw, o.donConfigVersion),
    workflowId: encodeHexLower(raw.subarray(o.workflowId, o.workflowId + o.workflowIdSize)),
    workflowName: new TextDecoder("utf-8", { fatal: false }).decode(workflowNameBytes),
    workflowOwner: encodeHexLower(raw.subarray(o.workflowOwner, o.workflowOwner + o.workflowOwnerSize)),
    reportId: encodeHexLower(raw.subarray(o.reportId, o.reportId + o.reportIdSize)),
    body: raw.subarray(REPORT_METADATA_HEADER_LENGTH)
  };
}

class Report {
  report;
  cachedHeader;
  constructor(report) {
    this.report = report.$typeName ? report : fromJson(ReportResponseSchema, report);
  }
  static async parse(runtime, rawReport, signatures, reportContext, config) {
    const configDigest = reportContext.length >= 32 ? reportContext.slice(0, 32) : new Uint8Array(32);
    const seqNr = reportContext.length >= 40 ? new DataView(reportContext.buffer, reportContext.byteOffset + 32, 8).getBigUint64(0, false) : 0n;
    const reportResponse = create(ReportResponseSchema, {
      configDigest,
      seqNr,
      reportContext,
      rawReport,
      sigs: signatures.map((signature) => create(AttributedSignatureSchema, { signature, signerId: 0 }))
    });
    const merged = mergeReportParseConfig(config);
    const report = new Report(reportResponse);
    if (merged.skipSignatureVerification) {
      report.donId();
      return report;
    }
    await report.verifySignaturesWithConfig(runtime, merged);
    return report;
  }
  parseHeader() {
    if (this.cachedHeader !== undefined) {
      return this.cachedHeader;
    }
    this.cachedHeader = parseReportMetadataHeader(this.report.rawReport);
    return this.cachedHeader;
  }
  async verifySignaturesWithConfig(runtime, config) {
    const donId = this.donId();
    const candidates = [];
    for (const z of config.acceptedZones) {
      if (z.donID === donId) {
        candidates.push(z.environment);
      }
    }
    candidates.push(...config.acceptedEnvironments);
    if (candidates.length === 0) {
      throw new Error(`DON ID ${donId} is not in accepted zones`);
    }
    const fetchFailures = [];
    let lastVerifyErr = null;
    for (const env of candidates) {
      let info;
      try {
        info = fetchDONInfo(runtime, env, donId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        fetchFailures.push(new Error(`could not read from chain ${env.chainSelector} contract ${env.registryAddress}: ${msg}`));
        continue;
      }
      try {
        await verifySigs(this.report, info.f, normalizeDonSigners(info.signers));
        return;
      } catch (err) {
        lastVerifyErr = err instanceof Error ? err : new Error(String(err));
      }
    }
    if (fetchFailures.length > 0) {
      throw new AggregateError(fetchFailures, fetchFailures.map((e) => e.message).join(`
`));
    }
    if (lastVerifyErr !== null) {
      throw lastVerifyErr;
    }
  }
  seqNr() {
    return this.report.seqNr;
  }
  configDigest() {
    return this.report.configDigest;
  }
  reportContext() {
    return this.report.reportContext;
  }
  rawReport() {
    return this.report.rawReport;
  }
  version() {
    return this.parseHeader().version;
  }
  executionId() {
    return this.parseHeader().executionId;
  }
  timestamp() {
    return this.parseHeader().timestamp;
  }
  donId() {
    return this.parseHeader().donId;
  }
  donConfigVersion() {
    return this.parseHeader().donConfigVersion;
  }
  workflowId() {
    return this.parseHeader().workflowId;
  }
  workflowName() {
    return this.parseHeader().workflowName;
  }
  workflowOwner() {
    return this.parseHeader().workflowOwner;
  }
  reportId() {
    return this.parseHeader().reportId;
  }
  body() {
    return this.parseHeader().body;
  }
  x_generatedCodeOnly_unwrap() {
    return this.report;
  }
}
var file_capabilities_networking_http_v1alpha_client = /* @__PURE__ */ fileDesc("CjFjYXBhYmlsaXRpZXMvbmV0d29ya2luZy9odHRwL3YxYWxwaGEvY2xpZW50LnByb3RvEiRjYXBhYmlsaXRpZXMubmV0d29ya2luZy5odHRwLnYxYWxwaGEiSgoNQ2FjaGVTZXR0aW5ncxINCgVzdG9yZRgBIAEoCBIqCgdtYXhfYWdlGAIgASgLMhkuZ29vZ2xlLnByb3RvYnVmLkR1cmF0aW9uIh4KDEhlYWRlclZhbHVlcxIOCgZ2YWx1ZXMYASADKAki7wMKB1JlcXVlc3QSCwoDdXJsGAEgASgJEg4KBm1ldGhvZBgCIAEoCRJPCgdoZWFkZXJzGAMgAygLMjouY2FwYWJpbGl0aWVzLm5ldHdvcmtpbmcuaHR0cC52MWFscGhhLlJlcXVlc3QuSGVhZGVyc0VudHJ5QgIYARIMCgRib2R5GAQgASgMEioKB3RpbWVvdXQYBSABKAsyGS5nb29nbGUucHJvdG9idWYuRHVyYXRpb24SSwoOY2FjaGVfc2V0dGluZ3MYBiABKAsyMy5jYXBhYmlsaXRpZXMubmV0d29ya2luZy5odHRwLnYxYWxwaGEuQ2FjaGVTZXR0aW5ncxJWCg1tdWx0aV9oZWFkZXJzGAcgAygLMj8uY2FwYWJpbGl0aWVzLm5ldHdvcmtpbmcuaHR0cC52MWFscGhhLlJlcXVlc3QuTXVsdGlIZWFkZXJzRW50cnkaLgoMSGVhZGVyc0VudHJ5EgsKA2tleRgBIAEoCRINCgV2YWx1ZRgCIAEoCToCOAEaZwoRTXVsdGlIZWFkZXJzRW50cnkSCwoDa2V5GAEgASgJEkEKBXZhbHVlGAIgASgLMjIuY2FwYWJpbGl0aWVzLm5ldHdvcmtpbmcuaHR0cC52MWFscGhhLkhlYWRlclZhbHVlczoCOAEi8QIKCFJlc3BvbnNlEhMKC3N0YXR1c19jb2RlGAEgASgNElAKB2hlYWRlcnMYAiADKAsyOy5jYXBhYmlsaXRpZXMubmV0d29ya2luZy5odHRwLnYxYWxwaGEuUmVzcG9uc2UuSGVhZGVyc0VudHJ5QgIYARIMCgRib2R5GAMgASgMElcKDW11bHRpX2hlYWRlcnMYBCADKAsyQC5jYXBhYmlsaXRpZXMubmV0d29ya2luZy5odHRwLnYxYWxwaGEuUmVzcG9uc2UuTXVsdGlIZWFkZXJzRW50cnkaLgoMSGVhZGVyc0VudHJ5EgsKA2tleRgBIAEoCRINCgV2YWx1ZRgCIAEoCToCOAEaZwoRTXVsdGlIZWFkZXJzRW50cnkSCwoDa2V5GAEgASgJEkEKBXZhbHVlGAIgASgLMjIuY2FwYWJpbGl0aWVzLm5ldHdvcmtpbmcuaHR0cC52MWFscGhhLkhlYWRlclZhbHVlczoCOAEymAEKBkNsaWVudBJsCgtTZW5kUmVxdWVzdBItLmNhcGFiaWxpdGllcy5uZXR3b3JraW5nLmh0dHAudjFhbHBoYS5SZXF1ZXN0Gi4uY2FwYWJpbGl0aWVzLm5ldHdvcmtpbmcuaHR0cC52MWFscGhhLlJlc3BvbnNlGiCCtRgcCAISGGh0dHAtYWN0aW9uc0AxLjAuMC1hbHBoYULqAQooY29tLmNhcGFiaWxpdGllcy5uZXR3b3JraW5nLmh0dHAudjFhbHBoYUILQ2xpZW50UHJvdG9QAaICA0NOSKoCJENhcGFiaWxpdGllcy5OZXR3b3JraW5nLkh0dHAuVjFhbHBoYcoCJENhcGFiaWxpdGllc1xOZXR3b3JraW5nXEh0dHBcVjFhbHBoYeICMENhcGFiaWxpdGllc1xOZXR3b3JraW5nXEh0dHBcVjFhbHBoYVxHUEJNZXRhZGF0YeoCJ0NhcGFiaWxpdGllczo6TmV0d29ya2luZzo6SHR0cDo6VjFhbHBoYWIGcHJvdG8z", [file_google_protobuf_duration, file_tools_generator_v1alpha_cre_metadata]);
var RequestSchema = /* @__PURE__ */ messageDesc(file_capabilities_networking_http_v1alpha_client, 2);
var ResponseSchema = /* @__PURE__ */ messageDesc(file_capabilities_networking_http_v1alpha_client, 3);

class SendRequester {
  runtime;
  client;
  constructor(runtime, client) {
    this.runtime = runtime;
    this.client = client;
  }
  sendRequest(input) {
    return this.client.sendRequest(this.runtime, input);
  }
}

class ClientCapability {
  static CAPABILITY_ID = "http-actions@1.0.0-alpha";
  static CAPABILITY_NAME = "http-actions";
  static CAPABILITY_VERSION = "1.0.0-alpha";
  sendRequest(...args) {
    if (typeof args[1] === "function") {
      const [runtime2, fn, consensusAggregation, unwrapOptions] = args;
      return this.sendRequestSugarHelper(runtime2, fn, consensusAggregation, unwrapOptions);
    }
    const [runtime, input] = args;
    return this.sendRequestCallHelper(runtime, input);
  }
  sendRequestCallHelper(runtime, input) {
    let payload;
    if (input.$typeName) {
      payload = input;
    } else {
      payload = fromJson(RequestSchema, input);
    }
    const capabilityId = ClientCapability.CAPABILITY_ID;
    const capabilityResponse = runtime.callCapability({
      capabilityId,
      method: "SendRequest",
      payload,
      inputSchema: RequestSchema,
      outputSchema: ResponseSchema
    });
    return {
      result: () => {
        const result = capabilityResponse.result();
        return result;
      }
    };
  }
  sendRequestSugarHelper(runtime, fn, consensusAggregation, unwrapOptions) {
    const wrappedFn = (runtime2, ...args) => {
      const sendRequester = new SendRequester(runtime2, this);
      return fn(sendRequester, ...args);
    };
    return runtime.runInNodeMode(wrappedFn, consensusAggregation, unwrapOptions);
  }
}
var KeyType;
(function(KeyType2) {
  KeyType2[KeyType2["UNSPECIFIED"] = 0] = "UNSPECIFIED";
  KeyType2[KeyType2["ECDSA_EVM"] = 1] = "ECDSA_EVM";
})(KeyType || (KeyType = {}));
var file_capabilities_scheduler_cron_v1_trigger = /* @__PURE__ */ fileDesc("CixjYXBhYmlsaXRpZXMvc2NoZWR1bGVyL2Nyb24vdjEvdHJpZ2dlci5wcm90bxIeY2FwYWJpbGl0aWVzLnNjaGVkdWxlci5jcm9uLnYxIhoKBkNvbmZpZxIQCghzY2hlZHVsZRgBIAEoCSJHCgdQYXlsb2FkEjwKGHNjaGVkdWxlZF9leGVjdXRpb25fdGltZRgBIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXAiNQoNTGVnYWN5UGF5bG9hZBIgChhzY2hlZHVsZWRfZXhlY3V0aW9uX3RpbWUYASABKAk6AhgBMvUBCgRDcm9uElwKB1RyaWdnZXISJi5jYXBhYmlsaXRpZXMuc2NoZWR1bGVyLmNyb24udjEuQ29uZmlnGicuY2FwYWJpbGl0aWVzLnNjaGVkdWxlci5jcm9uLnYxLlBheWxvYWQwARJzCg1MZWdhY3lUcmlnZ2VyEiYuY2FwYWJpbGl0aWVzLnNjaGVkdWxlci5jcm9uLnYxLkNvbmZpZxotLmNhcGFiaWxpdGllcy5zY2hlZHVsZXIuY3Jvbi52MS5MZWdhY3lQYXlsb2FkIgmIAgGKtRgCCAEwARoagrUYFggBEhJjcm9uLXRyaWdnZXJAMS4wLjBCzQEKImNvbS5jYXBhYmlsaXRpZXMuc2NoZWR1bGVyLmNyb24udjFCDFRyaWdnZXJQcm90b1ABogIDQ1NDqgIeQ2FwYWJpbGl0aWVzLlNjaGVkdWxlci5Dcm9uLlYxygIeQ2FwYWJpbGl0aWVzXFNjaGVkdWxlclxDcm9uXFYx4gIqQ2FwYWJpbGl0aWVzXFNjaGVkdWxlclxDcm9uXFYxXEdQQk1ldGFkYXRh6gIhQ2FwYWJpbGl0aWVzOjpTY2hlZHVsZXI6OkNyb246OlYxYgZwcm90bzM", [file_google_protobuf_timestamp, file_tools_generator_v1alpha_cre_metadata]);
var ConfigSchema2 = /* @__PURE__ */ messageDesc(file_capabilities_scheduler_cron_v1_trigger, 0);
var PayloadSchema2 = /* @__PURE__ */ messageDesc(file_capabilities_scheduler_cron_v1_trigger, 1);

class CronCapability {
  static CAPABILITY_ID = "cron-trigger@1.0.0";
  static CAPABILITY_NAME = "cron-trigger";
  static CAPABILITY_VERSION = "1.0.0";
  trigger(config) {
    const capabilityId = CronCapability.CAPABILITY_ID;
    return new CronTrigger(config, capabilityId, "Trigger");
  }
}

class CronTrigger {
  _capabilityId;
  _method;
  config;
  constructor(config, _capabilityId, _method) {
    this._capabilityId = _capabilityId;
    this._method = _method;
    this.config = config.$typeName ? config : fromJson(ConfigSchema2, config);
  }
  capabilityId() {
    return this._capabilityId;
  }
  method() {
    return this._method;
  }
  outputSchema() {
    return PayloadSchema2;
  }
  configAsAny() {
    return anyPack(ConfigSchema2, this.config);
  }
  adapt(rawOutput) {
    return rawOutput;
  }
}
var lookup = [];
var revLookup = [];
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (i = 0, len = code.length;i < len; ++i)
  lookup[i] = code[i], revLookup[code.charCodeAt(i)] = i;
var i;
var len;
revLookup[45] = 62;
revLookup[95] = 63;
function getLens(b64) {
  var len2 = b64.length;
  if (len2 % 4 > 0)
    throw Error("Invalid string. Length must be a multiple of 4");
  var validLen = b64.indexOf("=");
  if (validLen === -1)
    validLen = len2;
  var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
  return [validLen, placeHoldersLen];
}
function _byteLength(validLen, placeHoldersLen) {
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function toByteArray(b64) {
  var tmp, lens = getLens(b64), validLen = lens[0], placeHoldersLen = lens[1], arr = new Uint8Array(_byteLength(validLen, placeHoldersLen)), curByte = 0, len2 = placeHoldersLen > 0 ? validLen - 4 : validLen, i2;
  for (i2 = 0;i2 < len2; i2 += 4)
    tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)], arr[curByte++] = tmp >> 16 & 255, arr[curByte++] = tmp >> 8 & 255, arr[curByte++] = tmp & 255;
  if (placeHoldersLen === 2)
    tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4, arr[curByte++] = tmp & 255;
  if (placeHoldersLen === 1)
    tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2, arr[curByte++] = tmp >> 8 & 255, arr[curByte++] = tmp & 255;
  return arr;
}
function tripletToBase64(num2) {
  return lookup[num2 >> 18 & 63] + lookup[num2 >> 12 & 63] + lookup[num2 >> 6 & 63] + lookup[num2 & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp, output = [];
  for (var i2 = start;i2 < end; i2 += 3)
    tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255), output.push(tripletToBase64(tmp));
  return output.join("");
}
function fromByteArray(uint8) {
  var tmp, len2 = uint8.length, extraBytes = len2 % 3, parts = [], maxChunkLength = 16383;
  for (var i2 = 0, len22 = len2 - extraBytes;i2 < len22; i2 += maxChunkLength)
    parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
  if (extraBytes === 1)
    tmp = uint8[len2 - 1], parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
  else if (extraBytes === 2)
    tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1], parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
  return parts.join("");
}
function read(buffer, offset, isLE2, mLen, nBytes) {
  var e, m, eLen = nBytes * 8 - mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1, nBits = -7, i2 = isLE2 ? nBytes - 1 : 0, d = isLE2 ? -1 : 1, s = buffer[offset + i2];
  i2 += d, e = s & (1 << -nBits) - 1, s >>= -nBits, nBits += eLen;
  for (;nBits > 0; e = e * 256 + buffer[offset + i2], i2 += d, nBits -= 8)
    ;
  m = e & (1 << -nBits) - 1, e >>= -nBits, nBits += mLen;
  for (;nBits > 0; m = m * 256 + buffer[offset + i2], i2 += d, nBits -= 8)
    ;
  if (e === 0)
    e = 1 - eBias;
  else if (e === eMax)
    return m ? NaN : (s ? -1 : 1) * (1 / 0);
  else
    m = m + Math.pow(2, mLen), e = e - eBias;
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
}
function write(buffer, value, offset, isLE2, mLen, nBytes) {
  var e, m, c, eLen = nBytes * 8 - mLen - 1, eMax = (1 << eLen) - 1, eBias = eMax >> 1, rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, i2 = isLE2 ? 0 : nBytes - 1, d = isLE2 ? 1 : -1, s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  if (value = Math.abs(value), isNaN(value) || value === 1 / 0)
    m = isNaN(value) ? 1 : 0, e = eMax;
  else {
    if (e = Math.floor(Math.log(value) / Math.LN2), value * (c = Math.pow(2, -e)) < 1)
      e--, c *= 2;
    if (e + eBias >= 1)
      value += rt / c;
    else
      value += rt * Math.pow(2, 1 - eBias);
    if (value * c >= 2)
      e++, c /= 2;
    if (e + eBias >= eMax)
      m = 0, e = eMax;
    else if (e + eBias >= 1)
      m = (value * c - 1) * Math.pow(2, mLen), e = e + eBias;
    else
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen), e = 0;
  }
  for (;mLen >= 8; buffer[offset + i2] = m & 255, i2 += d, m /= 256, mLen -= 8)
    ;
  e = e << mLen | m, eLen += mLen;
  for (;eLen > 0; buffer[offset + i2] = e & 255, i2 += d, e /= 256, eLen -= 8)
    ;
  buffer[offset + i2 - d] |= s * 128;
}
var customInspectSymbol = typeof Symbol === "function" && typeof Symbol.for === "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
var INSPECT_MAX_BYTES = 50;
var kMaxLength = 2147483647;
var btoa = globalThis.btoa;
var atob2 = globalThis.atob;
var File = globalThis.File;
var Blob = globalThis.Blob;
function createBuffer(length) {
  if (length > kMaxLength)
    throw RangeError('The value "' + length + '" is invalid for option "size"');
  let buf = new Uint8Array(length);
  return Object.setPrototypeOf(buf, Buffer2.prototype), buf;
}
function E(sym, getMessage, Base) {
  return class extends Base {
    constructor() {
      super();
      Object.defineProperty(this, "message", { value: getMessage.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${sym}]`, this.stack, delete this.name;
    }
    get code() {
      return sym;
    }
    set code(value) {
      Object.defineProperty(this, "code", { configurable: true, enumerable: true, value, writable: true });
    }
    toString() {
      return `${this.name} [${sym}]: ${this.message}`;
    }
  };
}
var ERR_BUFFER_OUT_OF_BOUNDS = E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
  if (name)
    return `${name} is outside of buffer bounds`;
  return "Attempt to access memory outside buffer bounds";
}, RangeError);
var ERR_INVALID_ARG_TYPE = E("ERR_INVALID_ARG_TYPE", function(name, actual) {
  return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
}, TypeError);
var ERR_OUT_OF_RANGE = E("ERR_OUT_OF_RANGE", function(str, range, input) {
  let msg = `The value of "${str}" is out of range.`, received = input;
  if (Number.isInteger(input) && Math.abs(input) > 4294967296)
    received = addNumericalSeparator(String(input));
  else if (typeof input === "bigint") {
    if (received = String(input), input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32)))
      received = addNumericalSeparator(received);
    received += "n";
  }
  return msg += ` It must be ${range}. Received ${received}`, msg;
}, RangeError);
function Buffer2(arg, encodingOrOffset, length) {
  if (typeof arg === "number") {
    if (typeof encodingOrOffset === "string")
      throw TypeError('The "string" argument must be of type string. Received type number');
    return allocUnsafe(arg);
  }
  return from(arg, encodingOrOffset, length);
}
Object.defineProperty(Buffer2.prototype, "parent", { enumerable: true, get: function() {
  if (!Buffer2.isBuffer(this))
    return;
  return this.buffer;
} });
Object.defineProperty(Buffer2.prototype, "offset", { enumerable: true, get: function() {
  if (!Buffer2.isBuffer(this))
    return;
  return this.byteOffset;
} });
Buffer2.poolSize = 8192;
function from(value, encodingOrOffset, length) {
  if (typeof value === "string")
    return fromString(value, encodingOrOffset);
  if (ArrayBuffer.isView(value))
    return fromArrayView(value);
  if (value == null)
    throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
  if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer))
    return fromArrayBuffer(value, encodingOrOffset, length);
  if (typeof SharedArrayBuffer < "u" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer)))
    return fromArrayBuffer(value, encodingOrOffset, length);
  if (typeof value === "number")
    throw TypeError('The "value" argument must not be of type number. Received type number');
  let valueOf = value.valueOf && value.valueOf();
  if (valueOf != null && valueOf !== value)
    return Buffer2.from(valueOf, encodingOrOffset, length);
  let b = fromObject(value);
  if (b)
    return b;
  if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function")
    return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
  throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
}
Buffer2.from = function(value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length);
};
Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
Object.setPrototypeOf(Buffer2, Uint8Array);
function assertSize2(size2) {
  if (typeof size2 !== "number")
    throw TypeError('"size" argument must be of type number');
  else if (size2 < 0)
    throw RangeError('The value "' + size2 + '" is invalid for option "size"');
}
function alloc(size2, fill, encoding) {
  if (assertSize2(size2), size2 <= 0)
    return createBuffer(size2);
  if (fill !== undefined)
    return typeof encoding === "string" ? createBuffer(size2).fill(fill, encoding) : createBuffer(size2).fill(fill);
  return createBuffer(size2);
}
Buffer2.alloc = function(size2, fill, encoding) {
  return alloc(size2, fill, encoding);
};
function allocUnsafe(size2) {
  return assertSize2(size2), createBuffer(size2 < 0 ? 0 : checked(size2) | 0);
}
Buffer2.allocUnsafe = function(size2) {
  return allocUnsafe(size2);
};
Buffer2.allocUnsafeSlow = function(size2) {
  return allocUnsafe(size2);
};
function fromString(string, encoding) {
  if (typeof encoding !== "string" || encoding === "")
    encoding = "utf8";
  if (!Buffer2.isEncoding(encoding))
    throw TypeError("Unknown encoding: " + encoding);
  let length = byteLength(string, encoding) | 0, buf = createBuffer(length), actual = buf.write(string, encoding);
  if (actual !== length)
    buf = buf.slice(0, actual);
  return buf;
}
function fromArrayLike(array) {
  let length = array.length < 0 ? 0 : checked(array.length) | 0, buf = createBuffer(length);
  for (let i2 = 0;i2 < length; i2 += 1)
    buf[i2] = array[i2] & 255;
  return buf;
}
function fromArrayView(arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    let copy = new Uint8Array(arrayView);
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
  }
  return fromArrayLike(arrayView);
}
function fromArrayBuffer(array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset)
    throw RangeError('"offset" is outside of buffer bounds');
  if (array.byteLength < byteOffset + (length || 0))
    throw RangeError('"length" is outside of buffer bounds');
  let buf;
  if (byteOffset === undefined && length === undefined)
    buf = new Uint8Array(array);
  else if (length === undefined)
    buf = new Uint8Array(array, byteOffset);
  else
    buf = new Uint8Array(array, byteOffset, length);
  return Object.setPrototypeOf(buf, Buffer2.prototype), buf;
}
function fromObject(obj) {
  if (Buffer2.isBuffer(obj)) {
    let len2 = checked(obj.length) | 0, buf = createBuffer(len2);
    if (buf.length === 0)
      return buf;
    return obj.copy(buf, 0, 0, len2), buf;
  }
  if (obj.length !== undefined) {
    if (typeof obj.length !== "number" || Number.isNaN(obj.length))
      return createBuffer(0);
    return fromArrayLike(obj);
  }
  if (obj.type === "Buffer" && Array.isArray(obj.data))
    return fromArrayLike(obj.data);
}
function checked(length) {
  if (length >= kMaxLength)
    throw RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + kMaxLength.toString(16) + " bytes");
  return length | 0;
}
Buffer2.isBuffer = function(b) {
  return b != null && b._isBuffer === true && b !== Buffer2.prototype;
};
Buffer2.compare = function(a, b) {
  if (isInstance(a, Uint8Array))
    a = Buffer2.from(a, a.offset, a.byteLength);
  if (isInstance(b, Uint8Array))
    b = Buffer2.from(b, b.offset, b.byteLength);
  if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b))
    throw TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
  if (a === b)
    return 0;
  let x = a.length, y = b.length;
  for (let i2 = 0, len2 = Math.min(x, y);i2 < len2; ++i2)
    if (a[i2] !== b[i2]) {
      x = a[i2], y = b[i2];
      break;
    }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
Buffer2.isEncoding = function(encoding) {
  switch (String(encoding).toLowerCase()) {
    case "hex":
    case "utf8":
    case "utf-8":
    case "ascii":
    case "latin1":
    case "binary":
    case "base64":
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return true;
    default:
      return false;
  }
};
Buffer2.concat = function(list, length) {
  if (!Array.isArray(list))
    throw TypeError('"list" argument must be an Array of Buffers');
  if (list.length === 0)
    return Buffer2.alloc(0);
  let i2;
  if (length === undefined) {
    length = 0;
    for (i2 = 0;i2 < list.length; ++i2)
      length += list[i2].length;
  }
  let buffer = Buffer2.allocUnsafe(length), pos = 0;
  for (i2 = 0;i2 < list.length; ++i2) {
    let buf = list[i2];
    if (isInstance(buf, Uint8Array))
      if (pos + buf.length > buffer.length) {
        if (!Buffer2.isBuffer(buf))
          buf = Buffer2.from(buf);
        buf.copy(buffer, pos);
      } else
        Uint8Array.prototype.set.call(buffer, buf, pos);
    else if (!Buffer2.isBuffer(buf))
      throw TypeError('"list" argument must be an Array of Buffers');
    else
      buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};
function byteLength(string, encoding) {
  if (Buffer2.isBuffer(string))
    return string.length;
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer))
    return string.byteLength;
  if (typeof string !== "string")
    throw TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string);
  let len2 = string.length, mustMatch = arguments.length > 2 && arguments[2] === true;
  if (!mustMatch && len2 === 0)
    return 0;
  let loweredCase = false;
  for (;; )
    switch (encoding) {
      case "ascii":
      case "latin1":
      case "binary":
        return len2;
      case "utf8":
      case "utf-8":
        return utf8ToBytes2(string).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return len2 * 2;
      case "hex":
        return len2 >>> 1;
      case "base64":
        return base64ToBytes(string).length;
      default:
        if (loweredCase)
          return mustMatch ? -1 : utf8ToBytes2(string).length;
        encoding = ("" + encoding).toLowerCase(), loweredCase = true;
    }
}
Buffer2.byteLength = byteLength;
function slowToString(encoding, start, end) {
  let loweredCase = false;
  if (start === undefined || start < 0)
    start = 0;
  if (start > this.length)
    return "";
  if (end === undefined || end > this.length)
    end = this.length;
  if (end <= 0)
    return "";
  if (end >>>= 0, start >>>= 0, end <= start)
    return "";
  if (!encoding)
    encoding = "utf8";
  while (true)
    switch (encoding) {
      case "hex":
        return hexSlice(this, start, end);
      case "utf8":
      case "utf-8":
        return utf8Slice(this, start, end);
      case "ascii":
        return asciiSlice(this, start, end);
      case "latin1":
      case "binary":
        return latin1Slice(this, start, end);
      case "base64":
        return base64Slice(this, start, end);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return utf16leSlice(this, start, end);
      default:
        if (loweredCase)
          throw TypeError("Unknown encoding: " + encoding);
        encoding = (encoding + "").toLowerCase(), loweredCase = true;
    }
}
Buffer2.prototype._isBuffer = true;
function swap(b, n, m) {
  let i2 = b[n];
  b[n] = b[m], b[m] = i2;
}
Buffer2.prototype.swap16 = function() {
  let len2 = this.length;
  if (len2 % 2 !== 0)
    throw RangeError("Buffer size must be a multiple of 16-bits");
  for (let i2 = 0;i2 < len2; i2 += 2)
    swap(this, i2, i2 + 1);
  return this;
};
Buffer2.prototype.swap32 = function() {
  let len2 = this.length;
  if (len2 % 4 !== 0)
    throw RangeError("Buffer size must be a multiple of 32-bits");
  for (let i2 = 0;i2 < len2; i2 += 4)
    swap(this, i2, i2 + 3), swap(this, i2 + 1, i2 + 2);
  return this;
};
Buffer2.prototype.swap64 = function() {
  let len2 = this.length;
  if (len2 % 8 !== 0)
    throw RangeError("Buffer size must be a multiple of 64-bits");
  for (let i2 = 0;i2 < len2; i2 += 8)
    swap(this, i2, i2 + 7), swap(this, i2 + 1, i2 + 6), swap(this, i2 + 2, i2 + 5), swap(this, i2 + 3, i2 + 4);
  return this;
};
Buffer2.prototype.toString = function() {
  let length = this.length;
  if (length === 0)
    return "";
  if (arguments.length === 0)
    return utf8Slice(this, 0, length);
  return slowToString.apply(this, arguments);
};
Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
Buffer2.prototype.equals = function(b) {
  if (!Buffer2.isBuffer(b))
    throw TypeError("Argument must be a Buffer");
  if (this === b)
    return true;
  return Buffer2.compare(this, b) === 0;
};
Buffer2.prototype.inspect = function() {
  let str = "", max = INSPECT_MAX_BYTES;
  if (str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim(), this.length > max)
    str += " ... ";
  return "<Buffer " + str + ">";
};
if (customInspectSymbol)
  Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
Buffer2.prototype.compare = function(target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array))
    target = Buffer2.from(target, target.offset, target.byteLength);
  if (!Buffer2.isBuffer(target))
    throw TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target);
  if (start === undefined)
    start = 0;
  if (end === undefined)
    end = target ? target.length : 0;
  if (thisStart === undefined)
    thisStart = 0;
  if (thisEnd === undefined)
    thisEnd = this.length;
  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length)
    throw RangeError("out of range index");
  if (thisStart >= thisEnd && start >= end)
    return 0;
  if (thisStart >= thisEnd)
    return -1;
  if (start >= end)
    return 1;
  if (start >>>= 0, end >>>= 0, thisStart >>>= 0, thisEnd >>>= 0, this === target)
    return 0;
  let x = thisEnd - thisStart, y = end - start, len2 = Math.min(x, y), thisCopy = this.slice(thisStart, thisEnd), targetCopy = target.slice(start, end);
  for (let i2 = 0;i2 < len2; ++i2)
    if (thisCopy[i2] !== targetCopy[i2]) {
      x = thisCopy[i2], y = targetCopy[i2];
      break;
    }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
  if (buffer.length === 0)
    return -1;
  if (typeof byteOffset === "string")
    encoding = byteOffset, byteOffset = 0;
  else if (byteOffset > 2147483647)
    byteOffset = 2147483647;
  else if (byteOffset < -2147483648)
    byteOffset = -2147483648;
  if (byteOffset = +byteOffset, Number.isNaN(byteOffset))
    byteOffset = dir ? 0 : buffer.length - 1;
  if (byteOffset < 0)
    byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length)
    if (dir)
      return -1;
    else
      byteOffset = buffer.length - 1;
  else if (byteOffset < 0)
    if (dir)
      byteOffset = 0;
    else
      return -1;
  if (typeof val === "string")
    val = Buffer2.from(val, encoding);
  if (Buffer2.isBuffer(val)) {
    if (val.length === 0)
      return -1;
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
  } else if (typeof val === "number") {
    if (val = val & 255, typeof Uint8Array.prototype.indexOf === "function")
      if (dir)
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
      else
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
  }
  throw TypeError("val must be string, number or Buffer");
}
function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
  let indexSize = 1, arrLength = arr.length, valLength = val.length;
  if (encoding !== undefined) {
    if (encoding = String(encoding).toLowerCase(), encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
      if (arr.length < 2 || val.length < 2)
        return -1;
      indexSize = 2, arrLength /= 2, valLength /= 2, byteOffset /= 2;
    }
  }
  function read2(buf, i3) {
    if (indexSize === 1)
      return buf[i3];
    else
      return buf.readUInt16BE(i3 * indexSize);
  }
  let i2;
  if (dir) {
    let foundIndex = -1;
    for (i2 = byteOffset;i2 < arrLength; i2++)
      if (read2(arr, i2) === read2(val, foundIndex === -1 ? 0 : i2 - foundIndex)) {
        if (foundIndex === -1)
          foundIndex = i2;
        if (i2 - foundIndex + 1 === valLength)
          return foundIndex * indexSize;
      } else {
        if (foundIndex !== -1)
          i2 -= i2 - foundIndex;
        foundIndex = -1;
      }
  } else {
    if (byteOffset + valLength > arrLength)
      byteOffset = arrLength - valLength;
    for (i2 = byteOffset;i2 >= 0; i2--) {
      let found = true;
      for (let j = 0;j < valLength; j++)
        if (read2(arr, i2 + j) !== read2(val, j)) {
          found = false;
          break;
        }
      if (found)
        return i2;
    }
  }
  return -1;
}
Buffer2.prototype.includes = function(val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1;
};
Buffer2.prototype.indexOf = function(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};
Buffer2.prototype.lastIndexOf = function(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};
function hexWrite(buf, string, offset, length) {
  offset = Number(offset) || 0;
  let remaining = buf.length - offset;
  if (!length)
    length = remaining;
  else if (length = Number(length), length > remaining)
    length = remaining;
  let strLen = string.length;
  if (length > strLen / 2)
    length = strLen / 2;
  let i2;
  for (i2 = 0;i2 < length; ++i2) {
    let parsed = parseInt(string.substr(i2 * 2, 2), 16);
    if (Number.isNaN(parsed))
      return i2;
    buf[offset + i2] = parsed;
  }
  return i2;
}
function utf8Write(buf, string, offset, length) {
  return blitBuffer(utf8ToBytes2(string, buf.length - offset), buf, offset, length);
}
function asciiWrite(buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length);
}
function base64Write(buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length);
}
function ucs2Write(buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
}
Buffer2.prototype.write = function(string, offset, length, encoding) {
  if (offset === undefined)
    encoding = "utf8", length = this.length, offset = 0;
  else if (length === undefined && typeof offset === "string")
    encoding = offset, length = this.length, offset = 0;
  else if (isFinite(offset))
    if (offset = offset >>> 0, isFinite(length)) {
      if (length = length >>> 0, encoding === undefined)
        encoding = "utf8";
    } else
      encoding = length, length = undefined;
  else
    throw Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
  let remaining = this.length - offset;
  if (length === undefined || length > remaining)
    length = remaining;
  if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length)
    throw RangeError("Attempt to write outside buffer bounds");
  if (!encoding)
    encoding = "utf8";
  let loweredCase = false;
  for (;; )
    switch (encoding) {
      case "hex":
        return hexWrite(this, string, offset, length);
      case "utf8":
      case "utf-8":
        return utf8Write(this, string, offset, length);
      case "ascii":
      case "latin1":
      case "binary":
        return asciiWrite(this, string, offset, length);
      case "base64":
        return base64Write(this, string, offset, length);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return ucs2Write(this, string, offset, length);
      default:
        if (loweredCase)
          throw TypeError("Unknown encoding: " + encoding);
        encoding = ("" + encoding).toLowerCase(), loweredCase = true;
    }
};
Buffer2.prototype.toJSON = function() {
  return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
};
function base64Slice(buf, start, end) {
  if (start === 0 && end === buf.length)
    return fromByteArray(buf);
  else
    return fromByteArray(buf.slice(start, end));
}
function utf8Slice(buf, start, end) {
  end = Math.min(buf.length, end);
  let res = [], i2 = start;
  while (i2 < end) {
    let firstByte = buf[i2], codePoint = null, bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
    if (i2 + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint;
      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 128)
            codePoint = firstByte;
          break;
        case 2:
          if (secondByte = buf[i2 + 1], (secondByte & 192) === 128) {
            if (tempCodePoint = (firstByte & 31) << 6 | secondByte & 63, tempCodePoint > 127)
              codePoint = tempCodePoint;
          }
          break;
        case 3:
          if (secondByte = buf[i2 + 1], thirdByte = buf[i2 + 2], (secondByte & 192) === 128 && (thirdByte & 192) === 128) {
            if (tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63, tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343))
              codePoint = tempCodePoint;
          }
          break;
        case 4:
          if (secondByte = buf[i2 + 1], thirdByte = buf[i2 + 2], fourthByte = buf[i2 + 3], (secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
            if (tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63, tempCodePoint > 65535 && tempCodePoint < 1114112)
              codePoint = tempCodePoint;
          }
      }
    }
    if (codePoint === null)
      codePoint = 65533, bytesPerSequence = 1;
    else if (codePoint > 65535)
      codePoint -= 65536, res.push(codePoint >>> 10 & 1023 | 55296), codePoint = 56320 | codePoint & 1023;
    res.push(codePoint), i2 += bytesPerSequence;
  }
  return decodeCodePointsArray(res);
}
var MAX_ARGUMENTS_LENGTH = 4096;
function decodeCodePointsArray(codePoints) {
  let len2 = codePoints.length;
  if (len2 <= MAX_ARGUMENTS_LENGTH)
    return String.fromCharCode.apply(String, codePoints);
  let res = "", i2 = 0;
  while (i2 < len2)
    res += String.fromCharCode.apply(String, codePoints.slice(i2, i2 += MAX_ARGUMENTS_LENGTH));
  return res;
}
function asciiSlice(buf, start, end) {
  let ret = "";
  end = Math.min(buf.length, end);
  for (let i2 = start;i2 < end; ++i2)
    ret += String.fromCharCode(buf[i2] & 127);
  return ret;
}
function latin1Slice(buf, start, end) {
  let ret = "";
  end = Math.min(buf.length, end);
  for (let i2 = start;i2 < end; ++i2)
    ret += String.fromCharCode(buf[i2]);
  return ret;
}
function hexSlice(buf, start, end) {
  let len2 = buf.length;
  if (!start || start < 0)
    start = 0;
  if (!end || end < 0 || end > len2)
    end = len2;
  let out = "";
  for (let i2 = start;i2 < end; ++i2)
    out += hexSliceLookupTable[buf[i2]];
  return out;
}
function utf16leSlice(buf, start, end) {
  let bytes = buf.slice(start, end), res = "";
  for (let i2 = 0;i2 < bytes.length - 1; i2 += 2)
    res += String.fromCharCode(bytes[i2] + bytes[i2 + 1] * 256);
  return res;
}
Buffer2.prototype.slice = function(start, end) {
  let len2 = this.length;
  if (start = ~~start, end = end === undefined ? len2 : ~~end, start < 0) {
    if (start += len2, start < 0)
      start = 0;
  } else if (start > len2)
    start = len2;
  if (end < 0) {
    if (end += len2, end < 0)
      end = 0;
  } else if (end > len2)
    end = len2;
  if (end < start)
    end = start;
  let newBuf = this.subarray(start, end);
  return Object.setPrototypeOf(newBuf, Buffer2.prototype), newBuf;
};
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0)
    throw RangeError("offset is not uint");
  if (offset + ext > length)
    throw RangeError("Trying to access beyond buffer length");
}
Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function(offset, byteLength2, noAssert) {
  if (offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert)
    checkOffset(offset, byteLength2, this.length);
  let val = this[offset], mul = 1, i2 = 0;
  while (++i2 < byteLength2 && (mul *= 256))
    val += this[offset + i2] * mul;
  return val;
};
Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function(offset, byteLength2, noAssert) {
  if (offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert)
    checkOffset(offset, byteLength2, this.length);
  let val = this[offset + --byteLength2], mul = 1;
  while (byteLength2 > 0 && (mul *= 256))
    val += this[offset + --byteLength2] * mul;
  return val;
};
Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 1, this.length);
  return this[offset];
};
Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] | this[offset + 1] << 8;
};
Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] << 8 | this[offset + 1];
};
Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
};
Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
};
Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function(offset) {
  offset = offset >>> 0, validateNumber(offset, "offset");
  let first = this[offset], last = this[offset + 7];
  if (first === undefined || last === undefined)
    boundsError(offset, this.length - 8);
  let lo = first + this[++offset] * 256 + this[++offset] * 65536 + this[++offset] * 16777216, hi = this[++offset] + this[++offset] * 256 + this[++offset] * 65536 + last * 16777216;
  return BigInt(lo) + (BigInt(hi) << BigInt(32));
});
Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function(offset) {
  offset = offset >>> 0, validateNumber(offset, "offset");
  let first = this[offset], last = this[offset + 7];
  if (first === undefined || last === undefined)
    boundsError(offset, this.length - 8);
  let hi = first * 16777216 + this[++offset] * 65536 + this[++offset] * 256 + this[++offset], lo = this[++offset] * 16777216 + this[++offset] * 65536 + this[++offset] * 256 + last;
  return (BigInt(hi) << BigInt(32)) + BigInt(lo);
});
Buffer2.prototype.readIntLE = function(offset, byteLength2, noAssert) {
  if (offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert)
    checkOffset(offset, byteLength2, this.length);
  let val = this[offset], mul = 1, i2 = 0;
  while (++i2 < byteLength2 && (mul *= 256))
    val += this[offset + i2] * mul;
  if (mul *= 128, val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer2.prototype.readIntBE = function(offset, byteLength2, noAssert) {
  if (offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert)
    checkOffset(offset, byteLength2, this.length);
  let i2 = byteLength2, mul = 1, val = this[offset + --i2];
  while (i2 > 0 && (mul *= 256))
    val += this[offset + --i2] * mul;
  if (mul *= 128, val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer2.prototype.readInt8 = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 1, this.length);
  if (!(this[offset] & 128))
    return this[offset];
  return (255 - this[offset] + 1) * -1;
};
Buffer2.prototype.readInt16LE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 2, this.length);
  let val = this[offset] | this[offset + 1] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer2.prototype.readInt16BE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 2, this.length);
  let val = this[offset + 1] | this[offset] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer2.prototype.readInt32LE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
};
Buffer2.prototype.readInt32BE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
};
Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function(offset) {
  offset = offset >>> 0, validateNumber(offset, "offset");
  let first = this[offset], last = this[offset + 7];
  if (first === undefined || last === undefined)
    boundsError(offset, this.length - 8);
  let val = this[offset + 4] + this[offset + 5] * 256 + this[offset + 6] * 65536 + (last << 24);
  return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 256 + this[++offset] * 65536 + this[++offset] * 16777216);
});
Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function(offset) {
  offset = offset >>> 0, validateNumber(offset, "offset");
  let first = this[offset], last = this[offset + 7];
  if (first === undefined || last === undefined)
    boundsError(offset, this.length - 8);
  let val = (first << 24) + this[++offset] * 65536 + this[++offset] * 256 + this[++offset];
  return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 16777216 + this[++offset] * 65536 + this[++offset] * 256 + last);
});
Buffer2.prototype.readFloatLE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4);
};
Buffer2.prototype.readFloatBE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4);
};
Buffer2.prototype.readDoubleLE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8);
};
Buffer2.prototype.readDoubleBE = function(offset, noAssert) {
  if (offset = offset >>> 0, !noAssert)
    checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8);
};
function checkInt(buf, value, offset, ext, max, min) {
  if (!Buffer2.isBuffer(buf))
    throw TypeError('"buffer" argument must be a Buffer instance');
  if (value > max || value < min)
    throw RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length)
    throw RangeError("Index out of range");
}
Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function(value, offset, byteLength2, noAssert) {
  if (value = +value, offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert) {
    let maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  let mul = 1, i2 = 0;
  this[offset] = value & 255;
  while (++i2 < byteLength2 && (mul *= 256))
    this[offset + i2] = value / mul & 255;
  return offset + byteLength2;
};
Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function(value, offset, byteLength2, noAssert) {
  if (value = +value, offset = offset >>> 0, byteLength2 = byteLength2 >>> 0, !noAssert) {
    let maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  let i2 = byteLength2 - 1, mul = 1;
  this[offset + i2] = value & 255;
  while (--i2 >= 0 && (mul *= 256))
    this[offset + i2] = value / mul & 255;
  return offset + byteLength2;
};
Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 1, 255, 0);
  return this[offset] = value & 255, offset + 1;
};
Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  return this[offset] = value & 255, this[offset + 1] = value >>> 8, offset + 2;
};
Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  return this[offset] = value >>> 8, this[offset + 1] = value & 255, offset + 2;
};
Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  return this[offset + 3] = value >>> 24, this[offset + 2] = value >>> 16, this[offset + 1] = value >>> 8, this[offset] = value & 255, offset + 4;
};
Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  return this[offset] = value >>> 24, this[offset + 1] = value >>> 16, this[offset + 2] = value >>> 8, this[offset + 3] = value & 255, offset + 4;
};
function wrtBigUInt64LE(buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);
  let lo = Number(value & BigInt(4294967295));
  buf[offset++] = lo, lo = lo >> 8, buf[offset++] = lo, lo = lo >> 8, buf[offset++] = lo, lo = lo >> 8, buf[offset++] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(4294967295));
  return buf[offset++] = hi, hi = hi >> 8, buf[offset++] = hi, hi = hi >> 8, buf[offset++] = hi, hi = hi >> 8, buf[offset++] = hi, offset;
}
function wrtBigUInt64BE(buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);
  let lo = Number(value & BigInt(4294967295));
  buf[offset + 7] = lo, lo = lo >> 8, buf[offset + 6] = lo, lo = lo >> 8, buf[offset + 5] = lo, lo = lo >> 8, buf[offset + 4] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(4294967295));
  return buf[offset + 3] = hi, hi = hi >> 8, buf[offset + 2] = hi, hi = hi >> 8, buf[offset + 1] = hi, hi = hi >> 8, buf[offset] = hi, offset + 8;
}
Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function(value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function(value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer2.prototype.writeIntLE = function(value, offset, byteLength2, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert) {
    let limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  let i2 = 0, mul = 1, sub = 0;
  this[offset] = value & 255;
  while (++i2 < byteLength2 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i2 - 1] !== 0)
      sub = 1;
    this[offset + i2] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer2.prototype.writeIntBE = function(value, offset, byteLength2, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert) {
    let limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  let i2 = byteLength2 - 1, mul = 1, sub = 0;
  this[offset + i2] = value & 255;
  while (--i2 >= 0 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i2 + 1] !== 0)
      sub = 1;
    this[offset + i2] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer2.prototype.writeInt8 = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 1, 127, -128);
  if (value < 0)
    value = 255 + value + 1;
  return this[offset] = value & 255, offset + 1;
};
Buffer2.prototype.writeInt16LE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  return this[offset] = value & 255, this[offset + 1] = value >>> 8, offset + 2;
};
Buffer2.prototype.writeInt16BE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  return this[offset] = value >>> 8, this[offset + 1] = value & 255, offset + 2;
};
Buffer2.prototype.writeInt32LE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  return this[offset] = value & 255, this[offset + 1] = value >>> 8, this[offset + 2] = value >>> 16, this[offset + 3] = value >>> 24, offset + 4;
};
Buffer2.prototype.writeInt32BE = function(value, offset, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  if (value < 0)
    value = 4294967295 + value + 1;
  return this[offset] = value >>> 24, this[offset + 1] = value >>> 16, this[offset + 2] = value >>> 8, this[offset + 3] = value & 255, offset + 4;
};
Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function(value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function(value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
function checkIEEE754(buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length)
    throw RangeError("Index out of range");
  if (offset < 0)
    throw RangeError("Index out of range");
}
function writeFloat(buf, value, offset, littleEndian, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkIEEE754(buf, value, offset, 4, 340282346638528860000000000000000000000, -340282346638528860000000000000000000000);
  return write(buf, value, offset, littleEndian, 23, 4), offset + 4;
}
Buffer2.prototype.writeFloatLE = function(value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert);
};
Buffer2.prototype.writeFloatBE = function(value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert);
};
function writeDouble(buf, value, offset, littleEndian, noAssert) {
  if (value = +value, offset = offset >>> 0, !noAssert)
    checkIEEE754(buf, value, offset, 8, 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000);
  return write(buf, value, offset, littleEndian, 52, 8), offset + 8;
}
Buffer2.prototype.writeDoubleLE = function(value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert);
};
Buffer2.prototype.writeDoubleBE = function(value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert);
};
Buffer2.prototype.copy = function(target, targetStart, start, end) {
  if (!Buffer2.isBuffer(target))
    throw TypeError("argument should be a Buffer");
  if (!start)
    start = 0;
  if (!end && end !== 0)
    end = this.length;
  if (targetStart >= target.length)
    targetStart = target.length;
  if (!targetStart)
    targetStart = 0;
  if (end > 0 && end < start)
    end = start;
  if (end === start)
    return 0;
  if (target.length === 0 || this.length === 0)
    return 0;
  if (targetStart < 0)
    throw RangeError("targetStart out of bounds");
  if (start < 0 || start >= this.length)
    throw RangeError("Index out of range");
  if (end < 0)
    throw RangeError("sourceEnd out of bounds");
  if (end > this.length)
    end = this.length;
  if (target.length - targetStart < end - start)
    end = target.length - targetStart + start;
  let len2 = end - start;
  if (this === target && typeof Uint8Array.prototype.copyWithin === "function")
    this.copyWithin(targetStart, start, end);
  else
    Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
  return len2;
};
Buffer2.prototype.fill = function(val, start, end, encoding) {
  if (typeof val === "string") {
    if (typeof start === "string")
      encoding = start, start = 0, end = this.length;
    else if (typeof end === "string")
      encoding = end, end = this.length;
    if (encoding !== undefined && typeof encoding !== "string")
      throw TypeError("encoding must be a string");
    if (typeof encoding === "string" && !Buffer2.isEncoding(encoding))
      throw TypeError("Unknown encoding: " + encoding);
    if (val.length === 1) {
      let code2 = val.charCodeAt(0);
      if (encoding === "utf8" && code2 < 128 || encoding === "latin1")
        val = code2;
    }
  } else if (typeof val === "number")
    val = val & 255;
  else if (typeof val === "boolean")
    val = Number(val);
  if (start < 0 || this.length < start || this.length < end)
    throw RangeError("Out of range index");
  if (end <= start)
    return this;
  if (start = start >>> 0, end = end === undefined ? this.length : end >>> 0, !val)
    val = 0;
  let i2;
  if (typeof val === "number")
    for (i2 = start;i2 < end; ++i2)
      this[i2] = val;
  else {
    let bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding), len2 = bytes.length;
    if (len2 === 0)
      throw TypeError('The value "' + val + '" is invalid for argument "value"');
    for (i2 = 0;i2 < end - start; ++i2)
      this[i2 + start] = bytes[i2 % len2];
  }
  return this;
};
function addNumericalSeparator(val) {
  let res = "", i2 = val.length, start = val[0] === "-" ? 1 : 0;
  for (;i2 >= start + 4; i2 -= 3)
    res = `_${val.slice(i2 - 3, i2)}${res}`;
  return `${val.slice(0, i2)}${res}`;
}
function checkBounds(buf, offset, byteLength2) {
  if (validateNumber(offset, "offset"), buf[offset] === undefined || buf[offset + byteLength2] === undefined)
    boundsError(offset, buf.length - (byteLength2 + 1));
}
function checkIntBI(value, min, max, buf, offset, byteLength2) {
  if (value > max || value < min) {
    let n = typeof min === "bigint" ? "n" : "", range;
    if (byteLength2 > 3)
      if (min === 0 || min === BigInt(0))
        range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
      else
        range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
    else
      range = `>= ${min}${n} and <= ${max}${n}`;
    throw new ERR_OUT_OF_RANGE("value", range, value);
  }
  checkBounds(buf, offset, byteLength2);
}
function validateNumber(value, name) {
  if (typeof value !== "number")
    throw new ERR_INVALID_ARG_TYPE(name, "number", value);
}
function boundsError(value, length, type) {
  if (Math.floor(value) !== value)
    throw validateNumber(value, type), new ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
  if (length < 0)
    throw new ERR_BUFFER_OUT_OF_BOUNDS;
  throw new ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
}
var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
function base64clean(str) {
  if (str = str.split("=")[0], str = str.trim().replace(INVALID_BASE64_RE, ""), str.length < 2)
    return "";
  while (str.length % 4 !== 0)
    str = str + "=";
  return str;
}
function utf8ToBytes2(string, units) {
  units = units || 1 / 0;
  let codePoint, length = string.length, leadSurrogate = null, bytes = [];
  for (let i2 = 0;i2 < length; ++i2) {
    if (codePoint = string.charCodeAt(i2), codePoint > 55295 && codePoint < 57344) {
      if (!leadSurrogate) {
        if (codePoint > 56319) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        } else if (i2 + 1 === length) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        }
        leadSurrogate = codePoint;
        continue;
      }
      if (codePoint < 56320) {
        if ((units -= 3) > -1)
          bytes.push(239, 191, 189);
        leadSurrogate = codePoint;
        continue;
      }
      codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
    } else if (leadSurrogate) {
      if ((units -= 3) > -1)
        bytes.push(239, 191, 189);
    }
    if (leadSurrogate = null, codePoint < 128) {
      if ((units -= 1) < 0)
        break;
      bytes.push(codePoint);
    } else if (codePoint < 2048) {
      if ((units -= 2) < 0)
        break;
      bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
    } else if (codePoint < 65536) {
      if ((units -= 3) < 0)
        break;
      bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else if (codePoint < 1114112) {
      if ((units -= 4) < 0)
        break;
      bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else
      throw Error("Invalid code point");
  }
  return bytes;
}
function asciiToBytes(str) {
  let byteArray = [];
  for (let i2 = 0;i2 < str.length; ++i2)
    byteArray.push(str.charCodeAt(i2) & 255);
  return byteArray;
}
function utf16leToBytes(str, units) {
  let c, hi, lo, byteArray = [];
  for (let i2 = 0;i2 < str.length; ++i2) {
    if ((units -= 2) < 0)
      break;
    c = str.charCodeAt(i2), hi = c >> 8, lo = c % 256, byteArray.push(lo), byteArray.push(hi);
  }
  return byteArray;
}
function base64ToBytes(str) {
  return toByteArray(base64clean(str));
}
function blitBuffer(src, dst, offset, length) {
  let i2;
  for (i2 = 0;i2 < length; ++i2) {
    if (i2 + offset >= dst.length || i2 >= src.length)
      break;
    dst[i2 + offset] = src[i2];
  }
  return i2;
}
function isInstance(obj, type) {
  return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
}
var hexSliceLookupTable = function() {
  let table = Array(256);
  for (let i2 = 0;i2 < 16; ++i2) {
    let i16 = i2 * 16;
    for (let j = 0;j < 16; ++j)
      table[i16 + j] = "0123456789abcdef"[i2] + "0123456789abcdef"[j];
  }
  return table;
}();
function defineBigIntMethod(fn) {
  return typeof BigInt > "u" ? BufferBigIntNotDefined : fn;
}
function BufferBigIntNotDefined() {
  throw Error("BigInt not supported");
}
function notimpl(name) {
  return () => {
    throw Error(name + " is not implemented for node:buffer browser polyfill");
  };
}
var resolveObjectURL = notimpl("resolveObjectURL");
var isUtf8 = notimpl("isUtf8");
var transcode = notimpl("transcode");
var { URL: URL2, URLSearchParams } = globalThis;
function util_isString(arg) {
  return typeof arg === "string";
}
function util_isObject(arg) {
  return typeof arg === "object" && arg !== null;
}
function util_isNull(arg) {
  return arg === null;
}
function util_isNullOrUndefined(arg) {
  return arg == null;
}
function Url() {
  this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null, this.path = null, this.href = null;
}
var protocolPattern = /^([a-z0-9.+-]+:)/i;
var portPattern = /:[0-9]*$/;
var simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
var delims = ["<", ">", '"', "`", " ", "\r", `
`, "\t"];
var unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims);
var autoEscape = ["'"].concat(unwise);
var nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape);
var hostEndingChars = ["/", "?", "#"];
var hostnameMaxLen = 255;
var hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
var hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
var unsafeProtocol = { javascript: true, "javascript:": true };
var hostlessProtocol = { javascript: true, "javascript:": true };
var slashedProtocol = { http: true, https: true, ftp: true, gopher: true, file: true, "http:": true, "https:": true, "ftp:": true, "gopher:": true, "file:": true };
var querystring = { parse(str) {
  var decode = decodeURIComponent;
  return (str + "").replace(/\+/g, " ").split("&").filter(Boolean).reduce(function(obj, item, index) {
    var ref = item.split("="), key = decode(ref[0] || ""), val = decode(ref[1] || ""), prev = obj[key];
    return obj[key] = prev === undefined ? val : [].concat(prev, val), obj;
  }, {});
}, stringify(obj) {
  var encode = encodeURIComponent;
  return Object.keys(obj || {}).reduce(function(arr, key) {
    return [].concat(obj[key]).forEach(function(v) {
      arr.push(encode(key) + "=" + encode(v));
    }), arr;
  }, []).join("&").replace(/\s/g, "+");
} };
function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util_isObject(url) && url instanceof Url)
    return url;
  var u = new Url;
  return u.parse(url, parseQueryString, slashesDenoteHost), u;
}
Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util_isString(url))
    throw TypeError("Parameter 'url' must be a string, not " + typeof url);
  var queryIndex = url.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url.indexOf("#") ? "?" : "#", uSplit = url.split(splitter), slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, "/"), url = uSplit.join(splitter);
  var rest = url;
  if (rest = rest.trim(), !slashesDenoteHost && url.split("#").length === 1) {
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      if (this.path = rest, this.href = rest, this.pathname = simplePath[1], simplePath[2])
        if (this.search = simplePath[2], parseQueryString)
          this.query = querystring.parse(this.search.substr(1));
        else
          this.query = this.search.substr(1);
      else if (parseQueryString)
        this.search = "", this.query = {};
      return this;
    }
  }
  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto, rest = rest.substr(proto.length);
  }
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === "//";
    if (slashes && !(proto && hostlessProtocol[proto]))
      rest = rest.substr(2), this.slashes = true;
  }
  if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
    var hostEnd = -1;
    for (var i2 = 0;i2 < hostEndingChars.length; i2++) {
      var hec = rest.indexOf(hostEndingChars[i2]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    var auth, atSign;
    if (hostEnd === -1)
      atSign = rest.lastIndexOf("@");
    else
      atSign = rest.lastIndexOf("@", hostEnd);
    if (atSign !== -1)
      auth = rest.slice(0, atSign), rest = rest.slice(atSign + 1), this.auth = decodeURIComponent(auth);
    hostEnd = -1;
    for (var i2 = 0;i2 < nonHostChars.length; i2++) {
      var hec = rest.indexOf(nonHostChars[i2]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    if (hostEnd === -1)
      hostEnd = rest.length;
    this.host = rest.slice(0, hostEnd), rest = rest.slice(hostEnd), this.parseHost(), this.hostname = this.hostname || "";
    var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i2 = 0, l = hostparts.length;i2 < l; i2++) {
        var part = hostparts[i2];
        if (!part)
          continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = "";
          for (var j = 0, k = part.length;j < k; j++)
            if (part.charCodeAt(j) > 127)
              newpart += "x";
            else
              newpart += part[j];
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i2), notHost = hostparts.slice(i2 + 1), bit = part.match(hostnamePartStart);
            if (bit)
              validParts.push(bit[1]), notHost.unshift(bit[2]);
            if (notHost.length)
              rest = "/" + notHost.join(".") + rest;
            this.hostname = validParts.join(".");
            break;
          }
        }
      }
    }
    if (this.hostname.length > hostnameMaxLen)
      this.hostname = "";
    else
      this.hostname = this.hostname.toLowerCase();
    if (!ipv6Hostname)
      this.hostname = new URL2(`https://${this.hostname}`).hostname;
    var p = this.port ? ":" + this.port : "", h = this.hostname || "";
    if (this.host = h + p, this.href += this.host, ipv6Hostname) {
      if (this.hostname = this.hostname.substr(1, this.hostname.length - 2), rest[0] !== "/")
        rest = "/" + rest;
    }
  }
  if (!unsafeProtocol[lowerProto])
    for (var i2 = 0, l = autoEscape.length;i2 < l; i2++) {
      var ae = autoEscape[i2];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae)
        esc = escape(ae);
      rest = rest.split(ae).join(esc);
    }
  var hash = rest.indexOf("#");
  if (hash !== -1)
    this.hash = rest.substr(hash), rest = rest.slice(0, hash);
  var qm = rest.indexOf("?");
  if (qm !== -1) {
    if (this.search = rest.substr(qm), this.query = rest.substr(qm + 1), parseQueryString)
      this.query = querystring.parse(this.query);
    rest = rest.slice(0, qm);
  } else if (parseQueryString)
    this.search = "", this.query = {};
  if (rest)
    this.pathname = rest;
  if (slashedProtocol[lowerProto] && this.hostname && !this.pathname)
    this.pathname = "/";
  if (this.pathname || this.search) {
    var p = this.pathname || "", s = this.search || "";
    this.path = p + s;
  }
  return this.href = this.format(), this;
};
Url.prototype.format = function() {
  var auth = this.auth || "";
  if (auth)
    auth = encodeURIComponent(auth), auth = auth.replace(/%3A/i, ":"), auth += "@";
  var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
  if (this.host)
    host = auth + this.host;
  else if (this.hostname) {
    if (host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]"), this.port)
      host += ":" + this.port;
  }
  if (this.query && util_isObject(this.query) && Object.keys(this.query).length)
    query = querystring.stringify(this.query);
  var search = this.search || query && "?" + query || "";
  if (protocol && protocol.substr(-1) !== ":")
    protocol += ":";
  if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
    if (host = "//" + (host || ""), pathname && pathname.charAt(0) !== "/")
      pathname = "/" + pathname;
  } else if (!host)
    host = "";
  if (hash && hash.charAt(0) !== "#")
    hash = "#" + hash;
  if (search && search.charAt(0) !== "?")
    search = "?" + search;
  return pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  }), search = search.replace("#", "%23"), protocol + host + pathname + search + hash;
};
Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};
Url.prototype.resolveObject = function(relative) {
  if (util_isString(relative)) {
    var rel = new Url;
    rel.parse(relative, false, true), relative = rel;
  }
  var result = new Url, tkeys = Object.keys(this);
  for (var tk = 0;tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }
  if (result.hash = relative.hash, relative.href === "")
    return result.href = result.format(), result;
  if (relative.slashes && !relative.protocol) {
    var rkeys = Object.keys(relative);
    for (var rk = 0;rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== "protocol")
        result[rkey] = relative[rkey];
    }
    if (slashedProtocol[result.protocol] && result.hostname && !result.pathname)
      result.path = result.pathname = "/";
    return result.href = result.format(), result;
  }
  if (relative.protocol && relative.protocol !== result.protocol) {
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0;v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      return result.href = result.format(), result;
    }
    if (result.protocol = relative.protocol, !relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || "").split("/");
      while (relPath.length && !(relative.host = relPath.shift()))
        ;
      if (!relative.host)
        relative.host = "";
      if (!relative.hostname)
        relative.hostname = "";
      if (relPath[0] !== "")
        relPath.unshift("");
      if (relPath.length < 2)
        relPath.unshift("");
      result.pathname = relPath.join("/");
    } else
      result.pathname = relative.pathname;
    if (result.search = relative.search, result.query = relative.query, result.host = relative.host || "", result.auth = relative.auth, result.hostname = relative.hostname || relative.host, result.port = relative.port, result.pathname || result.search) {
      var p = result.pathname || "", s = result.search || "";
      result.path = p + s;
    }
    return result.slashes = result.slashes || relative.slashes, result.href = result.format(), result;
  }
  var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
  if (psychotic) {
    if (result.hostname = "", result.port = null, result.host)
      if (srcPath[0] === "")
        srcPath[0] = result.host;
      else
        srcPath.unshift(result.host);
    if (result.host = "", relative.protocol) {
      if (relative.hostname = null, relative.port = null, relative.host)
        if (relPath[0] === "")
          relPath[0] = relative.host;
        else
          relPath.unshift(relative.host);
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
  }
  if (isRelAbs)
    result.host = relative.host || relative.host === "" ? relative.host : result.host, result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname, result.search = relative.search, result.query = relative.query, srcPath = relPath;
  else if (relPath.length) {
    if (!srcPath)
      srcPath = [];
    srcPath.pop(), srcPath = srcPath.concat(relPath), result.search = relative.search, result.query = relative.query;
  } else if (!util_isNullOrUndefined(relative.search)) {
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
      if (authInHost)
        result.auth = authInHost.shift(), result.host = result.hostname = authInHost.shift();
    }
    if (result.search = relative.search, result.query = relative.query, !util_isNull(result.pathname) || !util_isNull(result.search))
      result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
    return result.href = result.format(), result;
  }
  if (!srcPath.length) {
    if (result.pathname = null, result.search)
      result.path = "/" + result.search;
    else
      result.path = null;
    return result.href = result.format(), result;
  }
  var last = srcPath.slice(-1)[0], hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === "." || last === "..") || last === "", up = 0;
  for (var i2 = srcPath.length;i2 >= 0; i2--)
    if (last = srcPath[i2], last === ".")
      srcPath.splice(i2, 1);
    else if (last === "..")
      srcPath.splice(i2, 1), up++;
    else if (up)
      srcPath.splice(i2, 1), up--;
  if (!mustEndAbs && !removeAllDots)
    for (;up--; up)
      srcPath.unshift("..");
  if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/"))
    srcPath.unshift("");
  if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/")
    srcPath.push("");
  var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
    var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
    if (authInHost)
      result.auth = authInHost.shift(), result.host = result.hostname = authInHost.shift();
  }
  if (mustEndAbs = mustEndAbs || result.host && srcPath.length, mustEndAbs && !isAbsolute)
    srcPath.unshift("");
  if (!srcPath.length)
    result.pathname = null, result.path = null;
  else
    result.pathname = srcPath.join("/");
  if (!util_isNull(result.pathname) || !util_isNull(result.search))
    result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
  return result.auth = relative.auth || result.auth, result.slashes = result.slashes || relative.slashes, result.href = result.format(), result;
};
Url.prototype.parseHost = function() {
  var host = this.host, port = portPattern.exec(host);
  if (port) {
    if (port = port[0], port !== ":")
      this.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host)
    this.hostname = host;
};
var prepareRuntime = () => {
  globalThis.Buffer = Buffer2;
  globalThis.atob = atob2;
  globalThis.btoa = btoa;
  globalThis.URL = URL2;
  globalThis.URLSearchParams = URLSearchParams;
};
var handler = (trigger, fn) => ({
  trigger,
  fn
});
prepareRuntime();
var LAST_FINALIZED_BLOCK_NUMBER = {
  absVal: Buffer.from([3]).toString("base64"),
  sign: "-1"
};
var LATEST_BLOCK_NUMBER = {
  absVal: Buffer.from([2]).toString("base64"),
  sign: "-1"
};
function sendReport(runtime, report, fn) {
  const rawReport = report.x_generatedCodeOnly_unwrap();
  const request = fn(rawReport);
  return this.sendRequest(runtime, request);
}
function sendRequesterSendReport(report, fn) {
  const rawReport = report.x_generatedCodeOnly_unwrap();
  const request = fn(rawReport);
  return this.sendRequest(request);
}
ClientCapability.prototype.sendReport = sendReport;
SendRequester.prototype.sendReport = sendRequesterSendReport;
var network = {
  chainId: "1",
  chainSelector: {
    name: "aptos-mainnet",
    selector: 4741433654826277614n
  },
  chainFamily: "aptos",
  networkType: "mainnet"
};
var aptos_mainnet_default = network;
var network2 = {
  chainId: "16661",
  chainSelector: {
    name: "0g-mainnet",
    selector: 4426351306075016396n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var _0g_mainnet_default = network2;
var network3 = {
  chainId: "36888",
  chainSelector: {
    name: "ab-mainnet",
    selector: 4829375610284793157n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ab_mainnet_default = network3;
var network4 = {
  chainId: "2741",
  chainSelector: {
    name: "abstract-mainnet",
    selector: 3577778157919314504n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var abstract_mainnet_default = network4;
var network5 = {
  chainId: "36900",
  chainSelector: {
    name: "adi-mainnet",
    selector: 4059281736450291836n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var adi_mainnet_default = network5;
var network6 = {
  chainId: "33139",
  chainSelector: {
    name: "apechain-mainnet",
    selector: 14894068710063348487n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var apechain_mainnet_default = network6;
var network7 = {
  chainId: "463",
  chainSelector: {
    name: "areon-mainnet",
    selector: 1939936305787790600n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var areon_mainnet_default = network7;
var network8 = {
  chainId: "43114",
  chainSelector: {
    name: "avalanche-mainnet",
    selector: 6433500567565415381n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var avalanche_mainnet_default = network8;
var network9 = {
  chainId: "432204",
  chainSelector: {
    name: "avalanche-subnet-dexalot-mainnet",
    selector: 5463201557265485081n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var avalanche_subnet_dexalot_mainnet_default = network9;
var network10 = {
  chainId: "80094",
  chainSelector: {
    name: "berachain-mainnet",
    selector: 1294465214383781161n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var berachain_mainnet_default = network10;
var network11 = {
  chainId: "56",
  chainSelector: {
    name: "binance_smart_chain-mainnet",
    selector: 11344663589394136015n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var binance_smart_chain_mainnet_default = network11;
var network12 = {
  chainId: "204",
  chainSelector: {
    name: "binance_smart_chain-mainnet-opbnb-1",
    selector: 465944652040885897n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var binance_smart_chain_mainnet_opbnb_1_default = network12;
var network13 = {
  chainId: "1907",
  chainSelector: {
    name: "bitcichain-mainnet",
    selector: 4874388048629246000n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcichain_mainnet_default = network13;
var network14 = {
  chainId: "200901",
  chainSelector: {
    name: "bitcoin-mainnet-bitlayer-1",
    selector: 7937294810946806131n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcoin_mainnet_bitlayer_1_default = network14;
var network15 = {
  chainId: "60808",
  chainSelector: {
    name: "bitcoin-mainnet-bob-1",
    selector: 3849287863852499584n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcoin_mainnet_bob_1_default = network15;
var network16 = {
  chainId: "3637",
  chainSelector: {
    name: "bitcoin-mainnet-botanix",
    selector: 4560701533377838164n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcoin_mainnet_botanix_default = network16;
var network17 = {
  chainId: "223",
  chainSelector: {
    name: "bitcoin-mainnet-bsquared-1",
    selector: 5406759801798337480n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcoin_mainnet_bsquared_1_default = network17;
var network18 = {
  chainId: "4200",
  chainSelector: {
    name: "bitcoin-merlin-mainnet",
    selector: 241851231317828981n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bitcoin_merlin_mainnet_default = network18;
var network19 = {
  chainId: "964",
  chainSelector: {
    name: "bittensor-mainnet",
    selector: 2135107236357186872n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bittensor_mainnet_default = network19;
var network20 = {
  chainId: "199",
  chainSelector: {
    name: "bittorrent_chain-mainnet",
    selector: 3776006016387883143n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var bittorrent_chain_mainnet_default = network20;
var network21 = {
  chainId: "42220",
  chainSelector: {
    name: "celo-mainnet",
    selector: 1346049177634351622n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var celo_mainnet_default = network21;
var network22 = {
  chainId: "81224",
  chainSelector: {
    name: "codex-mainnet",
    selector: 9478124434908827753n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var codex_mainnet_default = network22;
var network23 = {
  chainId: "52",
  chainSelector: {
    name: "coinex_smart_chain-mainnet",
    selector: 1761333065194157300n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var coinex_smart_chain_mainnet_default = network23;
var network24 = {
  chainId: "1030",
  chainSelector: {
    name: "conflux-mainnet",
    selector: 3358365939762719202n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var conflux_mainnet_default = network24;
var network25 = {
  chainId: "1116",
  chainSelector: {
    name: "core-mainnet",
    selector: 1224752112135636129n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var core_mainnet_default = network25;
var network26 = {
  chainId: "21000000",
  chainSelector: {
    name: "corn-mainnet",
    selector: 9043146809313071210n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var corn_mainnet_default = network26;
var network27 = {
  chainId: "25",
  chainSelector: {
    name: "cronos-mainnet",
    selector: 1456215246176062136n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var cronos_mainnet_default = network27;
var network28 = {
  chainId: "388",
  chainSelector: {
    name: "cronos-zkevm-mainnet",
    selector: 8788096068760390840n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var cronos_zkevm_mainnet_default = network28;
var network29 = {
  chainId: "3343",
  chainSelector: {
    name: "edge-mainnet",
    selector: 6325494908023253251n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var edge_mainnet_default = network29;
var network30 = {
  chainId: "1",
  chainSelector: {
    name: "ethereum-mainnet",
    selector: 5009297550715157269n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_default = network30;
var network31 = {
  chainId: "42161",
  chainSelector: {
    name: "ethereum-mainnet-arbitrum-1",
    selector: 4949039107694359620n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_arbitrum_1_default = network31;
var network32 = {
  chainId: "12324",
  chainSelector: {
    name: "ethereum-mainnet-arbitrum-1-l3x-1",
    selector: 3162193654116181371n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_arbitrum_1_l3x_1_default = network32;
var network33 = {
  chainId: "978670",
  chainSelector: {
    name: "ethereum-mainnet-arbitrum-1-treasure-1",
    selector: 1010349088906777999n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_arbitrum_1_treasure_1_default = network33;
var network34 = {
  chainId: "3776",
  chainSelector: {
    name: "ethereum-mainnet-astar-zkevm-1",
    selector: 1540201334317828111n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_astar_zkevm_1_default = network34;
var network35 = {
  chainId: "8453",
  chainSelector: {
    name: "ethereum-mainnet-base-1",
    selector: 15971525489660198786n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_base_1_default = network35;
var network36 = {
  chainId: "81457",
  chainSelector: {
    name: "ethereum-mainnet-blast-1",
    selector: 4411394078118774322n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_blast_1_default = network36;
var network37 = {
  chainId: "177",
  chainSelector: {
    name: "ethereum-mainnet-hashkey-1",
    selector: 7613811247471741961n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_hashkey_1_default = network37;
var network38 = {
  chainId: "13371",
  chainSelector: {
    name: "ethereum-mainnet-immutable-zkevm-1",
    selector: 1237925231416731909n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_immutable_zkevm_1_default = network38;
var network39 = {
  chainId: "57073",
  chainSelector: {
    name: "ethereum-mainnet-ink-1",
    selector: 3461204551265785888n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_ink_1_default = network39;
var network40 = {
  chainId: "255",
  chainSelector: {
    name: "ethereum-mainnet-kroma-1",
    selector: 3719320017875267166n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_kroma_1_default = network40;
var network41 = {
  chainId: "59144",
  chainSelector: {
    name: "ethereum-mainnet-linea-1",
    selector: 4627098889531055414n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_linea_1_default = network41;
var network42 = {
  chainId: "5000",
  chainSelector: {
    name: "ethereum-mainnet-mantle-1",
    selector: 1556008542357238666n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_mantle_1_default = network42;
var network43 = {
  chainId: "1088",
  chainSelector: {
    name: "ethereum-mainnet-metis-1",
    selector: 8805746078405598895n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_metis_1_default = network43;
var network44 = {
  chainId: "34443",
  chainSelector: {
    name: "ethereum-mainnet-mode-1",
    selector: 7264351850409363825n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_mode_1_default = network44;
var network45 = {
  chainId: "10",
  chainSelector: {
    name: "ethereum-mainnet-optimism-1",
    selector: 3734403246176062136n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_optimism_1_default = network45;
var network46 = {
  chainId: "1101",
  chainSelector: {
    name: "ethereum-mainnet-polygon-zkevm-1",
    selector: 4348158687435793198n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_polygon_zkevm_1_default = network46;
var network47 = {
  chainId: "534352",
  chainSelector: {
    name: "ethereum-mainnet-scroll-1",
    selector: 13204309965629103672n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_scroll_1_default = network47;
var network48 = {
  chainId: "167000",
  chainSelector: {
    name: "ethereum-mainnet-taiko-1",
    selector: 16468599424800719238n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_taiko_1_default = network48;
var network49 = {
  chainId: "130",
  chainSelector: {
    name: "ethereum-mainnet-unichain-1",
    selector: 1923510103922296319n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_unichain_1_default = network49;
var network50 = {
  chainId: "480",
  chainSelector: {
    name: "ethereum-mainnet-worldchain-1",
    selector: 2049429975587534727n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_worldchain_1_default = network50;
var network51 = {
  chainId: "196",
  chainSelector: {
    name: "ethereum-mainnet-xlayer-1",
    selector: 3016212468291539606n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_xlayer_1_default = network51;
var network52 = {
  chainId: "48900",
  chainSelector: {
    name: "ethereum-mainnet-zircuit-1",
    selector: 17198166215261833993n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_zircuit_1_default = network52;
var network53 = {
  chainId: "324",
  chainSelector: {
    name: "ethereum-mainnet-zksync-1",
    selector: 1562403441176082196n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ethereum_mainnet_zksync_1_default = network53;
var network54 = {
  chainId: "42793",
  chainSelector: {
    name: "etherlink-mainnet",
    selector: 13624601974233774587n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var etherlink_mainnet_default = network54;
var network55 = {
  chainId: "25327",
  chainSelector: {
    name: "everclear-mainnet",
    selector: 9723842205701363942n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var everclear_mainnet_default = network55;
var network56 = {
  chainId: "250",
  chainSelector: {
    name: "fantom-mainnet",
    selector: 3768048213127883732n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var fantom_mainnet_default = network56;
var network57 = {
  chainId: "314",
  chainSelector: {
    name: "filecoin-mainnet",
    selector: 4561443241176882990n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var filecoin_mainnet_default = network57;
var network58 = {
  chainId: "252",
  chainSelector: {
    name: "fraxtal-mainnet",
    selector: 1462016016387883143n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var fraxtal_mainnet_default = network58;
var network59 = {
  chainId: "86",
  chainSelector: {
    name: "gate-chain-mainnet",
    selector: 9688382747979139404n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var gate_chain_mainnet_default = network59;
var network60 = {
  chainId: "10088",
  chainSelector: {
    name: "gate-layer-mainnet",
    selector: 9373518659714509671n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var gate_layer_mainnet_default = network60;
var network61 = {
  chainId: "100",
  chainSelector: {
    name: "gnosis_chain-mainnet",
    selector: 465200170687744372n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var gnosis_chain_mainnet_default = network61;
var network62 = {
  chainId: "295",
  chainSelector: {
    name: "hedera-mainnet",
    selector: 3229138320728879060n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var hedera_mainnet_default = network62;
var network63 = {
  chainId: "43111",
  chainSelector: {
    name: "hemi-mainnet",
    selector: 1804312132722180201n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var hemi_mainnet_default = network63;
var network64 = {
  chainId: "999",
  chainSelector: {
    name: "hyperliquid-mainnet",
    selector: 2442541497099098535n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var hyperliquid_mainnet_default = network64;
var network65 = {
  chainId: "678",
  chainSelector: {
    name: "janction-mainnet",
    selector: 9107126442626377432n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var janction_mainnet_default = network65;
var network66 = {
  chainId: "5734951",
  chainSelector: {
    name: "jovay-mainnet",
    selector: 1523760397290643893n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var jovay_mainnet_default = network66;
var network67 = {
  chainId: "8217",
  chainSelector: {
    name: "kaia-mainnet",
    selector: 9813823125703490621n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var kaia_mainnet_default = network67;
var network68 = {
  chainId: "2222",
  chainSelector: {
    name: "kava-mainnet",
    selector: 7550000543357438061n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var kava_mainnet_default = network68;
var network69 = {
  chainId: "1285",
  chainSelector: {
    name: "kusama-mainnet-moonriver",
    selector: 1355020143337428062n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var kusama_mainnet_moonriver_default = network69;
var network70 = {
  chainId: "232",
  chainSelector: {
    name: "lens-mainnet",
    selector: 5608378062013572713n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var lens_mainnet_default = network70;
var network71 = {
  chainId: "1135",
  chainSelector: {
    name: "lisk-mainnet",
    selector: 15293031020466096408n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var lisk_mainnet_default = network71;
var network72 = {
  chainId: "4326",
  chainSelector: {
    name: "megaeth-mainnet",
    selector: 6093540873831549674n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var megaeth_mainnet_default = network72;
var network73 = {
  chainId: "51888",
  chainSelector: {
    name: "memento-mainnet",
    selector: 6473245816409426016n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var memento_mainnet_default = network73;
var network74 = {
  chainId: "1750",
  chainSelector: {
    name: "metal-mainnet",
    selector: 13447077090413146373n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var metal_mainnet_default = network74;
var network75 = {
  chainId: "228",
  chainSelector: {
    name: "mind-mainnet",
    selector: 11690709103138290329n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var mind_mainnet_default = network75;
var network76 = {
  chainId: "185",
  chainSelector: {
    name: "mint-mainnet",
    selector: 17164792800244661392n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var mint_mainnet_default = network76;
var network77 = {
  chainId: "143",
  chainSelector: {
    name: "monad-mainnet",
    selector: 8481857512324358265n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var monad_mainnet_default = network77;
var network78 = {
  chainId: "2818",
  chainSelector: {
    name: "morph-mainnet",
    selector: 18164309074156128038n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var morph_mainnet_default = network78;
var network79 = {
  chainId: "397",
  chainSelector: {
    name: "near-mainnet",
    selector: 2039744413822257700n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var near_mainnet_default = network79;
var network80 = {
  chainId: "259",
  chainSelector: {
    name: "neonlink-mainnet",
    selector: 8239338020728974000n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var neonlink_mainnet_default = network80;
var network81 = {
  chainId: "47763",
  chainSelector: {
    name: "neox-mainnet",
    selector: 7222032299962346917n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var neox_mainnet_default = network81;
var network82 = {
  chainId: "68414",
  chainSelector: {
    name: "nexon-mainnet-henesys",
    selector: 12657445206920369324n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var nexon_mainnet_henesys_default = network82;
var network83 = {
  chainId: "60118",
  chainSelector: {
    name: "nexon-mainnet-lith",
    selector: 15758750456714168963n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var nexon_mainnet_lith_default = network83;
var network84 = {
  chainId: "807424",
  chainSelector: {
    name: "nexon-qa",
    selector: 14632960069656270105n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var nexon_qa_default = network84;
var network85 = {
  chainId: "847799",
  chainSelector: {
    name: "nexon-stage",
    selector: 5556806327594153475n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var nexon_stage_default = network85;
var network86 = {
  chainId: "6900",
  chainSelector: {
    name: "nibiru-mainnet",
    selector: 17349189558768828726n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var nibiru_mainnet_default = network86;
var network87 = {
  chainId: "1672",
  chainSelector: {
    name: "pharos-mainnet",
    selector: 7801139999541420232n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var pharos_mainnet_default = network87;
var network88 = {
  chainId: "9745",
  chainSelector: {
    name: "plasma-mainnet",
    selector: 9335212494177455608n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var plasma_mainnet_default = network88;
var network89 = {
  chainId: "98866",
  chainSelector: {
    name: "plume-mainnet",
    selector: 17912061998839310979n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var plume_mainnet_default = network89;
var network90 = {
  chainId: "592",
  chainSelector: {
    name: "polkadot-mainnet-astar",
    selector: 6422105447186081193n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polkadot_mainnet_astar_default = network90;
var network91 = {
  chainId: "2031",
  chainSelector: {
    name: "polkadot-mainnet-centrifuge",
    selector: 8175830712062617656n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polkadot_mainnet_centrifuge_default = network91;
var network92 = {
  chainId: "46",
  chainSelector: {
    name: "polkadot-mainnet-darwinia",
    selector: 8866418665544333000n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polkadot_mainnet_darwinia_default = network92;
var network93 = {
  chainId: "1284",
  chainSelector: {
    name: "polkadot-mainnet-moonbeam",
    selector: 1252863800116739621n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polkadot_mainnet_moonbeam_default = network93;
var network94 = {
  chainId: "137",
  chainSelector: {
    name: "polygon-mainnet",
    selector: 4051577828743386545n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polygon_mainnet_default = network94;
var network95 = {
  chainId: "747474",
  chainSelector: {
    name: "polygon-mainnet-katana",
    selector: 2459028469735686113n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var polygon_mainnet_katana_default = network95;
var network96 = {
  chainId: "2020",
  chainSelector: {
    name: "ronin-mainnet",
    selector: 6916147374840168594n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var ronin_mainnet_default = network96;
var network97 = {
  chainId: "30",
  chainSelector: {
    name: "rootstock-mainnet",
    selector: 11964252391146578476n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var rootstock_mainnet_default = network97;
var network98 = {
  chainId: "1329",
  chainSelector: {
    name: "sei-mainnet",
    selector: 9027416829622342829n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var sei_mainnet_default = network98;
var network99 = {
  chainId: "109",
  chainSelector: {
    name: "shibarium-mainnet",
    selector: 3993510008929295315n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var shibarium_mainnet_default = network99;
var network100 = {
  chainId: "1868",
  chainSelector: {
    name: "soneium-mainnet",
    selector: 12505351618335765396n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var soneium_mainnet_default = network100;
var network101 = {
  chainId: "146",
  chainSelector: {
    name: "sonic-mainnet",
    selector: 1673871237479749969n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var sonic_mainnet_default = network101;
var network102 = {
  chainId: "988",
  chainSelector: {
    name: "stable-mainnet",
    selector: 16978377838628290997n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var stable_mainnet_default = network102;
var network103 = {
  chainId: "5330",
  chainSelector: {
    name: "superseed-mainnet",
    selector: 470401360549526817n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var superseed_mainnet_default = network103;
var network104 = {
  chainId: "239",
  chainSelector: {
    name: "tac-mainnet",
    selector: 5936861837188149645n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var tac_mainnet_default = network104;
var network105 = {
  chainId: "40",
  chainSelector: {
    name: "telos-evm-mainnet",
    selector: 1477345371608778000n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var telos_evm_mainnet_default = network105;
var network106 = {
  chainId: "4217",
  chainSelector: {
    name: "tempo-mainnet",
    selector: 7281642695469137430n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var tempo_mainnet_default = network106;
var network107 = {
  chainId: "61166",
  chainSelector: {
    name: "treasure-mainnet",
    selector: 5214452172935136222n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var treasure_mainnet_default = network107;
var network108 = {
  chainId: "728126428",
  chainSelector: {
    name: "tron-mainnet-evm",
    selector: 1546563616611573946n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var tron_mainnet_evm_default = network108;
var network109 = {
  chainId: "106",
  chainSelector: {
    name: "velas-mainnet",
    selector: 374210358663784372n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var velas_mainnet_default = network109;
var network110 = {
  chainId: "1111",
  chainSelector: {
    name: "wemix-mainnet",
    selector: 5142893604156789321n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var wemix_mainnet_default = network110;
var network111 = {
  chainId: "50",
  chainSelector: {
    name: "xdc-mainnet",
    selector: 17673274061779414707n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var xdc_mainnet_default = network111;
var network112 = {
  chainId: "7000",
  chainSelector: {
    name: "zetachain-mainnet",
    selector: 10817664450262215148n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var zetachain_mainnet_default = network112;
var network113 = {
  chainId: "810180",
  chainSelector: {
    name: "zklink_nova-mainnet",
    selector: 4350319965322101699n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var zklink_nova_mainnet_default = network113;
var network114 = {
  chainId: "7777777",
  chainSelector: {
    name: "zora-mainnet",
    selector: 3555797439612589184n
  },
  chainFamily: "evm",
  networkType: "mainnet"
};
var zora_mainnet_default = network114;
var network115 = {
  chainId: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  chainSelector: {
    name: "solana-mainnet",
    selector: 124615329519749607n
  },
  chainFamily: "solana",
  networkType: "mainnet"
};
var solana_mainnet_default = network115;
var network116 = {
  chainId: "1",
  chainSelector: {
    name: "sui-mainnet",
    selector: 17529533435026248318n
  },
  chainFamily: "sui",
  networkType: "mainnet"
};
var sui_mainnet_default = network116;
var network117 = {
  chainId: "-239",
  chainSelector: {
    name: "ton-mainnet",
    selector: 16448340667252469081n
  },
  chainFamily: "ton",
  networkType: "mainnet"
};
var ton_mainnet_default = network117;
var network118 = {
  chainId: "728126428",
  chainSelector: {
    name: "tron-mainnet",
    selector: 1546563616611573945n
  },
  chainFamily: "tron",
  networkType: "mainnet"
};
var tron_mainnet_default = network118;
var network119 = {
  chainId: "4",
  chainSelector: {
    name: "aptos-localnet",
    selector: 4457093679053095497n
  },
  chainFamily: "aptos",
  networkType: "testnet"
};
var aptos_localnet_default = network119;
var network120 = {
  chainId: "2",
  chainSelector: {
    name: "aptos-testnet",
    selector: 743186221051783445n
  },
  chainFamily: "aptos",
  networkType: "testnet"
};
var aptos_testnet_default = network120;
var network121 = {
  chainId: "16601",
  chainSelector: {
    name: "0g-testnet-galileo",
    selector: 2131427466778448014n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var _0g_testnet_galileo_default = network121;
var network122 = {
  chainId: "16602",
  chainSelector: {
    name: "0g-testnet-galileo-1",
    selector: 6892437333620424805n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var _0g_testnet_galileo_1_default = network122;
var network123 = {
  chainId: "16600",
  chainSelector: {
    name: "0g-testnet-newton",
    selector: 16088006396410204581n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var _0g_testnet_newton_default = network123;
var network124 = {
  chainId: "26888",
  chainSelector: {
    name: "ab-testnet",
    selector: 7051849327615092843n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ab_testnet_default = network124;
var network125 = {
  chainId: "11124",
  chainSelector: {
    name: "abstract-testnet",
    selector: 16235373811196386733n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var abstract_testnet_default = network125;
var network126 = {
  chainId: "99999",
  chainSelector: {
    name: "adi-testnet",
    selector: 9418205736192840573n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var adi_testnet_default = network126;
var network127 = {
  chainId: "31337",
  chainSelector: {
    name: "anvil-devnet",
    selector: 7759470850252068959n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var anvil_devnet_default = network127;
var network128 = {
  chainId: "33111",
  chainSelector: {
    name: "apechain-testnet-curtis",
    selector: 9900119385908781505n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var apechain_testnet_curtis_default = network128;
var network129 = {
  chainId: "5042002",
  chainSelector: {
    name: "arc-testnet",
    selector: 3034092155422581607n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var arc_testnet_default = network129;
var network130 = {
  chainId: "462",
  chainSelector: {
    name: "areon-testnet",
    selector: 7317911323415911000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var areon_testnet_default = network130;
var network131 = {
  chainId: "432201",
  chainSelector: {
    name: "avalanche-subnet-dexalot-testnet",
    selector: 1458281248224512906n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var avalanche_subnet_dexalot_testnet_default = network131;
var network132 = {
  chainId: "43113",
  chainSelector: {
    name: "avalanche-testnet-fuji",
    selector: 14767482510784806043n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var avalanche_testnet_fuji_default = network132;
var network133 = {
  chainId: "595581",
  chainSelector: {
    name: "avalanche-testnet-nexon",
    selector: 7837562506228496256n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var avalanche_testnet_nexon_default = network133;
var network134 = {
  chainId: "80085",
  chainSelector: {
    name: "berachain-testnet-artio",
    selector: 12336603543561911511n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var berachain_testnet_artio_default = network134;
var network135 = {
  chainId: "80084",
  chainSelector: {
    name: "berachain-testnet-bartio",
    selector: 8999465244383784164n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var berachain_testnet_bartio_default = network135;
var network136 = {
  chainId: "80069",
  chainSelector: {
    name: "berachain-testnet-bepolia",
    selector: 7728255861635209484n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var berachain_testnet_bepolia_default = network136;
var network137 = {
  chainId: "97",
  chainSelector: {
    name: "binance_smart_chain-testnet",
    selector: 13264668187771770619n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var binance_smart_chain_testnet_default = network137;
var network138 = {
  chainId: "5611",
  chainSelector: {
    name: "binance_smart_chain-testnet-opbnb-1",
    selector: 13274425992935471758n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var binance_smart_chain_testnet_opbnb_1_default = network138;
var network139 = {
  chainId: "1908",
  chainSelector: {
    name: "bitcichain-testnet",
    selector: 4888058894222120000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcichain_testnet_default = network139;
var network140 = {
  chainId: "200810",
  chainSelector: {
    name: "bitcoin-testnet-bitlayer-1",
    selector: 3789623672476206327n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_bitlayer_1_default = network140;
var network141 = {
  chainId: "3636",
  chainSelector: {
    name: "bitcoin-testnet-botanix",
    selector: 1467223411771711614n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_botanix_default = network141;
var network142 = {
  chainId: "1123",
  chainSelector: {
    name: "bitcoin-testnet-bsquared-1",
    selector: 1948510578179542068n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_bsquared_1_default = network142;
var network143 = {
  chainId: "686868",
  chainSelector: {
    name: "bitcoin-testnet-merlin",
    selector: 5269261765892944301n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_merlin_default = network143;
var network144 = {
  chainId: "31",
  chainSelector: {
    name: "bitcoin-testnet-rootstock",
    selector: 8953668971247136127n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_rootstock_default = network144;
var network145 = {
  chainId: "808813",
  chainSelector: {
    name: "bitcoin-testnet-sepolia-bob-1",
    selector: 5535534526963509396n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bitcoin_testnet_sepolia_bob_1_default = network145;
var network146 = {
  chainId: "945",
  chainSelector: {
    name: "bittensor-testnet",
    selector: 2177900824115119161n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bittensor_testnet_default = network146;
var network147 = {
  chainId: "1029",
  chainSelector: {
    name: "bittorrent_chain-testnet",
    selector: 4459371029167934217n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var bittorrent_chain_testnet_default = network147;
var network148 = {
  chainId: "11142220",
  chainSelector: {
    name: "celo-sepolia",
    selector: 3761762704474186180n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var celo_sepolia_default = network148;
var network149 = {
  chainId: "44787",
  chainSelector: {
    name: "celo-testnet-alfajores",
    selector: 3552045678561919002n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var celo_testnet_alfajores_default = network149;
var network150 = {
  chainId: "812242",
  chainSelector: {
    name: "codex-testnet",
    selector: 7225665875429174318n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var codex_testnet_default = network150;
var network151 = {
  chainId: "53",
  chainSelector: {
    name: "coinex_smart_chain-testnet",
    selector: 8955032871639343000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var coinex_smart_chain_testnet_default = network151;
var network152 = {
  chainId: "1114",
  chainSelector: {
    name: "core-testnet",
    selector: 4264732132125536123n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var core_testnet_default = network152;
var network153 = {
  chainId: "338",
  chainSelector: {
    name: "cronos-testnet",
    selector: 2995292832068775165n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var cronos_testnet_default = network153;
var network154 = {
  chainId: "282",
  chainSelector: {
    name: "cronos-testnet-zkevm-1",
    selector: 3842103497652714138n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var cronos_testnet_zkevm_1_default = network154;
var network155 = {
  chainId: "240",
  chainSelector: {
    name: "cronos-zkevm-testnet-sepolia",
    selector: 16487132492576884721n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var cronos_zkevm_testnet_sepolia_default = network155;
var network156 = {
  chainId: "6281971",
  chainSelector: {
    name: "dogeos-testnet-chikyu",
    selector: 7254999290874773717n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var dogeos_testnet_chikyu_default = network156;
var network157 = {
  chainId: "2025",
  chainSelector: {
    name: "dtcc-testnet-andesite",
    selector: 15513093881969820114n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var dtcc_testnet_andesite_default = network157;
var network158 = {
  chainId: "33431",
  chainSelector: {
    name: "edge-testnet",
    selector: 13222148116102326311n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var edge_testnet_default = network158;
var network159 = {
  chainId: "421613",
  chainSelector: {
    name: "ethereum-testnet-goerli-arbitrum-1",
    selector: 6101244977088475029n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_arbitrum_1_default = network159;
var network160 = {
  chainId: "84531",
  chainSelector: {
    name: "ethereum-testnet-goerli-base-1",
    selector: 5790810961207155433n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_base_1_default = network160;
var network161 = {
  chainId: "59140",
  chainSelector: {
    name: "ethereum-testnet-goerli-linea-1",
    selector: 1355246678561316402n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_linea_1_default = network161;
var network162 = {
  chainId: "5001",
  chainSelector: {
    name: "ethereum-testnet-goerli-mantle-1",
    selector: 4168263376276232250n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_mantle_1_default = network162;
var network163 = {
  chainId: "420",
  chainSelector: {
    name: "ethereum-testnet-goerli-optimism-1",
    selector: 2664363617261496610n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_optimism_1_default = network163;
var network164 = {
  chainId: "1442",
  chainSelector: {
    name: "ethereum-testnet-goerli-polygon-zkevm-1",
    selector: 11059667695644972511n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_polygon_zkevm_1_default = network164;
var network165 = {
  chainId: "280",
  chainSelector: {
    name: "ethereum-testnet-goerli-zksync-1",
    selector: 6802309497652714138n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_goerli_zksync_1_default = network165;
var network166 = {
  chainId: "17000",
  chainSelector: {
    name: "ethereum-testnet-holesky",
    selector: 7717148896336251131n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_holesky_default = network166;
var network167 = {
  chainId: "2522",
  chainSelector: {
    name: "ethereum-testnet-holesky-fraxtal-1",
    selector: 8901520481741771655n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_holesky_fraxtal_1_default = network167;
var network168 = {
  chainId: "2810",
  chainSelector: {
    name: "ethereum-testnet-holesky-morph-1",
    selector: 8304510386741731151n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_holesky_morph_1_default = network168;
var network169 = {
  chainId: "167009",
  chainSelector: {
    name: "ethereum-testnet-holesky-taiko-1",
    selector: 7248756420937879088n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_holesky_taiko_1_default = network169;
var network170 = {
  chainId: "560048",
  chainSelector: {
    name: "ethereum-testnet-hoodi",
    selector: 10380998176179737091n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_hoodi_default = network170;
var network171 = {
  chainId: "2910",
  chainSelector: {
    name: "ethereum-testnet-hoodi-morph",
    selector: 1064004874793747259n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_hoodi_morph_default = network171;
var network172 = {
  chainId: "167012",
  chainSelector: {
    name: "ethereum-testnet-hoodi-taiko",
    selector: 9873759436596923887n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_hoodi_taiko_default = network172;
var network173 = {
  chainId: "167013",
  chainSelector: {
    name: "ethereum-testnet-hoodi-taiko-1",
    selector: 15858691699034549072n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_hoodi_taiko_1_default = network173;
var network174 = {
  chainId: "11155111",
  chainSelector: {
    name: "ethereum-testnet-sepolia",
    selector: 16015286601757825753n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_default = network174;
var network175 = {
  chainId: "421614",
  chainSelector: {
    name: "ethereum-testnet-sepolia-arbitrum-1",
    selector: 3478487238524512106n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_arbitrum_1_default = network175;
var network176 = {
  chainId: "12325",
  chainSelector: {
    name: "ethereum-testnet-sepolia-arbitrum-1-l3x-1",
    selector: 3486622437121596122n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_arbitrum_1_l3x_1_default = network176;
var network177 = {
  chainId: "978657",
  chainSelector: {
    name: "ethereum-testnet-sepolia-arbitrum-1-treasure-1",
    selector: 10443705513486043421n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_arbitrum_1_treasure_1_default = network177;
var network178 = {
  chainId: "84532",
  chainSelector: {
    name: "ethereum-testnet-sepolia-base-1",
    selector: 10344971235874465080n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_base_1_default = network178;
var network179 = {
  chainId: "168587773",
  chainSelector: {
    name: "ethereum-testnet-sepolia-blast-1",
    selector: 2027362563942762617n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_blast_1_default = network179;
var network180 = {
  chainId: "21000001",
  chainSelector: {
    name: "ethereum-testnet-sepolia-corn-1",
    selector: 1467427327723633929n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_corn_1_default = network180;
var network181 = {
  chainId: "133",
  chainSelector: {
    name: "ethereum-testnet-sepolia-hashkey-1",
    selector: 4356164186791070119n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_hashkey_1_default = network181;
var network182 = {
  chainId: "13473",
  chainSelector: {
    name: "ethereum-testnet-sepolia-immutable-zkevm-1",
    selector: 4526165231216331901n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_immutable_zkevm_1_default = network182;
var network183 = {
  chainId: "2358",
  chainSelector: {
    name: "ethereum-testnet-sepolia-kroma-1",
    selector: 5990477251245693094n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_kroma_1_default = network183;
var network184 = {
  chainId: "37111",
  chainSelector: {
    name: "ethereum-testnet-sepolia-lens-1",
    selector: 6827576821754315911n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_lens_1_default = network184;
var network185 = {
  chainId: "59141",
  chainSelector: {
    name: "ethereum-testnet-sepolia-linea-1",
    selector: 5719461335882077547n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_linea_1_default = network185;
var network186 = {
  chainId: "4202",
  chainSelector: {
    name: "ethereum-testnet-sepolia-lisk-1",
    selector: 5298399861320400553n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_lisk_1_default = network186;
var network187 = {
  chainId: "5003",
  chainSelector: {
    name: "ethereum-testnet-sepolia-mantle-1",
    selector: 8236463271206331221n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_mantle_1_default = network187;
var network188 = {
  chainId: "59902",
  chainSelector: {
    name: "ethereum-testnet-sepolia-metis-1",
    selector: 3777822886988675105n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_metis_1_default = network188;
var network189 = {
  chainId: "919",
  chainSelector: {
    name: "ethereum-testnet-sepolia-mode-1",
    selector: 829525985033418733n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_mode_1_default = network189;
var network190 = {
  chainId: "11155420",
  chainSelector: {
    name: "ethereum-testnet-sepolia-optimism-1",
    selector: 5224473277236331295n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_optimism_1_default = network190;
var network191 = {
  chainId: "717160",
  chainSelector: {
    name: "ethereum-testnet-sepolia-polygon-validium-1",
    selector: 4418231248214522936n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_polygon_validium_1_default = network191;
var network192 = {
  chainId: "2442",
  chainSelector: {
    name: "ethereum-testnet-sepolia-polygon-zkevm-1",
    selector: 1654667687261492630n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_polygon_zkevm_1_default = network192;
var network193 = {
  chainId: "202601",
  chainSelector: {
    name: "ethereum-testnet-sepolia-ronin-1",
    selector: 1091131740251125869n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_ronin_1_default = network193;
var network194 = {
  chainId: "534351",
  chainSelector: {
    name: "ethereum-testnet-sepolia-scroll-1",
    selector: 2279865765895943307n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_scroll_1_default = network194;
var network195 = {
  chainId: "1946",
  chainSelector: {
    name: "ethereum-testnet-sepolia-soneium-1",
    selector: 686603546605904534n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_soneium_1_default = network195;
var network196 = {
  chainId: "1301",
  chainSelector: {
    name: "ethereum-testnet-sepolia-unichain-1",
    selector: 14135854469784514356n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_unichain_1_default = network196;
var network197 = {
  chainId: "4801",
  chainSelector: {
    name: "ethereum-testnet-sepolia-worldchain-1",
    selector: 5299555114858065850n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_worldchain_1_default = network197;
var network198 = {
  chainId: "195",
  chainSelector: {
    name: "ethereum-testnet-sepolia-xlayer-1",
    selector: 2066098519157881736n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_xlayer_1_default = network198;
var network199 = {
  chainId: "48899",
  chainSelector: {
    name: "ethereum-testnet-sepolia-zircuit-1",
    selector: 4562743618362911021n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_zircuit_1_default = network199;
var network200 = {
  chainId: "300",
  chainSelector: {
    name: "ethereum-testnet-sepolia-zksync-1",
    selector: 6898391096552792247n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ethereum_testnet_sepolia_zksync_1_default = network200;
var network201 = {
  chainId: "128123",
  chainSelector: {
    name: "etherlink-testnet",
    selector: 1910019406958449359n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var etherlink_testnet_default = network201;
var network202 = {
  chainId: "6398",
  chainSelector: {
    name: "everclear-testnet-sepolia",
    selector: 379340054879810246n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var everclear_testnet_sepolia_default = network202;
var network203 = {
  chainId: "4002",
  chainSelector: {
    name: "fantom-testnet",
    selector: 4905564228793744293n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var fantom_testnet_default = network203;
var network204 = {
  chainId: "31415926",
  chainSelector: {
    name: "filecoin-testnet",
    selector: 7060342227814389000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var filecoin_testnet_default = network204;
var network205 = {
  chainId: "85",
  chainSelector: {
    name: "gate-chain-testnet-meteora",
    selector: 3558960680482140165n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var gate_chain_testnet_meteora_default = network205;
var network206 = {
  chainId: "10087",
  chainSelector: {
    name: "gate-layer-testnet",
    selector: 3667207123485082040n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var gate_layer_testnet_default = network206;
var network207 = {
  chainId: "1337",
  chainSelector: {
    name: "geth-testnet",
    selector: 3379446385462418246n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var geth_testnet_default = network207;
var network208 = {
  chainId: "10200",
  chainSelector: {
    name: "gnosis_chain-testnet-chiado",
    selector: 8871595565390010547n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var gnosis_chain_testnet_chiado_default = network208;
var network209 = {
  chainId: "296",
  chainSelector: {
    name: "hedera-testnet",
    selector: 222782988166878823n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var hedera_testnet_default = network209;
var network210 = {
  chainId: "743111",
  chainSelector: {
    name: "hemi-testnet-sepolia",
    selector: 16126893759944359622n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var hemi_testnet_sepolia_default = network210;
var network211 = {
  chainId: "998",
  chainSelector: {
    name: "hyperliquid-testnet",
    selector: 4286062357653186312n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var hyperliquid_testnet_default = network211;
var network212 = {
  chainId: "763373",
  chainSelector: {
    name: "ink-testnet-sepolia",
    selector: 9763904284804119144n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ink_testnet_sepolia_default = network212;
var network213 = {
  chainId: "679",
  chainSelector: {
    name: "janction-testnet-sepolia",
    selector: 5059197667603797935n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var janction_testnet_sepolia_default = network213;
var network214 = {
  chainId: "2019775",
  chainSelector: {
    name: "jovay-testnet",
    selector: 945045181441419236n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var jovay_testnet_default = network214;
var network215 = {
  chainId: "1001",
  chainSelector: {
    name: "kaia-testnet-kairos",
    selector: 2624132734533621656n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var kaia_testnet_kairos_default = network215;
var network216 = {
  chainId: "2221",
  chainSelector: {
    name: "kava-testnet",
    selector: 2110537777356199208n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var kava_testnet_default = network216;
var network217 = {
  chainId: "6342",
  chainSelector: {
    name: "megaeth-testnet",
    selector: 2443239559770384419n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var megaeth_testnet_default = network217;
var network218 = {
  chainId: "6343",
  chainSelector: {
    name: "megaeth-testnet-2",
    selector: 18241817625092392675n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var megaeth_testnet_2_default = network218;
var network219 = {
  chainId: "2129",
  chainSelector: {
    name: "memento-testnet",
    selector: 12168171414969487009n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var memento_testnet_default = network219;
var network220 = {
  chainId: "1740",
  chainSelector: {
    name: "metal-testnet",
    selector: 6286293440461807648n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var metal_testnet_default = network220;
var network221 = {
  chainId: "192940",
  chainSelector: {
    name: "mind-testnet",
    selector: 7189150270347329685n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var mind_testnet_default = network221;
var network222 = {
  chainId: "1687",
  chainSelector: {
    name: "mint-testnet",
    selector: 10749384167430721561n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var mint_testnet_default = network222;
var network223 = {
  chainId: "10143",
  chainSelector: {
    name: "monad-testnet",
    selector: 2183018362218727504n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var monad_testnet_default = network223;
var network224 = {
  chainId: "398",
  chainSelector: {
    name: "near-testnet",
    selector: 5061593697262339000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var near_testnet_default = network224;
var network225 = {
  chainId: "9559",
  chainSelector: {
    name: "neonlink-testnet",
    selector: 1113014352258747600n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var neonlink_testnet_default = network225;
var network226 = {
  chainId: "12227332",
  chainSelector: {
    name: "neox-testnet-t4",
    selector: 2217764097022649312n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var neox_testnet_t4_default = network226;
var network227 = {
  chainId: "5668",
  chainSelector: {
    name: "nexon-dev",
    selector: 8911150974185440581n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var nexon_dev_default = network227;
var network228 = {
  chainId: "6930",
  chainSelector: {
    name: "nibiru-testnet",
    selector: 305104239123120457n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var nibiru_testnet_default = network228;
var network229 = {
  chainId: "9000",
  chainSelector: {
    name: "ondo-testnet",
    selector: 344208382356656551n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ondo_testnet_default = network229;
var network230 = {
  chainId: "688689",
  chainSelector: {
    name: "pharos-atlantic-testnet",
    selector: 16098325658947243212n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var pharos_atlantic_testnet_default = network230;
var network231 = {
  chainId: "688688",
  chainSelector: {
    name: "pharos-testnet",
    selector: 4012524741200567430n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var pharos_testnet_default = network231;
var network232 = {
  chainId: "9746",
  chainSelector: {
    name: "plasma-testnet",
    selector: 3967220077692964309n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var plasma_testnet_default = network232;
var network233 = {
  chainId: "98864",
  chainSelector: {
    name: "plume-devnet",
    selector: 3743020999916460931n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var plume_devnet_default = network233;
var network234 = {
  chainId: "161221135",
  chainSelector: {
    name: "plume-testnet",
    selector: 14684575664602284776n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var plume_testnet_default = network234;
var network235 = {
  chainId: "98867",
  chainSelector: {
    name: "plume-testnet-sepolia",
    selector: 13874588925447303949n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var plume_testnet_sepolia_default = network235;
var network236 = {
  chainId: "81",
  chainSelector: {
    name: "polkadot-testnet-astar-shibuya",
    selector: 6955638871347136141n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polkadot_testnet_astar_shibuya_default = network236;
var network237 = {
  chainId: "2088",
  chainSelector: {
    name: "polkadot-testnet-centrifuge-altair",
    selector: 2333097300889804761n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polkadot_testnet_centrifuge_altair_default = network237;
var network238 = {
  chainId: "45",
  chainSelector: {
    name: "polkadot-testnet-darwinia-pangoro",
    selector: 4340886533089894000n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polkadot_testnet_darwinia_pangoro_default = network238;
var network239 = {
  chainId: "1287",
  chainSelector: {
    name: "polkadot-testnet-moonbeam-moonbase",
    selector: 5361632739113536121n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polkadot_testnet_moonbeam_moonbase_default = network239;
var network240 = {
  chainId: "80002",
  chainSelector: {
    name: "polygon-testnet-amoy",
    selector: 16281711391670634445n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polygon_testnet_amoy_default = network240;
var network241 = {
  chainId: "80001",
  chainSelector: {
    name: "polygon-testnet-mumbai",
    selector: 12532609583862916517n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polygon_testnet_mumbai_default = network241;
var network242 = {
  chainId: "129399",
  chainSelector: {
    name: "polygon-testnet-tatara",
    selector: 9090863410735740267n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var polygon_testnet_tatara_default = network242;
var network243 = {
  chainId: "2024",
  chainSelector: {
    name: "private-testnet-andesite",
    selector: 6915682381028791124n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var private_testnet_andesite_default = network243;
var network244 = {
  chainId: "2023",
  chainSelector: {
    name: "private-testnet-granite",
    selector: 3260900564719373474n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var private_testnet_granite_default = network244;
var network245 = {
  chainId: "424242",
  chainSelector: {
    name: "private-testnet-mica",
    selector: 4489326297382772450n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var private_testnet_mica_default = network245;
var network246 = {
  chainId: "682",
  chainSelector: {
    name: "private-testnet-obsidian",
    selector: 6260932437388305511n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var private_testnet_obsidian_default = network246;
var network247 = {
  chainId: "45439",
  chainSelector: {
    name: "private-testnet-opala",
    selector: 8446413392851542429n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var private_testnet_opala_default = network247;
var network248 = {
  chainId: "46630",
  chainSelector: {
    name: "robinhood-testnet",
    selector: 2032988798112970440n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var robinhood_testnet_default = network248;
var network249 = {
  chainId: "2021",
  chainSelector: {
    name: "ronin-testnet-saigon",
    selector: 13116810400804392105n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var ronin_testnet_saigon_default = network249;
var network250 = {
  chainId: "1328",
  chainSelector: {
    name: "sei-testnet-atlantic",
    selector: 1216300075444106652n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var sei_testnet_atlantic_default = network250;
var network251 = {
  chainId: "157",
  chainSelector: {
    name: "shibarium-testnet-puppynet",
    selector: 17833296867764334567n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var shibarium_testnet_puppynet_default = network251;
var network252 = {
  chainId: "14601",
  chainSelector: {
    name: "sonic-testnet",
    selector: 1763698235108410440n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var sonic_testnet_default = network252;
var network253 = {
  chainId: "57054",
  chainSelector: {
    name: "sonic-testnet-blaze",
    selector: 3676871237479449268n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var sonic_testnet_blaze_default = network253;
var network254 = {
  chainId: "2201",
  chainSelector: {
    name: "stable-testnet",
    selector: 11793402411494852765n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var stable_testnet_default = network254;
var network255 = {
  chainId: "1513",
  chainSelector: {
    name: "story-testnet",
    selector: 4237030917318060427n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var story_testnet_default = network255;
var network256 = {
  chainId: "53302",
  chainSelector: {
    name: "superseed-testnet",
    selector: 13694007683517087973n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var superseed_testnet_default = network256;
var network257 = {
  chainId: "2391",
  chainSelector: {
    name: "tac-testnet",
    selector: 9488606126177218005n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tac_testnet_default = network257;
var network258 = {
  chainId: "41",
  chainSelector: {
    name: "telos-evm-testnet",
    selector: 729797994450396300n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var telos_evm_testnet_default = network258;
var network259 = {
  chainId: "42429",
  chainSelector: {
    name: "tempo-testnet",
    selector: 3963528237232804922n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tempo_testnet_default = network259;
var network260 = {
  chainId: "42431",
  chainSelector: {
    name: "tempo-testnet-moderato",
    selector: 8457817439310187923n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tempo_testnet_moderato_default = network260;
var network261 = {
  chainId: "978658",
  chainSelector: {
    name: "treasure-testnet-topaz",
    selector: 3676916124122457866n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var treasure_testnet_topaz_default = network261;
var network262 = {
  chainId: "3360022319",
  chainSelector: {
    name: "tron-devnet-evm",
    selector: 13231703482326770600n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tron_devnet_evm_default = network262;
var network263 = {
  chainId: "3448148188",
  chainSelector: {
    name: "tron-testnet-nile-evm",
    selector: 2052925811360307749n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tron_testnet_nile_evm_default = network263;
var network264 = {
  chainId: "2494104990",
  chainSelector: {
    name: "tron-testnet-shasta-evm",
    selector: 13231703482326770598n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var tron_testnet_shasta_evm_default = network264;
var network265 = {
  chainId: "111",
  chainSelector: {
    name: "velas-testnet",
    selector: 572210378683744374n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var velas_testnet_default = network265;
var network266 = {
  chainId: "1112",
  chainSelector: {
    name: "wemix-testnet",
    selector: 9284632837123596123n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var wemix_testnet_default = network266;
var network267 = {
  chainId: "51",
  chainSelector: {
    name: "xdc-testnet",
    selector: 3017758115101368649n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var xdc_testnet_default = network267;
var network268 = {
  chainId: "1952",
  chainSelector: {
    name: "xlayer-testnet",
    selector: 10212741611335999305n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var xlayer_testnet_default = network268;
var network269 = {
  chainId: "80087",
  chainSelector: {
    name: "zero-g-testnet-galileo",
    selector: 2285225387454015855n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var zero_g_testnet_galileo_default = network269;
var network270 = {
  chainId: "48898",
  chainSelector: {
    name: "zircuit-testnet-garfield",
    selector: 13781831279385219069n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var zircuit_testnet_garfield_default = network270;
var network271 = {
  chainId: "810181",
  chainSelector: {
    name: "zklink_nova-testnet",
    selector: 5837261596322416298n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var zklink_nova_testnet_default = network271;
var network272 = {
  chainId: "999999999",
  chainSelector: {
    name: "zora-testnet",
    selector: 16244020411108056671n
  },
  chainFamily: "evm",
  networkType: "testnet"
};
var zora_testnet_default = network272;
var network273 = {
  chainId: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  chainSelector: {
    name: "solana-devnet",
    selector: 16423721717087811551n
  },
  chainFamily: "solana",
  networkType: "testnet"
};
var solana_devnet_default = network273;
var network274 = {
  chainId: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
  chainSelector: {
    name: "solana-testnet",
    selector: 6302590918974934319n
  },
  chainFamily: "solana",
  networkType: "testnet"
};
var solana_testnet_default = network274;
var network275 = {
  chainId: "4",
  chainSelector: {
    name: "sui-localnet",
    selector: 18395503381733958356n
  },
  chainFamily: "sui",
  networkType: "testnet"
};
var sui_localnet_default = network275;
var network276 = {
  chainId: "2",
  chainSelector: {
    name: "sui-testnet",
    selector: 9762610643973837292n
  },
  chainFamily: "sui",
  networkType: "testnet"
};
var sui_testnet_default = network276;
var network277 = {
  chainId: "-217",
  chainSelector: {
    name: "ton-localnet",
    selector: 13879075125137744094n
  },
  chainFamily: "ton",
  networkType: "testnet"
};
var ton_localnet_default = network277;
var network278 = {
  chainId: "-3",
  chainSelector: {
    name: "ton-testnet",
    selector: 1399300952838017768n
  },
  chainFamily: "ton",
  networkType: "testnet"
};
var ton_testnet_default = network278;
var network279 = {
  chainId: "3360022319",
  chainSelector: {
    name: "tron-devnet",
    selector: 13231703482326770599n
  },
  chainFamily: "tron",
  networkType: "testnet"
};
var tron_devnet_default = network279;
var network280 = {
  chainId: "3448148188",
  chainSelector: {
    name: "tron-testnet-nile",
    selector: 2052925811360307740n
  },
  chainFamily: "tron",
  networkType: "testnet"
};
var tron_testnet_nile_default = network280;
var network281 = {
  chainId: "2494104990",
  chainSelector: {
    name: "tron-testnet-shasta",
    selector: 13231703482326770597n
  },
  chainFamily: "tron",
  networkType: "testnet"
};
var tron_testnet_shasta_default = network281;
var mainnetBySelector = new Map([
  [5009297550715157269n, ethereum_mainnet_default],
  [3734403246176062136n, ethereum_mainnet_optimism_1_default],
  [1456215246176062136n, cronos_mainnet_default],
  [11964252391146578476n, rootstock_mainnet_default],
  [1477345371608778000n, telos_evm_mainnet_default],
  [8866418665544333000n, polkadot_mainnet_darwinia_default],
  [17673274061779414707n, xdc_mainnet_default],
  [1761333065194157300n, coinex_smart_chain_mainnet_default],
  [11344663589394136015n, binance_smart_chain_mainnet_default],
  [9688382747979139404n, gate_chain_mainnet_default],
  [465200170687744372n, gnosis_chain_mainnet_default],
  [374210358663784372n, velas_mainnet_default],
  [3993510008929295315n, shibarium_mainnet_default],
  [1923510103922296319n, ethereum_mainnet_unichain_1_default],
  [4051577828743386545n, polygon_mainnet_default],
  [8481857512324358265n, monad_mainnet_default],
  [1673871237479749969n, sonic_mainnet_default],
  [7613811247471741961n, ethereum_mainnet_hashkey_1_default],
  [17164792800244661392n, mint_mainnet_default],
  [3016212468291539606n, ethereum_mainnet_xlayer_1_default],
  [3776006016387883143n, bittorrent_chain_mainnet_default],
  [465944652040885897n, binance_smart_chain_mainnet_opbnb_1_default],
  [5406759801798337480n, bitcoin_mainnet_bsquared_1_default],
  [11690709103138290329n, mind_mainnet_default],
  [5608378062013572713n, lens_mainnet_default],
  [5936861837188149645n, tac_mainnet_default],
  [3768048213127883732n, fantom_mainnet_default],
  [1462016016387883143n, fraxtal_mainnet_default],
  [3719320017875267166n, ethereum_mainnet_kroma_1_default],
  [8239338020728974000n, neonlink_mainnet_default],
  [3229138320728879060n, hedera_mainnet_default],
  [4561443241176882990n, filecoin_mainnet_default],
  [1562403441176082196n, ethereum_mainnet_zksync_1_default],
  [8788096068760390840n, cronos_zkevm_mainnet_default],
  [2039744413822257700n, near_mainnet_default],
  [1939936305787790600n, areon_mainnet_default],
  [2049429975587534727n, ethereum_mainnet_worldchain_1_default],
  [6422105447186081193n, polkadot_mainnet_astar_default],
  [9107126442626377432n, janction_mainnet_default],
  [2135107236357186872n, bittensor_mainnet_default],
  [16978377838628290997n, stable_mainnet_default],
  [2442541497099098535n, hyperliquid_mainnet_default],
  [3358365939762719202n, conflux_mainnet_default],
  [8805746078405598895n, ethereum_mainnet_metis_1_default],
  [4348158687435793198n, ethereum_mainnet_polygon_zkevm_1_default],
  [5142893604156789321n, wemix_mainnet_default],
  [1224752112135636129n, core_mainnet_default],
  [15293031020466096408n, lisk_mainnet_default],
  [1252863800116739621n, polkadot_mainnet_moonbeam_default],
  [1355020143337428062n, kusama_mainnet_moonriver_default],
  [9027416829622342829n, sei_mainnet_default],
  [7801139999541420232n, pharos_mainnet_default],
  [13447077090413146373n, metal_mainnet_default],
  [12505351618335765396n, soneium_mainnet_default],
  [4874388048629246000n, bitcichain_mainnet_default],
  [6916147374840168594n, ronin_mainnet_default],
  [8175830712062617656n, polkadot_mainnet_centrifuge_default],
  [7550000543357438061n, kava_mainnet_default],
  [3577778157919314504n, abstract_mainnet_default],
  [18164309074156128038n, morph_mainnet_default],
  [6325494908023253251n, edge_mainnet_default],
  [4560701533377838164n, bitcoin_mainnet_botanix_default],
  [1540201334317828111n, ethereum_mainnet_astar_zkevm_1_default],
  [241851231317828981n, bitcoin_merlin_mainnet_default],
  [7281642695469137430n, tempo_mainnet_default],
  [6093540873831549674n, megaeth_mainnet_default],
  [1556008542357238666n, ethereum_mainnet_mantle_1_default],
  [470401360549526817n, superseed_mainnet_default],
  [17349189558768828726n, nibiru_mainnet_default],
  [10817664450262215148n, zetachain_mainnet_default],
  [9813823125703490621n, kaia_mainnet_default],
  [15971525489660198786n, ethereum_mainnet_base_1_default],
  [9335212494177455608n, plasma_mainnet_default],
  [9373518659714509671n, gate_layer_mainnet_default],
  [3162193654116181371n, ethereum_mainnet_arbitrum_1_l3x_1_default],
  [1237925231416731909n, ethereum_mainnet_immutable_zkevm_1_default],
  [4426351306075016396n, _0g_mainnet_default],
  [9723842205701363942n, everclear_mainnet_default],
  [14894068710063348487n, apechain_mainnet_default],
  [7264351850409363825n, ethereum_mainnet_mode_1_default],
  [4829375610284793157n, ab_mainnet_default],
  [4059281736450291836n, adi_mainnet_default],
  [4949039107694359620n, ethereum_mainnet_arbitrum_1_default],
  [1346049177634351622n, celo_mainnet_default],
  [13624601974233774587n, etherlink_mainnet_default],
  [1804312132722180201n, hemi_mainnet_default],
  [6433500567565415381n, avalanche_mainnet_default],
  [7222032299962346917n, neox_mainnet_default],
  [17198166215261833993n, ethereum_mainnet_zircuit_1_default],
  [6473245816409426016n, memento_mainnet_default],
  [3461204551265785888n, ethereum_mainnet_ink_1_default],
  [4627098889531055414n, ethereum_mainnet_linea_1_default],
  [15758750456714168963n, nexon_mainnet_lith_default],
  [3849287863852499584n, bitcoin_mainnet_bob_1_default],
  [5214452172935136222n, treasure_mainnet_default],
  [12657445206920369324n, nexon_mainnet_henesys_default],
  [1294465214383781161n, berachain_mainnet_default],
  [9478124434908827753n, codex_mainnet_default],
  [4411394078118774322n, ethereum_mainnet_blast_1_default],
  [17912061998839310979n, plume_mainnet_default],
  [16468599424800719238n, ethereum_mainnet_taiko_1_default],
  [7937294810946806131n, bitcoin_mainnet_bitlayer_1_default],
  [5463201557265485081n, avalanche_subnet_dexalot_mainnet_default],
  [13204309965629103672n, ethereum_mainnet_scroll_1_default],
  [2459028469735686113n, polygon_mainnet_katana_default],
  [14632960069656270105n, nexon_qa_default],
  [4350319965322101699n, zklink_nova_mainnet_default],
  [5556806327594153475n, nexon_stage_default],
  [1010349088906777999n, ethereum_mainnet_arbitrum_1_treasure_1_default],
  [1523760397290643893n, jovay_mainnet_default],
  [3555797439612589184n, zora_mainnet_default],
  [9043146809313071210n, corn_mainnet_default],
  [1546563616611573946n, tron_mainnet_evm_default],
  [124615329519749607n, solana_mainnet_default],
  [4741433654826277614n, aptos_mainnet_default],
  [17529533435026248318n, sui_mainnet_default],
  [16448340667252469081n, ton_mainnet_default],
  [1546563616611573945n, tron_mainnet_default]
]);
var testnetBySelector = new Map([
  [8953668971247136127n, bitcoin_testnet_rootstock_default],
  [729797994450396300n, telos_evm_testnet_default],
  [4340886533089894000n, polkadot_testnet_darwinia_pangoro_default],
  [3017758115101368649n, xdc_testnet_default],
  [8955032871639343000n, coinex_smart_chain_testnet_default],
  [6955638871347136141n, polkadot_testnet_astar_shibuya_default],
  [3558960680482140165n, gate_chain_testnet_meteora_default],
  [13264668187771770619n, binance_smart_chain_testnet_default],
  [572210378683744374n, velas_testnet_default],
  [4356164186791070119n, ethereum_testnet_sepolia_hashkey_1_default],
  [17833296867764334567n, shibarium_testnet_puppynet_default],
  [2066098519157881736n, ethereum_testnet_sepolia_xlayer_1_default],
  [16487132492576884721n, cronos_zkevm_testnet_sepolia_default],
  [6802309497652714138n, ethereum_testnet_goerli_zksync_1_default],
  [3842103497652714138n, cronos_testnet_zkevm_1_default],
  [222782988166878823n, hedera_testnet_default],
  [6898391096552792247n, ethereum_testnet_sepolia_zksync_1_default],
  [2995292832068775165n, cronos_testnet_default],
  [5061593697262339000n, near_testnet_default],
  [2664363617261496610n, ethereum_testnet_goerli_optimism_1_default],
  [7317911323415911000n, areon_testnet_default],
  [5059197667603797935n, janction_testnet_sepolia_default],
  [6260932437388305511n, private_testnet_obsidian_default],
  [829525985033418733n, ethereum_testnet_sepolia_mode_1_default],
  [2177900824115119161n, bittensor_testnet_default],
  [4286062357653186312n, hyperliquid_testnet_default],
  [2624132734533621656n, kaia_testnet_kairos_default],
  [4459371029167934217n, bittorrent_chain_testnet_default],
  [9284632837123596123n, wemix_testnet_default],
  [4264732132125536123n, core_testnet_default],
  [1948510578179542068n, bitcoin_testnet_bsquared_1_default],
  [5361632739113536121n, polkadot_testnet_moonbeam_moonbase_default],
  [14135854469784514356n, ethereum_testnet_sepolia_unichain_1_default],
  [1216300075444106652n, sei_testnet_atlantic_default],
  [3379446385462418246n, geth_testnet_default],
  [11059667695644972511n, ethereum_testnet_goerli_polygon_zkevm_1_default],
  [4237030917318060427n, story_testnet_default],
  [10749384167430721561n, mint_testnet_default],
  [6286293440461807648n, metal_testnet_default],
  [4888058894222120000n, bitcichain_testnet_default],
  [686603546605904534n, ethereum_testnet_sepolia_soneium_1_default],
  [10212741611335999305n, xlayer_testnet_default],
  [13116810400804392105n, ronin_testnet_saigon_default],
  [3260900564719373474n, private_testnet_granite_default],
  [6915682381028791124n, private_testnet_andesite_default],
  [15513093881969820114n, dtcc_testnet_andesite_default],
  [2333097300889804761n, polkadot_testnet_centrifuge_altair_default],
  [12168171414969487009n, memento_testnet_default],
  [11793402411494852765n, stable_testnet_default],
  [2110537777356199208n, kava_testnet_default],
  [5990477251245693094n, ethereum_testnet_sepolia_kroma_1_default],
  [9488606126177218005n, tac_testnet_default],
  [1654667687261492630n, ethereum_testnet_sepolia_polygon_zkevm_1_default],
  [8901520481741771655n, ethereum_testnet_holesky_fraxtal_1_default],
  [8304510386741731151n, ethereum_testnet_holesky_morph_1_default],
  [1064004874793747259n, ethereum_testnet_hoodi_morph_default],
  [1467223411771711614n, bitcoin_testnet_botanix_default],
  [4905564228793744293n, fantom_testnet_default],
  [5298399861320400553n, ethereum_testnet_sepolia_lisk_1_default],
  [5299555114858065850n, ethereum_testnet_sepolia_worldchain_1_default],
  [4168263376276232250n, ethereum_testnet_goerli_mantle_1_default],
  [8236463271206331221n, ethereum_testnet_sepolia_mantle_1_default],
  [13274425992935471758n, binance_smart_chain_testnet_opbnb_1_default],
  [8911150974185440581n, nexon_dev_default],
  [2443239559770384419n, megaeth_testnet_default],
  [18241817625092392675n, megaeth_testnet_2_default],
  [379340054879810246n, everclear_testnet_sepolia_default],
  [305104239123120457n, nibiru_testnet_default],
  [344208382356656551n, ondo_testnet_default],
  [1113014352258747600n, neonlink_testnet_default],
  [3967220077692964309n, plasma_testnet_default],
  [3667207123485082040n, gate_layer_testnet_default],
  [2183018362218727504n, monad_testnet_default],
  [8871595565390010547n, gnosis_chain_testnet_chiado_default],
  [16235373811196386733n, abstract_testnet_default],
  [3486622437121596122n, ethereum_testnet_sepolia_arbitrum_1_l3x_1_default],
  [4526165231216331901n, ethereum_testnet_sepolia_immutable_zkevm_1_default],
  [1763698235108410440n, sonic_testnet_default],
  [16088006396410204581n, _0g_testnet_newton_default],
  [2131427466778448014n, _0g_testnet_galileo_default],
  [6892437333620424805n, _0g_testnet_galileo_1_default],
  [7717148896336251131n, ethereum_testnet_holesky_default],
  [7051849327615092843n, ab_testnet_default],
  [7759470850252068959n, anvil_devnet_default],
  [9900119385908781505n, apechain_testnet_curtis_default],
  [13222148116102326311n, edge_testnet_default],
  [6827576821754315911n, ethereum_testnet_sepolia_lens_1_default],
  [3963528237232804922n, tempo_testnet_default],
  [8457817439310187923n, tempo_testnet_moderato_default],
  [14767482510784806043n, avalanche_testnet_fuji_default],
  [3552045678561919002n, celo_testnet_alfajores_default],
  [8446413392851542429n, private_testnet_opala_default],
  [2032988798112970440n, robinhood_testnet_default],
  [13781831279385219069n, zircuit_testnet_garfield_default],
  [4562743618362911021n, ethereum_testnet_sepolia_zircuit_1_default],
  [13694007683517087973n, superseed_testnet_default],
  [3676871237479449268n, sonic_testnet_blaze_default],
  [1355246678561316402n, ethereum_testnet_goerli_linea_1_default],
  [5719461335882077547n, ethereum_testnet_sepolia_linea_1_default],
  [3777822886988675105n, ethereum_testnet_sepolia_metis_1_default],
  [12532609583862916517n, polygon_testnet_mumbai_default],
  [16281711391670634445n, polygon_testnet_amoy_default],
  [7728255861635209484n, berachain_testnet_bepolia_default],
  [8999465244383784164n, berachain_testnet_bartio_default],
  [12336603543561911511n, berachain_testnet_artio_default],
  [2285225387454015855n, zero_g_testnet_galileo_default],
  [5790810961207155433n, ethereum_testnet_goerli_base_1_default],
  [10344971235874465080n, ethereum_testnet_sepolia_base_1_default],
  [3743020999916460931n, plume_devnet_default],
  [13874588925447303949n, plume_testnet_sepolia_default],
  [9418205736192840573n, adi_testnet_default],
  [1910019406958449359n, etherlink_testnet_default],
  [9090863410735740267n, polygon_testnet_tatara_default],
  [7248756420937879088n, ethereum_testnet_holesky_taiko_1_default],
  [9873759436596923887n, ethereum_testnet_hoodi_taiko_default],
  [15858691699034549072n, ethereum_testnet_hoodi_taiko_1_default],
  [7189150270347329685n, mind_testnet_default],
  [3789623672476206327n, bitcoin_testnet_bitlayer_1_default],
  [1091131740251125869n, ethereum_testnet_sepolia_ronin_1_default],
  [6101244977088475029n, ethereum_testnet_goerli_arbitrum_1_default],
  [3478487238524512106n, ethereum_testnet_sepolia_arbitrum_1_default],
  [4489326297382772450n, private_testnet_mica_default],
  [1458281248224512906n, avalanche_subnet_dexalot_testnet_default],
  [2279865765895943307n, ethereum_testnet_sepolia_scroll_1_default],
  [10380998176179737091n, ethereum_testnet_hoodi_default],
  [7837562506228496256n, avalanche_testnet_nexon_default],
  [5269261765892944301n, bitcoin_testnet_merlin_default],
  [4012524741200567430n, pharos_testnet_default],
  [16098325658947243212n, pharos_atlantic_testnet_default],
  [4418231248214522936n, ethereum_testnet_sepolia_polygon_validium_1_default],
  [16126893759944359622n, hemi_testnet_sepolia_default],
  [9763904284804119144n, ink_testnet_sepolia_default],
  [5535534526963509396n, bitcoin_testnet_sepolia_bob_1_default],
  [5837261596322416298n, zklink_nova_testnet_default],
  [7225665875429174318n, codex_testnet_default],
  [10443705513486043421n, ethereum_testnet_sepolia_arbitrum_1_treasure_1_default],
  [3676916124122457866n, treasure_testnet_topaz_default],
  [945045181441419236n, jovay_testnet_default],
  [3034092155422581607n, arc_testnet_default],
  [7254999290874773717n, dogeos_testnet_chikyu_default],
  [3761762704474186180n, celo_sepolia_default],
  [16015286601757825753n, ethereum_testnet_sepolia_default],
  [5224473277236331295n, ethereum_testnet_sepolia_optimism_1_default],
  [2217764097022649312n, neox_testnet_t4_default],
  [1467427327723633929n, ethereum_testnet_sepolia_corn_1_default],
  [7060342227814389000n, filecoin_testnet_default],
  [14684575664602284776n, plume_testnet_default],
  [2027362563942762617n, ethereum_testnet_sepolia_blast_1_default],
  [16244020411108056671n, zora_testnet_default],
  [13231703482326770598n, tron_testnet_shasta_evm_default],
  [13231703482326770600n, tron_devnet_evm_default],
  [2052925811360307749n, tron_testnet_nile_evm_default],
  [6302590918974934319n, solana_testnet_default],
  [16423721717087811551n, solana_devnet_default],
  [743186221051783445n, aptos_testnet_default],
  [4457093679053095497n, aptos_localnet_default],
  [9762610643973837292n, sui_testnet_default],
  [18395503381733958356n, sui_localnet_default],
  [1399300952838017768n, ton_testnet_default],
  [13879075125137744094n, ton_localnet_default],
  [13231703482326770597n, tron_testnet_shasta_default],
  [13231703482326770599n, tron_devnet_default],
  [2052925811360307740n, tron_testnet_nile_default]
]);
var mainnetByName = new Map([
  ["ethereum-mainnet", ethereum_mainnet_default],
  ["ethereum-mainnet-optimism-1", ethereum_mainnet_optimism_1_default],
  ["cronos-mainnet", cronos_mainnet_default],
  ["rootstock-mainnet", rootstock_mainnet_default],
  ["telos-evm-mainnet", telos_evm_mainnet_default],
  ["polkadot-mainnet-darwinia", polkadot_mainnet_darwinia_default],
  ["xdc-mainnet", xdc_mainnet_default],
  ["coinex_smart_chain-mainnet", coinex_smart_chain_mainnet_default],
  ["binance_smart_chain-mainnet", binance_smart_chain_mainnet_default],
  ["gate-chain-mainnet", gate_chain_mainnet_default],
  ["gnosis_chain-mainnet", gnosis_chain_mainnet_default],
  ["velas-mainnet", velas_mainnet_default],
  ["shibarium-mainnet", shibarium_mainnet_default],
  ["ethereum-mainnet-unichain-1", ethereum_mainnet_unichain_1_default],
  ["polygon-mainnet", polygon_mainnet_default],
  ["monad-mainnet", monad_mainnet_default],
  ["sonic-mainnet", sonic_mainnet_default],
  ["ethereum-mainnet-hashkey-1", ethereum_mainnet_hashkey_1_default],
  ["mint-mainnet", mint_mainnet_default],
  ["ethereum-mainnet-xlayer-1", ethereum_mainnet_xlayer_1_default],
  ["bittorrent_chain-mainnet", bittorrent_chain_mainnet_default],
  ["binance_smart_chain-mainnet-opbnb-1", binance_smart_chain_mainnet_opbnb_1_default],
  ["bitcoin-mainnet-bsquared-1", bitcoin_mainnet_bsquared_1_default],
  ["mind-mainnet", mind_mainnet_default],
  ["lens-mainnet", lens_mainnet_default],
  ["tac-mainnet", tac_mainnet_default],
  ["fantom-mainnet", fantom_mainnet_default],
  ["fraxtal-mainnet", fraxtal_mainnet_default],
  ["ethereum-mainnet-kroma-1", ethereum_mainnet_kroma_1_default],
  ["neonlink-mainnet", neonlink_mainnet_default],
  ["hedera-mainnet", hedera_mainnet_default],
  ["filecoin-mainnet", filecoin_mainnet_default],
  ["ethereum-mainnet-zksync-1", ethereum_mainnet_zksync_1_default],
  ["cronos-zkevm-mainnet", cronos_zkevm_mainnet_default],
  ["near-mainnet", near_mainnet_default],
  ["areon-mainnet", areon_mainnet_default],
  ["ethereum-mainnet-worldchain-1", ethereum_mainnet_worldchain_1_default],
  ["polkadot-mainnet-astar", polkadot_mainnet_astar_default],
  ["janction-mainnet", janction_mainnet_default],
  ["bittensor-mainnet", bittensor_mainnet_default],
  ["stable-mainnet", stable_mainnet_default],
  ["hyperliquid-mainnet", hyperliquid_mainnet_default],
  ["conflux-mainnet", conflux_mainnet_default],
  ["ethereum-mainnet-metis-1", ethereum_mainnet_metis_1_default],
  ["ethereum-mainnet-polygon-zkevm-1", ethereum_mainnet_polygon_zkevm_1_default],
  ["wemix-mainnet", wemix_mainnet_default],
  ["core-mainnet", core_mainnet_default],
  ["lisk-mainnet", lisk_mainnet_default],
  ["polkadot-mainnet-moonbeam", polkadot_mainnet_moonbeam_default],
  ["kusama-mainnet-moonriver", kusama_mainnet_moonriver_default],
  ["sei-mainnet", sei_mainnet_default],
  ["pharos-mainnet", pharos_mainnet_default],
  ["metal-mainnet", metal_mainnet_default],
  ["soneium-mainnet", soneium_mainnet_default],
  ["bitcichain-mainnet", bitcichain_mainnet_default],
  ["ronin-mainnet", ronin_mainnet_default],
  ["polkadot-mainnet-centrifuge", polkadot_mainnet_centrifuge_default],
  ["kava-mainnet", kava_mainnet_default],
  ["abstract-mainnet", abstract_mainnet_default],
  ["morph-mainnet", morph_mainnet_default],
  ["edge-mainnet", edge_mainnet_default],
  ["bitcoin-mainnet-botanix", bitcoin_mainnet_botanix_default],
  ["ethereum-mainnet-astar-zkevm-1", ethereum_mainnet_astar_zkevm_1_default],
  ["bitcoin-merlin-mainnet", bitcoin_merlin_mainnet_default],
  ["tempo-mainnet", tempo_mainnet_default],
  ["megaeth-mainnet", megaeth_mainnet_default],
  ["ethereum-mainnet-mantle-1", ethereum_mainnet_mantle_1_default],
  ["superseed-mainnet", superseed_mainnet_default],
  ["nibiru-mainnet", nibiru_mainnet_default],
  ["zetachain-mainnet", zetachain_mainnet_default],
  ["kaia-mainnet", kaia_mainnet_default],
  ["ethereum-mainnet-base-1", ethereum_mainnet_base_1_default],
  ["plasma-mainnet", plasma_mainnet_default],
  ["gate-layer-mainnet", gate_layer_mainnet_default],
  ["ethereum-mainnet-arbitrum-1-l3x-1", ethereum_mainnet_arbitrum_1_l3x_1_default],
  ["ethereum-mainnet-immutable-zkevm-1", ethereum_mainnet_immutable_zkevm_1_default],
  ["0g-mainnet", _0g_mainnet_default],
  ["everclear-mainnet", everclear_mainnet_default],
  ["apechain-mainnet", apechain_mainnet_default],
  ["ethereum-mainnet-mode-1", ethereum_mainnet_mode_1_default],
  ["ab-mainnet", ab_mainnet_default],
  ["adi-mainnet", adi_mainnet_default],
  ["ethereum-mainnet-arbitrum-1", ethereum_mainnet_arbitrum_1_default],
  ["celo-mainnet", celo_mainnet_default],
  ["etherlink-mainnet", etherlink_mainnet_default],
  ["hemi-mainnet", hemi_mainnet_default],
  ["avalanche-mainnet", avalanche_mainnet_default],
  ["neox-mainnet", neox_mainnet_default],
  ["ethereum-mainnet-zircuit-1", ethereum_mainnet_zircuit_1_default],
  ["memento-mainnet", memento_mainnet_default],
  ["ethereum-mainnet-ink-1", ethereum_mainnet_ink_1_default],
  ["ethereum-mainnet-linea-1", ethereum_mainnet_linea_1_default],
  ["nexon-mainnet-lith", nexon_mainnet_lith_default],
  ["bitcoin-mainnet-bob-1", bitcoin_mainnet_bob_1_default],
  ["treasure-mainnet", treasure_mainnet_default],
  ["nexon-mainnet-henesys", nexon_mainnet_henesys_default],
  ["berachain-mainnet", berachain_mainnet_default],
  ["codex-mainnet", codex_mainnet_default],
  ["ethereum-mainnet-blast-1", ethereum_mainnet_blast_1_default],
  ["plume-mainnet", plume_mainnet_default],
  ["ethereum-mainnet-taiko-1", ethereum_mainnet_taiko_1_default],
  ["bitcoin-mainnet-bitlayer-1", bitcoin_mainnet_bitlayer_1_default],
  ["avalanche-subnet-dexalot-mainnet", avalanche_subnet_dexalot_mainnet_default],
  ["ethereum-mainnet-scroll-1", ethereum_mainnet_scroll_1_default],
  ["polygon-mainnet-katana", polygon_mainnet_katana_default],
  ["nexon-qa", nexon_qa_default],
  ["zklink_nova-mainnet", zklink_nova_mainnet_default],
  ["nexon-stage", nexon_stage_default],
  ["ethereum-mainnet-arbitrum-1-treasure-1", ethereum_mainnet_arbitrum_1_treasure_1_default],
  ["jovay-mainnet", jovay_mainnet_default],
  ["zora-mainnet", zora_mainnet_default],
  ["corn-mainnet", corn_mainnet_default],
  ["tron-mainnet-evm", tron_mainnet_evm_default],
  ["solana-mainnet", solana_mainnet_default],
  ["aptos-mainnet", aptos_mainnet_default],
  ["sui-mainnet", sui_mainnet_default],
  ["ton-mainnet", ton_mainnet_default],
  ["tron-mainnet", tron_mainnet_default]
]);
var testnetByName = new Map([
  ["bitcoin-testnet-rootstock", bitcoin_testnet_rootstock_default],
  ["telos-evm-testnet", telos_evm_testnet_default],
  ["polkadot-testnet-darwinia-pangoro", polkadot_testnet_darwinia_pangoro_default],
  ["xdc-testnet", xdc_testnet_default],
  ["coinex_smart_chain-testnet", coinex_smart_chain_testnet_default],
  ["polkadot-testnet-astar-shibuya", polkadot_testnet_astar_shibuya_default],
  ["gate-chain-testnet-meteora", gate_chain_testnet_meteora_default],
  ["binance_smart_chain-testnet", binance_smart_chain_testnet_default],
  ["velas-testnet", velas_testnet_default],
  ["ethereum-testnet-sepolia-hashkey-1", ethereum_testnet_sepolia_hashkey_1_default],
  ["shibarium-testnet-puppynet", shibarium_testnet_puppynet_default],
  ["ethereum-testnet-sepolia-xlayer-1", ethereum_testnet_sepolia_xlayer_1_default],
  ["cronos-zkevm-testnet-sepolia", cronos_zkevm_testnet_sepolia_default],
  ["ethereum-testnet-goerli-zksync-1", ethereum_testnet_goerli_zksync_1_default],
  ["cronos-testnet-zkevm-1", cronos_testnet_zkevm_1_default],
  ["hedera-testnet", hedera_testnet_default],
  ["ethereum-testnet-sepolia-zksync-1", ethereum_testnet_sepolia_zksync_1_default],
  ["cronos-testnet", cronos_testnet_default],
  ["near-testnet", near_testnet_default],
  ["ethereum-testnet-goerli-optimism-1", ethereum_testnet_goerli_optimism_1_default],
  ["areon-testnet", areon_testnet_default],
  ["janction-testnet-sepolia", janction_testnet_sepolia_default],
  ["private-testnet-obsidian", private_testnet_obsidian_default],
  ["ethereum-testnet-sepolia-mode-1", ethereum_testnet_sepolia_mode_1_default],
  ["bittensor-testnet", bittensor_testnet_default],
  ["hyperliquid-testnet", hyperliquid_testnet_default],
  ["kaia-testnet-kairos", kaia_testnet_kairos_default],
  ["bittorrent_chain-testnet", bittorrent_chain_testnet_default],
  ["wemix-testnet", wemix_testnet_default],
  ["core-testnet", core_testnet_default],
  ["bitcoin-testnet-bsquared-1", bitcoin_testnet_bsquared_1_default],
  ["polkadot-testnet-moonbeam-moonbase", polkadot_testnet_moonbeam_moonbase_default],
  ["ethereum-testnet-sepolia-unichain-1", ethereum_testnet_sepolia_unichain_1_default],
  ["sei-testnet-atlantic", sei_testnet_atlantic_default],
  ["geth-testnet", geth_testnet_default],
  ["ethereum-testnet-goerli-polygon-zkevm-1", ethereum_testnet_goerli_polygon_zkevm_1_default],
  ["story-testnet", story_testnet_default],
  ["mint-testnet", mint_testnet_default],
  ["metal-testnet", metal_testnet_default],
  ["bitcichain-testnet", bitcichain_testnet_default],
  ["ethereum-testnet-sepolia-soneium-1", ethereum_testnet_sepolia_soneium_1_default],
  ["xlayer-testnet", xlayer_testnet_default],
  ["ronin-testnet-saigon", ronin_testnet_saigon_default],
  ["private-testnet-granite", private_testnet_granite_default],
  ["private-testnet-andesite", private_testnet_andesite_default],
  ["dtcc-testnet-andesite", dtcc_testnet_andesite_default],
  ["polkadot-testnet-centrifuge-altair", polkadot_testnet_centrifuge_altair_default],
  ["memento-testnet", memento_testnet_default],
  ["stable-testnet", stable_testnet_default],
  ["kava-testnet", kava_testnet_default],
  ["ethereum-testnet-sepolia-kroma-1", ethereum_testnet_sepolia_kroma_1_default],
  ["tac-testnet", tac_testnet_default],
  [
    "ethereum-testnet-sepolia-polygon-zkevm-1",
    ethereum_testnet_sepolia_polygon_zkevm_1_default
  ],
  ["ethereum-testnet-holesky-fraxtal-1", ethereum_testnet_holesky_fraxtal_1_default],
  ["ethereum-testnet-holesky-morph-1", ethereum_testnet_holesky_morph_1_default],
  ["ethereum-testnet-hoodi-morph", ethereum_testnet_hoodi_morph_default],
  ["bitcoin-testnet-botanix", bitcoin_testnet_botanix_default],
  ["fantom-testnet", fantom_testnet_default],
  ["ethereum-testnet-sepolia-lisk-1", ethereum_testnet_sepolia_lisk_1_default],
  ["ethereum-testnet-sepolia-worldchain-1", ethereum_testnet_sepolia_worldchain_1_default],
  ["ethereum-testnet-goerli-mantle-1", ethereum_testnet_goerli_mantle_1_default],
  ["ethereum-testnet-sepolia-mantle-1", ethereum_testnet_sepolia_mantle_1_default],
  ["binance_smart_chain-testnet-opbnb-1", binance_smart_chain_testnet_opbnb_1_default],
  ["nexon-dev", nexon_dev_default],
  ["megaeth-testnet", megaeth_testnet_default],
  ["megaeth-testnet-2", megaeth_testnet_2_default],
  ["everclear-testnet-sepolia", everclear_testnet_sepolia_default],
  ["nibiru-testnet", nibiru_testnet_default],
  ["ondo-testnet", ondo_testnet_default],
  ["neonlink-testnet", neonlink_testnet_default],
  ["plasma-testnet", plasma_testnet_default],
  ["gate-layer-testnet", gate_layer_testnet_default],
  ["monad-testnet", monad_testnet_default],
  ["gnosis_chain-testnet-chiado", gnosis_chain_testnet_chiado_default],
  ["abstract-testnet", abstract_testnet_default],
  [
    "ethereum-testnet-sepolia-arbitrum-1-l3x-1",
    ethereum_testnet_sepolia_arbitrum_1_l3x_1_default
  ],
  [
    "ethereum-testnet-sepolia-immutable-zkevm-1",
    ethereum_testnet_sepolia_immutable_zkevm_1_default
  ],
  ["sonic-testnet", sonic_testnet_default],
  ["0g-testnet-newton", _0g_testnet_newton_default],
  ["0g-testnet-galileo", _0g_testnet_galileo_default],
  ["0g-testnet-galileo-1", _0g_testnet_galileo_1_default],
  ["ethereum-testnet-holesky", ethereum_testnet_holesky_default],
  ["ab-testnet", ab_testnet_default],
  ["anvil-devnet", anvil_devnet_default],
  ["apechain-testnet-curtis", apechain_testnet_curtis_default],
  ["edge-testnet", edge_testnet_default],
  ["ethereum-testnet-sepolia-lens-1", ethereum_testnet_sepolia_lens_1_default],
  ["tempo-testnet", tempo_testnet_default],
  ["tempo-testnet-moderato", tempo_testnet_moderato_default],
  ["avalanche-testnet-fuji", avalanche_testnet_fuji_default],
  ["celo-testnet-alfajores", celo_testnet_alfajores_default],
  ["private-testnet-opala", private_testnet_opala_default],
  ["robinhood-testnet", robinhood_testnet_default],
  ["zircuit-testnet-garfield", zircuit_testnet_garfield_default],
  ["ethereum-testnet-sepolia-zircuit-1", ethereum_testnet_sepolia_zircuit_1_default],
  ["superseed-testnet", superseed_testnet_default],
  ["sonic-testnet-blaze", sonic_testnet_blaze_default],
  ["ethereum-testnet-goerli-linea-1", ethereum_testnet_goerli_linea_1_default],
  ["ethereum-testnet-sepolia-linea-1", ethereum_testnet_sepolia_linea_1_default],
  ["ethereum-testnet-sepolia-metis-1", ethereum_testnet_sepolia_metis_1_default],
  ["polygon-testnet-mumbai", polygon_testnet_mumbai_default],
  ["polygon-testnet-amoy", polygon_testnet_amoy_default],
  ["berachain-testnet-bepolia", berachain_testnet_bepolia_default],
  ["berachain-testnet-bartio", berachain_testnet_bartio_default],
  ["berachain-testnet-artio", berachain_testnet_artio_default],
  ["zero-g-testnet-galileo", zero_g_testnet_galileo_default],
  ["ethereum-testnet-goerli-base-1", ethereum_testnet_goerli_base_1_default],
  ["ethereum-testnet-sepolia-base-1", ethereum_testnet_sepolia_base_1_default],
  ["plume-devnet", plume_devnet_default],
  ["plume-testnet-sepolia", plume_testnet_sepolia_default],
  ["adi-testnet", adi_testnet_default],
  ["etherlink-testnet", etherlink_testnet_default],
  ["polygon-testnet-tatara", polygon_testnet_tatara_default],
  ["ethereum-testnet-holesky-taiko-1", ethereum_testnet_holesky_taiko_1_default],
  ["ethereum-testnet-hoodi-taiko", ethereum_testnet_hoodi_taiko_default],
  ["ethereum-testnet-hoodi-taiko-1", ethereum_testnet_hoodi_taiko_1_default],
  ["mind-testnet", mind_testnet_default],
  ["bitcoin-testnet-bitlayer-1", bitcoin_testnet_bitlayer_1_default],
  ["ethereum-testnet-sepolia-ronin-1", ethereum_testnet_sepolia_ronin_1_default],
  ["ethereum-testnet-goerli-arbitrum-1", ethereum_testnet_goerli_arbitrum_1_default],
  ["ethereum-testnet-sepolia-arbitrum-1", ethereum_testnet_sepolia_arbitrum_1_default],
  ["private-testnet-mica", private_testnet_mica_default],
  ["avalanche-subnet-dexalot-testnet", avalanche_subnet_dexalot_testnet_default],
  ["ethereum-testnet-sepolia-scroll-1", ethereum_testnet_sepolia_scroll_1_default],
  ["ethereum-testnet-hoodi", ethereum_testnet_hoodi_default],
  ["avalanche-testnet-nexon", avalanche_testnet_nexon_default],
  ["bitcoin-testnet-merlin", bitcoin_testnet_merlin_default],
  ["pharos-testnet", pharos_testnet_default],
  ["pharos-atlantic-testnet", pharos_atlantic_testnet_default],
  [
    "ethereum-testnet-sepolia-polygon-validium-1",
    ethereum_testnet_sepolia_polygon_validium_1_default
  ],
  ["hemi-testnet-sepolia", hemi_testnet_sepolia_default],
  ["ink-testnet-sepolia", ink_testnet_sepolia_default],
  ["bitcoin-testnet-sepolia-bob-1", bitcoin_testnet_sepolia_bob_1_default],
  ["zklink_nova-testnet", zklink_nova_testnet_default],
  ["codex-testnet", codex_testnet_default],
  [
    "ethereum-testnet-sepolia-arbitrum-1-treasure-1",
    ethereum_testnet_sepolia_arbitrum_1_treasure_1_default
  ],
  ["treasure-testnet-topaz", treasure_testnet_topaz_default],
  ["jovay-testnet", jovay_testnet_default],
  ["arc-testnet", arc_testnet_default],
  ["dogeos-testnet-chikyu", dogeos_testnet_chikyu_default],
  ["celo-sepolia", celo_sepolia_default],
  ["ethereum-testnet-sepolia", ethereum_testnet_sepolia_default],
  ["ethereum-testnet-sepolia-optimism-1", ethereum_testnet_sepolia_optimism_1_default],
  ["neox-testnet-t4", neox_testnet_t4_default],
  ["ethereum-testnet-sepolia-corn-1", ethereum_testnet_sepolia_corn_1_default],
  ["filecoin-testnet", filecoin_testnet_default],
  ["plume-testnet", plume_testnet_default],
  ["ethereum-testnet-sepolia-blast-1", ethereum_testnet_sepolia_blast_1_default],
  ["zora-testnet", zora_testnet_default],
  ["tron-testnet-shasta-evm", tron_testnet_shasta_evm_default],
  ["tron-devnet-evm", tron_devnet_evm_default],
  ["tron-testnet-nile-evm", tron_testnet_nile_evm_default],
  ["solana-testnet", solana_testnet_default],
  ["solana-devnet", solana_devnet_default],
  ["aptos-testnet", aptos_testnet_default],
  ["aptos-localnet", aptos_localnet_default],
  ["sui-testnet", sui_testnet_default],
  ["sui-localnet", sui_localnet_default],
  ["ton-testnet", ton_testnet_default],
  ["ton-localnet", ton_localnet_default],
  ["tron-testnet-shasta", tron_testnet_shasta_default],
  ["tron-devnet", tron_devnet_default],
  ["tron-testnet-nile", tron_testnet_nile_default]
]);
var mainnetBySelectorByFamily = {
  evm: new Map([
    [5009297550715157269n, ethereum_mainnet_default],
    [3734403246176062136n, ethereum_mainnet_optimism_1_default],
    [1456215246176062136n, cronos_mainnet_default],
    [11964252391146578476n, rootstock_mainnet_default],
    [1477345371608778000n, telos_evm_mainnet_default],
    [8866418665544333000n, polkadot_mainnet_darwinia_default],
    [17673274061779414707n, xdc_mainnet_default],
    [1761333065194157300n, coinex_smart_chain_mainnet_default],
    [11344663589394136015n, binance_smart_chain_mainnet_default],
    [9688382747979139404n, gate_chain_mainnet_default],
    [465200170687744372n, gnosis_chain_mainnet_default],
    [374210358663784372n, velas_mainnet_default],
    [3993510008929295315n, shibarium_mainnet_default],
    [1923510103922296319n, ethereum_mainnet_unichain_1_default],
    [4051577828743386545n, polygon_mainnet_default],
    [8481857512324358265n, monad_mainnet_default],
    [1673871237479749969n, sonic_mainnet_default],
    [7613811247471741961n, ethereum_mainnet_hashkey_1_default],
    [17164792800244661392n, mint_mainnet_default],
    [3016212468291539606n, ethereum_mainnet_xlayer_1_default],
    [3776006016387883143n, bittorrent_chain_mainnet_default],
    [465944652040885897n, binance_smart_chain_mainnet_opbnb_1_default],
    [5406759801798337480n, bitcoin_mainnet_bsquared_1_default],
    [11690709103138290329n, mind_mainnet_default],
    [5608378062013572713n, lens_mainnet_default],
    [5936861837188149645n, tac_mainnet_default],
    [3768048213127883732n, fantom_mainnet_default],
    [1462016016387883143n, fraxtal_mainnet_default],
    [3719320017875267166n, ethereum_mainnet_kroma_1_default],
    [8239338020728974000n, neonlink_mainnet_default],
    [3229138320728879060n, hedera_mainnet_default],
    [4561443241176882990n, filecoin_mainnet_default],
    [1562403441176082196n, ethereum_mainnet_zksync_1_default],
    [8788096068760390840n, cronos_zkevm_mainnet_default],
    [2039744413822257700n, near_mainnet_default],
    [1939936305787790600n, areon_mainnet_default],
    [2049429975587534727n, ethereum_mainnet_worldchain_1_default],
    [6422105447186081193n, polkadot_mainnet_astar_default],
    [9107126442626377432n, janction_mainnet_default],
    [2135107236357186872n, bittensor_mainnet_default],
    [16978377838628290997n, stable_mainnet_default],
    [2442541497099098535n, hyperliquid_mainnet_default],
    [3358365939762719202n, conflux_mainnet_default],
    [8805746078405598895n, ethereum_mainnet_metis_1_default],
    [4348158687435793198n, ethereum_mainnet_polygon_zkevm_1_default],
    [5142893604156789321n, wemix_mainnet_default],
    [1224752112135636129n, core_mainnet_default],
    [15293031020466096408n, lisk_mainnet_default],
    [1252863800116739621n, polkadot_mainnet_moonbeam_default],
    [1355020143337428062n, kusama_mainnet_moonriver_default],
    [9027416829622342829n, sei_mainnet_default],
    [7801139999541420232n, pharos_mainnet_default],
    [13447077090413146373n, metal_mainnet_default],
    [12505351618335765396n, soneium_mainnet_default],
    [4874388048629246000n, bitcichain_mainnet_default],
    [6916147374840168594n, ronin_mainnet_default],
    [8175830712062617656n, polkadot_mainnet_centrifuge_default],
    [7550000543357438061n, kava_mainnet_default],
    [3577778157919314504n, abstract_mainnet_default],
    [18164309074156128038n, morph_mainnet_default],
    [6325494908023253251n, edge_mainnet_default],
    [4560701533377838164n, bitcoin_mainnet_botanix_default],
    [1540201334317828111n, ethereum_mainnet_astar_zkevm_1_default],
    [241851231317828981n, bitcoin_merlin_mainnet_default],
    [7281642695469137430n, tempo_mainnet_default],
    [6093540873831549674n, megaeth_mainnet_default],
    [1556008542357238666n, ethereum_mainnet_mantle_1_default],
    [470401360549526817n, superseed_mainnet_default],
    [17349189558768828726n, nibiru_mainnet_default],
    [10817664450262215148n, zetachain_mainnet_default],
    [9813823125703490621n, kaia_mainnet_default],
    [15971525489660198786n, ethereum_mainnet_base_1_default],
    [9335212494177455608n, plasma_mainnet_default],
    [9373518659714509671n, gate_layer_mainnet_default],
    [3162193654116181371n, ethereum_mainnet_arbitrum_1_l3x_1_default],
    [1237925231416731909n, ethereum_mainnet_immutable_zkevm_1_default],
    [4426351306075016396n, _0g_mainnet_default],
    [9723842205701363942n, everclear_mainnet_default],
    [14894068710063348487n, apechain_mainnet_default],
    [7264351850409363825n, ethereum_mainnet_mode_1_default],
    [4829375610284793157n, ab_mainnet_default],
    [4059281736450291836n, adi_mainnet_default],
    [4949039107694359620n, ethereum_mainnet_arbitrum_1_default],
    [1346049177634351622n, celo_mainnet_default],
    [13624601974233774587n, etherlink_mainnet_default],
    [1804312132722180201n, hemi_mainnet_default],
    [6433500567565415381n, avalanche_mainnet_default],
    [7222032299962346917n, neox_mainnet_default],
    [17198166215261833993n, ethereum_mainnet_zircuit_1_default],
    [6473245816409426016n, memento_mainnet_default],
    [3461204551265785888n, ethereum_mainnet_ink_1_default],
    [4627098889531055414n, ethereum_mainnet_linea_1_default],
    [15758750456714168963n, nexon_mainnet_lith_default],
    [3849287863852499584n, bitcoin_mainnet_bob_1_default],
    [5214452172935136222n, treasure_mainnet_default],
    [12657445206920369324n, nexon_mainnet_henesys_default],
    [1294465214383781161n, berachain_mainnet_default],
    [9478124434908827753n, codex_mainnet_default],
    [4411394078118774322n, ethereum_mainnet_blast_1_default],
    [17912061998839310979n, plume_mainnet_default],
    [16468599424800719238n, ethereum_mainnet_taiko_1_default],
    [7937294810946806131n, bitcoin_mainnet_bitlayer_1_default],
    [5463201557265485081n, avalanche_subnet_dexalot_mainnet_default],
    [13204309965629103672n, ethereum_mainnet_scroll_1_default],
    [2459028469735686113n, polygon_mainnet_katana_default],
    [14632960069656270105n, nexon_qa_default],
    [4350319965322101699n, zklink_nova_mainnet_default],
    [5556806327594153475n, nexon_stage_default],
    [1010349088906777999n, ethereum_mainnet_arbitrum_1_treasure_1_default],
    [1523760397290643893n, jovay_mainnet_default],
    [3555797439612589184n, zora_mainnet_default],
    [9043146809313071210n, corn_mainnet_default],
    [1546563616611573946n, tron_mainnet_evm_default]
  ]),
  solana: new Map([[124615329519749607n, solana_mainnet_default]]),
  aptos: new Map([[4741433654826277614n, aptos_mainnet_default]]),
  sui: new Map([[17529533435026248318n, sui_mainnet_default]]),
  ton: new Map([[16448340667252469081n, ton_mainnet_default]]),
  tron: new Map([[1546563616611573945n, tron_mainnet_default]])
};
var testnetBySelectorByFamily = {
  evm: new Map([
    [8953668971247136127n, bitcoin_testnet_rootstock_default],
    [729797994450396300n, telos_evm_testnet_default],
    [4340886533089894000n, polkadot_testnet_darwinia_pangoro_default],
    [3017758115101368649n, xdc_testnet_default],
    [8955032871639343000n, coinex_smart_chain_testnet_default],
    [6955638871347136141n, polkadot_testnet_astar_shibuya_default],
    [3558960680482140165n, gate_chain_testnet_meteora_default],
    [13264668187771770619n, binance_smart_chain_testnet_default],
    [572210378683744374n, velas_testnet_default],
    [4356164186791070119n, ethereum_testnet_sepolia_hashkey_1_default],
    [17833296867764334567n, shibarium_testnet_puppynet_default],
    [2066098519157881736n, ethereum_testnet_sepolia_xlayer_1_default],
    [16487132492576884721n, cronos_zkevm_testnet_sepolia_default],
    [6802309497652714138n, ethereum_testnet_goerli_zksync_1_default],
    [3842103497652714138n, cronos_testnet_zkevm_1_default],
    [222782988166878823n, hedera_testnet_default],
    [6898391096552792247n, ethereum_testnet_sepolia_zksync_1_default],
    [2995292832068775165n, cronos_testnet_default],
    [5061593697262339000n, near_testnet_default],
    [2664363617261496610n, ethereum_testnet_goerli_optimism_1_default],
    [7317911323415911000n, areon_testnet_default],
    [5059197667603797935n, janction_testnet_sepolia_default],
    [6260932437388305511n, private_testnet_obsidian_default],
    [829525985033418733n, ethereum_testnet_sepolia_mode_1_default],
    [2177900824115119161n, bittensor_testnet_default],
    [4286062357653186312n, hyperliquid_testnet_default],
    [2624132734533621656n, kaia_testnet_kairos_default],
    [4459371029167934217n, bittorrent_chain_testnet_default],
    [9284632837123596123n, wemix_testnet_default],
    [4264732132125536123n, core_testnet_default],
    [1948510578179542068n, bitcoin_testnet_bsquared_1_default],
    [5361632739113536121n, polkadot_testnet_moonbeam_moonbase_default],
    [14135854469784514356n, ethereum_testnet_sepolia_unichain_1_default],
    [1216300075444106652n, sei_testnet_atlantic_default],
    [3379446385462418246n, geth_testnet_default],
    [11059667695644972511n, ethereum_testnet_goerli_polygon_zkevm_1_default],
    [4237030917318060427n, story_testnet_default],
    [10749384167430721561n, mint_testnet_default],
    [6286293440461807648n, metal_testnet_default],
    [4888058894222120000n, bitcichain_testnet_default],
    [686603546605904534n, ethereum_testnet_sepolia_soneium_1_default],
    [10212741611335999305n, xlayer_testnet_default],
    [13116810400804392105n, ronin_testnet_saigon_default],
    [3260900564719373474n, private_testnet_granite_default],
    [6915682381028791124n, private_testnet_andesite_default],
    [15513093881969820114n, dtcc_testnet_andesite_default],
    [2333097300889804761n, polkadot_testnet_centrifuge_altair_default],
    [12168171414969487009n, memento_testnet_default],
    [11793402411494852765n, stable_testnet_default],
    [2110537777356199208n, kava_testnet_default],
    [5990477251245693094n, ethereum_testnet_sepolia_kroma_1_default],
    [9488606126177218005n, tac_testnet_default],
    [1654667687261492630n, ethereum_testnet_sepolia_polygon_zkevm_1_default],
    [8901520481741771655n, ethereum_testnet_holesky_fraxtal_1_default],
    [8304510386741731151n, ethereum_testnet_holesky_morph_1_default],
    [1064004874793747259n, ethereum_testnet_hoodi_morph_default],
    [1467223411771711614n, bitcoin_testnet_botanix_default],
    [4905564228793744293n, fantom_testnet_default],
    [5298399861320400553n, ethereum_testnet_sepolia_lisk_1_default],
    [5299555114858065850n, ethereum_testnet_sepolia_worldchain_1_default],
    [4168263376276232250n, ethereum_testnet_goerli_mantle_1_default],
    [8236463271206331221n, ethereum_testnet_sepolia_mantle_1_default],
    [13274425992935471758n, binance_smart_chain_testnet_opbnb_1_default],
    [8911150974185440581n, nexon_dev_default],
    [2443239559770384419n, megaeth_testnet_default],
    [18241817625092392675n, megaeth_testnet_2_default],
    [379340054879810246n, everclear_testnet_sepolia_default],
    [305104239123120457n, nibiru_testnet_default],
    [344208382356656551n, ondo_testnet_default],
    [1113014352258747600n, neonlink_testnet_default],
    [3967220077692964309n, plasma_testnet_default],
    [3667207123485082040n, gate_layer_testnet_default],
    [2183018362218727504n, monad_testnet_default],
    [8871595565390010547n, gnosis_chain_testnet_chiado_default],
    [16235373811196386733n, abstract_testnet_default],
    [3486622437121596122n, ethereum_testnet_sepolia_arbitrum_1_l3x_1_default],
    [4526165231216331901n, ethereum_testnet_sepolia_immutable_zkevm_1_default],
    [1763698235108410440n, sonic_testnet_default],
    [16088006396410204581n, _0g_testnet_newton_default],
    [2131427466778448014n, _0g_testnet_galileo_default],
    [6892437333620424805n, _0g_testnet_galileo_1_default],
    [7717148896336251131n, ethereum_testnet_holesky_default],
    [7051849327615092843n, ab_testnet_default],
    [7759470850252068959n, anvil_devnet_default],
    [9900119385908781505n, apechain_testnet_curtis_default],
    [13222148116102326311n, edge_testnet_default],
    [6827576821754315911n, ethereum_testnet_sepolia_lens_1_default],
    [3963528237232804922n, tempo_testnet_default],
    [8457817439310187923n, tempo_testnet_moderato_default],
    [14767482510784806043n, avalanche_testnet_fuji_default],
    [3552045678561919002n, celo_testnet_alfajores_default],
    [8446413392851542429n, private_testnet_opala_default],
    [2032988798112970440n, robinhood_testnet_default],
    [13781831279385219069n, zircuit_testnet_garfield_default],
    [4562743618362911021n, ethereum_testnet_sepolia_zircuit_1_default],
    [13694007683517087973n, superseed_testnet_default],
    [3676871237479449268n, sonic_testnet_blaze_default],
    [1355246678561316402n, ethereum_testnet_goerli_linea_1_default],
    [5719461335882077547n, ethereum_testnet_sepolia_linea_1_default],
    [3777822886988675105n, ethereum_testnet_sepolia_metis_1_default],
    [12532609583862916517n, polygon_testnet_mumbai_default],
    [16281711391670634445n, polygon_testnet_amoy_default],
    [7728255861635209484n, berachain_testnet_bepolia_default],
    [8999465244383784164n, berachain_testnet_bartio_default],
    [12336603543561911511n, berachain_testnet_artio_default],
    [2285225387454015855n, zero_g_testnet_galileo_default],
    [5790810961207155433n, ethereum_testnet_goerli_base_1_default],
    [10344971235874465080n, ethereum_testnet_sepolia_base_1_default],
    [3743020999916460931n, plume_devnet_default],
    [13874588925447303949n, plume_testnet_sepolia_default],
    [9418205736192840573n, adi_testnet_default],
    [1910019406958449359n, etherlink_testnet_default],
    [9090863410735740267n, polygon_testnet_tatara_default],
    [7248756420937879088n, ethereum_testnet_holesky_taiko_1_default],
    [9873759436596923887n, ethereum_testnet_hoodi_taiko_default],
    [15858691699034549072n, ethereum_testnet_hoodi_taiko_1_default],
    [7189150270347329685n, mind_testnet_default],
    [3789623672476206327n, bitcoin_testnet_bitlayer_1_default],
    [1091131740251125869n, ethereum_testnet_sepolia_ronin_1_default],
    [6101244977088475029n, ethereum_testnet_goerli_arbitrum_1_default],
    [3478487238524512106n, ethereum_testnet_sepolia_arbitrum_1_default],
    [4489326297382772450n, private_testnet_mica_default],
    [1458281248224512906n, avalanche_subnet_dexalot_testnet_default],
    [2279865765895943307n, ethereum_testnet_sepolia_scroll_1_default],
    [10380998176179737091n, ethereum_testnet_hoodi_default],
    [7837562506228496256n, avalanche_testnet_nexon_default],
    [5269261765892944301n, bitcoin_testnet_merlin_default],
    [4012524741200567430n, pharos_testnet_default],
    [16098325658947243212n, pharos_atlantic_testnet_default],
    [4418231248214522936n, ethereum_testnet_sepolia_polygon_validium_1_default],
    [16126893759944359622n, hemi_testnet_sepolia_default],
    [9763904284804119144n, ink_testnet_sepolia_default],
    [5535534526963509396n, bitcoin_testnet_sepolia_bob_1_default],
    [5837261596322416298n, zklink_nova_testnet_default],
    [7225665875429174318n, codex_testnet_default],
    [10443705513486043421n, ethereum_testnet_sepolia_arbitrum_1_treasure_1_default],
    [3676916124122457866n, treasure_testnet_topaz_default],
    [945045181441419236n, jovay_testnet_default],
    [3034092155422581607n, arc_testnet_default],
    [7254999290874773717n, dogeos_testnet_chikyu_default],
    [3761762704474186180n, celo_sepolia_default],
    [16015286601757825753n, ethereum_testnet_sepolia_default],
    [5224473277236331295n, ethereum_testnet_sepolia_optimism_1_default],
    [2217764097022649312n, neox_testnet_t4_default],
    [1467427327723633929n, ethereum_testnet_sepolia_corn_1_default],
    [7060342227814389000n, filecoin_testnet_default],
    [14684575664602284776n, plume_testnet_default],
    [2027362563942762617n, ethereum_testnet_sepolia_blast_1_default],
    [16244020411108056671n, zora_testnet_default],
    [13231703482326770598n, tron_testnet_shasta_evm_default],
    [13231703482326770600n, tron_devnet_evm_default],
    [2052925811360307749n, tron_testnet_nile_evm_default]
  ]),
  solana: new Map([
    [6302590918974934319n, solana_testnet_default],
    [16423721717087811551n, solana_devnet_default]
  ]),
  aptos: new Map([
    [743186221051783445n, aptos_testnet_default],
    [4457093679053095497n, aptos_localnet_default]
  ]),
  sui: new Map([
    [9762610643973837292n, sui_testnet_default],
    [18395503381733958356n, sui_localnet_default]
  ]),
  ton: new Map([
    [1399300952838017768n, ton_testnet_default],
    [13879075125137744094n, ton_localnet_default]
  ]),
  tron: new Map([
    [13231703482326770597n, tron_testnet_shasta_default],
    [13231703482326770599n, tron_devnet_default],
    [2052925811360307740n, tron_testnet_nile_default]
  ])
};
var mainnetByNameByFamily = {
  evm: new Map([
    ["ethereum-mainnet", ethereum_mainnet_default],
    ["ethereum-mainnet-optimism-1", ethereum_mainnet_optimism_1_default],
    ["cronos-mainnet", cronos_mainnet_default],
    ["rootstock-mainnet", rootstock_mainnet_default],
    ["telos-evm-mainnet", telos_evm_mainnet_default],
    ["polkadot-mainnet-darwinia", polkadot_mainnet_darwinia_default],
    ["xdc-mainnet", xdc_mainnet_default],
    ["coinex_smart_chain-mainnet", coinex_smart_chain_mainnet_default],
    ["binance_smart_chain-mainnet", binance_smart_chain_mainnet_default],
    ["gate-chain-mainnet", gate_chain_mainnet_default],
    ["gnosis_chain-mainnet", gnosis_chain_mainnet_default],
    ["velas-mainnet", velas_mainnet_default],
    ["shibarium-mainnet", shibarium_mainnet_default],
    ["ethereum-mainnet-unichain-1", ethereum_mainnet_unichain_1_default],
    ["polygon-mainnet", polygon_mainnet_default],
    ["monad-mainnet", monad_mainnet_default],
    ["sonic-mainnet", sonic_mainnet_default],
    ["ethereum-mainnet-hashkey-1", ethereum_mainnet_hashkey_1_default],
    ["mint-mainnet", mint_mainnet_default],
    ["ethereum-mainnet-xlayer-1", ethereum_mainnet_xlayer_1_default],
    ["bittorrent_chain-mainnet", bittorrent_chain_mainnet_default],
    ["binance_smart_chain-mainnet-opbnb-1", binance_smart_chain_mainnet_opbnb_1_default],
    ["bitcoin-mainnet-bsquared-1", bitcoin_mainnet_bsquared_1_default],
    ["mind-mainnet", mind_mainnet_default],
    ["lens-mainnet", lens_mainnet_default],
    ["tac-mainnet", tac_mainnet_default],
    ["fantom-mainnet", fantom_mainnet_default],
    ["fraxtal-mainnet", fraxtal_mainnet_default],
    ["ethereum-mainnet-kroma-1", ethereum_mainnet_kroma_1_default],
    ["neonlink-mainnet", neonlink_mainnet_default],
    ["hedera-mainnet", hedera_mainnet_default],
    ["filecoin-mainnet", filecoin_mainnet_default],
    ["ethereum-mainnet-zksync-1", ethereum_mainnet_zksync_1_default],
    ["cronos-zkevm-mainnet", cronos_zkevm_mainnet_default],
    ["near-mainnet", near_mainnet_default],
    ["areon-mainnet", areon_mainnet_default],
    ["ethereum-mainnet-worldchain-1", ethereum_mainnet_worldchain_1_default],
    ["polkadot-mainnet-astar", polkadot_mainnet_astar_default],
    ["janction-mainnet", janction_mainnet_default],
    ["bittensor-mainnet", bittensor_mainnet_default],
    ["stable-mainnet", stable_mainnet_default],
    ["hyperliquid-mainnet", hyperliquid_mainnet_default],
    ["conflux-mainnet", conflux_mainnet_default],
    ["ethereum-mainnet-metis-1", ethereum_mainnet_metis_1_default],
    ["ethereum-mainnet-polygon-zkevm-1", ethereum_mainnet_polygon_zkevm_1_default],
    ["wemix-mainnet", wemix_mainnet_default],
    ["core-mainnet", core_mainnet_default],
    ["lisk-mainnet", lisk_mainnet_default],
    ["polkadot-mainnet-moonbeam", polkadot_mainnet_moonbeam_default],
    ["kusama-mainnet-moonriver", kusama_mainnet_moonriver_default],
    ["sei-mainnet", sei_mainnet_default],
    ["pharos-mainnet", pharos_mainnet_default],
    ["metal-mainnet", metal_mainnet_default],
    ["soneium-mainnet", soneium_mainnet_default],
    ["bitcichain-mainnet", bitcichain_mainnet_default],
    ["ronin-mainnet", ronin_mainnet_default],
    ["polkadot-mainnet-centrifuge", polkadot_mainnet_centrifuge_default],
    ["kava-mainnet", kava_mainnet_default],
    ["abstract-mainnet", abstract_mainnet_default],
    ["morph-mainnet", morph_mainnet_default],
    ["edge-mainnet", edge_mainnet_default],
    ["bitcoin-mainnet-botanix", bitcoin_mainnet_botanix_default],
    ["ethereum-mainnet-astar-zkevm-1", ethereum_mainnet_astar_zkevm_1_default],
    ["bitcoin-merlin-mainnet", bitcoin_merlin_mainnet_default],
    ["tempo-mainnet", tempo_mainnet_default],
    ["megaeth-mainnet", megaeth_mainnet_default],
    ["ethereum-mainnet-mantle-1", ethereum_mainnet_mantle_1_default],
    ["superseed-mainnet", superseed_mainnet_default],
    ["nibiru-mainnet", nibiru_mainnet_default],
    ["zetachain-mainnet", zetachain_mainnet_default],
    ["kaia-mainnet", kaia_mainnet_default],
    ["ethereum-mainnet-base-1", ethereum_mainnet_base_1_default],
    ["plasma-mainnet", plasma_mainnet_default],
    ["gate-layer-mainnet", gate_layer_mainnet_default],
    ["ethereum-mainnet-arbitrum-1-l3x-1", ethereum_mainnet_arbitrum_1_l3x_1_default],
    ["ethereum-mainnet-immutable-zkevm-1", ethereum_mainnet_immutable_zkevm_1_default],
    ["0g-mainnet", _0g_mainnet_default],
    ["everclear-mainnet", everclear_mainnet_default],
    ["apechain-mainnet", apechain_mainnet_default],
    ["ethereum-mainnet-mode-1", ethereum_mainnet_mode_1_default],
    ["ab-mainnet", ab_mainnet_default],
    ["adi-mainnet", adi_mainnet_default],
    ["ethereum-mainnet-arbitrum-1", ethereum_mainnet_arbitrum_1_default],
    ["celo-mainnet", celo_mainnet_default],
    ["etherlink-mainnet", etherlink_mainnet_default],
    ["hemi-mainnet", hemi_mainnet_default],
    ["avalanche-mainnet", avalanche_mainnet_default],
    ["neox-mainnet", neox_mainnet_default],
    ["ethereum-mainnet-zircuit-1", ethereum_mainnet_zircuit_1_default],
    ["memento-mainnet", memento_mainnet_default],
    ["ethereum-mainnet-ink-1", ethereum_mainnet_ink_1_default],
    ["ethereum-mainnet-linea-1", ethereum_mainnet_linea_1_default],
    ["nexon-mainnet-lith", nexon_mainnet_lith_default],
    ["bitcoin-mainnet-bob-1", bitcoin_mainnet_bob_1_default],
    ["treasure-mainnet", treasure_mainnet_default],
    ["nexon-mainnet-henesys", nexon_mainnet_henesys_default],
    ["berachain-mainnet", berachain_mainnet_default],
    ["codex-mainnet", codex_mainnet_default],
    ["ethereum-mainnet-blast-1", ethereum_mainnet_blast_1_default],
    ["plume-mainnet", plume_mainnet_default],
    ["ethereum-mainnet-taiko-1", ethereum_mainnet_taiko_1_default],
    ["bitcoin-mainnet-bitlayer-1", bitcoin_mainnet_bitlayer_1_default],
    ["avalanche-subnet-dexalot-mainnet", avalanche_subnet_dexalot_mainnet_default],
    ["ethereum-mainnet-scroll-1", ethereum_mainnet_scroll_1_default],
    ["polygon-mainnet-katana", polygon_mainnet_katana_default],
    ["nexon-qa", nexon_qa_default],
    ["zklink_nova-mainnet", zklink_nova_mainnet_default],
    ["nexon-stage", nexon_stage_default],
    ["ethereum-mainnet-arbitrum-1-treasure-1", ethereum_mainnet_arbitrum_1_treasure_1_default],
    ["jovay-mainnet", jovay_mainnet_default],
    ["zora-mainnet", zora_mainnet_default],
    ["corn-mainnet", corn_mainnet_default],
    ["tron-mainnet-evm", tron_mainnet_evm_default]
  ]),
  solana: new Map([["solana-mainnet", solana_mainnet_default]]),
  aptos: new Map([["aptos-mainnet", aptos_mainnet_default]]),
  sui: new Map([["sui-mainnet", sui_mainnet_default]]),
  ton: new Map([["ton-mainnet", ton_mainnet_default]]),
  tron: new Map([["tron-mainnet", tron_mainnet_default]])
};
var testnetByNameByFamily = {
  evm: new Map([
    ["bitcoin-testnet-rootstock", bitcoin_testnet_rootstock_default],
    ["telos-evm-testnet", telos_evm_testnet_default],
    ["polkadot-testnet-darwinia-pangoro", polkadot_testnet_darwinia_pangoro_default],
    ["xdc-testnet", xdc_testnet_default],
    ["coinex_smart_chain-testnet", coinex_smart_chain_testnet_default],
    ["polkadot-testnet-astar-shibuya", polkadot_testnet_astar_shibuya_default],
    ["gate-chain-testnet-meteora", gate_chain_testnet_meteora_default],
    ["binance_smart_chain-testnet", binance_smart_chain_testnet_default],
    ["velas-testnet", velas_testnet_default],
    ["ethereum-testnet-sepolia-hashkey-1", ethereum_testnet_sepolia_hashkey_1_default],
    ["shibarium-testnet-puppynet", shibarium_testnet_puppynet_default],
    ["ethereum-testnet-sepolia-xlayer-1", ethereum_testnet_sepolia_xlayer_1_default],
    ["cronos-zkevm-testnet-sepolia", cronos_zkevm_testnet_sepolia_default],
    ["ethereum-testnet-goerli-zksync-1", ethereum_testnet_goerli_zksync_1_default],
    ["cronos-testnet-zkevm-1", cronos_testnet_zkevm_1_default],
    ["hedera-testnet", hedera_testnet_default],
    ["ethereum-testnet-sepolia-zksync-1", ethereum_testnet_sepolia_zksync_1_default],
    ["cronos-testnet", cronos_testnet_default],
    ["near-testnet", near_testnet_default],
    ["ethereum-testnet-goerli-optimism-1", ethereum_testnet_goerli_optimism_1_default],
    ["areon-testnet", areon_testnet_default],
    ["janction-testnet-sepolia", janction_testnet_sepolia_default],
    ["private-testnet-obsidian", private_testnet_obsidian_default],
    ["ethereum-testnet-sepolia-mode-1", ethereum_testnet_sepolia_mode_1_default],
    ["bittensor-testnet", bittensor_testnet_default],
    ["hyperliquid-testnet", hyperliquid_testnet_default],
    ["kaia-testnet-kairos", kaia_testnet_kairos_default],
    ["bittorrent_chain-testnet", bittorrent_chain_testnet_default],
    ["wemix-testnet", wemix_testnet_default],
    ["core-testnet", core_testnet_default],
    ["bitcoin-testnet-bsquared-1", bitcoin_testnet_bsquared_1_default],
    ["polkadot-testnet-moonbeam-moonbase", polkadot_testnet_moonbeam_moonbase_default],
    ["ethereum-testnet-sepolia-unichain-1", ethereum_testnet_sepolia_unichain_1_default],
    ["sei-testnet-atlantic", sei_testnet_atlantic_default],
    ["geth-testnet", geth_testnet_default],
    [
      "ethereum-testnet-goerli-polygon-zkevm-1",
      ethereum_testnet_goerli_polygon_zkevm_1_default
    ],
    ["story-testnet", story_testnet_default],
    ["mint-testnet", mint_testnet_default],
    ["metal-testnet", metal_testnet_default],
    ["bitcichain-testnet", bitcichain_testnet_default],
    ["ethereum-testnet-sepolia-soneium-1", ethereum_testnet_sepolia_soneium_1_default],
    ["xlayer-testnet", xlayer_testnet_default],
    ["ronin-testnet-saigon", ronin_testnet_saigon_default],
    ["private-testnet-granite", private_testnet_granite_default],
    ["private-testnet-andesite", private_testnet_andesite_default],
    ["dtcc-testnet-andesite", dtcc_testnet_andesite_default],
    ["polkadot-testnet-centrifuge-altair", polkadot_testnet_centrifuge_altair_default],
    ["memento-testnet", memento_testnet_default],
    ["stable-testnet", stable_testnet_default],
    ["kava-testnet", kava_testnet_default],
    ["ethereum-testnet-sepolia-kroma-1", ethereum_testnet_sepolia_kroma_1_default],
    ["tac-testnet", tac_testnet_default],
    [
      "ethereum-testnet-sepolia-polygon-zkevm-1",
      ethereum_testnet_sepolia_polygon_zkevm_1_default
    ],
    ["ethereum-testnet-holesky-fraxtal-1", ethereum_testnet_holesky_fraxtal_1_default],
    ["ethereum-testnet-holesky-morph-1", ethereum_testnet_holesky_morph_1_default],
    ["ethereum-testnet-hoodi-morph", ethereum_testnet_hoodi_morph_default],
    ["bitcoin-testnet-botanix", bitcoin_testnet_botanix_default],
    ["fantom-testnet", fantom_testnet_default],
    ["ethereum-testnet-sepolia-lisk-1", ethereum_testnet_sepolia_lisk_1_default],
    ["ethereum-testnet-sepolia-worldchain-1", ethereum_testnet_sepolia_worldchain_1_default],
    ["ethereum-testnet-goerli-mantle-1", ethereum_testnet_goerli_mantle_1_default],
    ["ethereum-testnet-sepolia-mantle-1", ethereum_testnet_sepolia_mantle_1_default],
    ["binance_smart_chain-testnet-opbnb-1", binance_smart_chain_testnet_opbnb_1_default],
    ["nexon-dev", nexon_dev_default],
    ["megaeth-testnet", megaeth_testnet_default],
    ["megaeth-testnet-2", megaeth_testnet_2_default],
    ["everclear-testnet-sepolia", everclear_testnet_sepolia_default],
    ["nibiru-testnet", nibiru_testnet_default],
    ["ondo-testnet", ondo_testnet_default],
    ["neonlink-testnet", neonlink_testnet_default],
    ["plasma-testnet", plasma_testnet_default],
    ["gate-layer-testnet", gate_layer_testnet_default],
    ["monad-testnet", monad_testnet_default],
    ["gnosis_chain-testnet-chiado", gnosis_chain_testnet_chiado_default],
    ["abstract-testnet", abstract_testnet_default],
    [
      "ethereum-testnet-sepolia-arbitrum-1-l3x-1",
      ethereum_testnet_sepolia_arbitrum_1_l3x_1_default
    ],
    [
      "ethereum-testnet-sepolia-immutable-zkevm-1",
      ethereum_testnet_sepolia_immutable_zkevm_1_default
    ],
    ["sonic-testnet", sonic_testnet_default],
    ["0g-testnet-newton", _0g_testnet_newton_default],
    ["0g-testnet-galileo", _0g_testnet_galileo_default],
    ["0g-testnet-galileo-1", _0g_testnet_galileo_1_default],
    ["ethereum-testnet-holesky", ethereum_testnet_holesky_default],
    ["ab-testnet", ab_testnet_default],
    ["anvil-devnet", anvil_devnet_default],
    ["apechain-testnet-curtis", apechain_testnet_curtis_default],
    ["edge-testnet", edge_testnet_default],
    ["ethereum-testnet-sepolia-lens-1", ethereum_testnet_sepolia_lens_1_default],
    ["tempo-testnet", tempo_testnet_default],
    ["tempo-testnet-moderato", tempo_testnet_moderato_default],
    ["avalanche-testnet-fuji", avalanche_testnet_fuji_default],
    ["celo-testnet-alfajores", celo_testnet_alfajores_default],
    ["private-testnet-opala", private_testnet_opala_default],
    ["robinhood-testnet", robinhood_testnet_default],
    ["zircuit-testnet-garfield", zircuit_testnet_garfield_default],
    ["ethereum-testnet-sepolia-zircuit-1", ethereum_testnet_sepolia_zircuit_1_default],
    ["superseed-testnet", superseed_testnet_default],
    ["sonic-testnet-blaze", sonic_testnet_blaze_default],
    ["ethereum-testnet-goerli-linea-1", ethereum_testnet_goerli_linea_1_default],
    ["ethereum-testnet-sepolia-linea-1", ethereum_testnet_sepolia_linea_1_default],
    ["ethereum-testnet-sepolia-metis-1", ethereum_testnet_sepolia_metis_1_default],
    ["polygon-testnet-mumbai", polygon_testnet_mumbai_default],
    ["polygon-testnet-amoy", polygon_testnet_amoy_default],
    ["berachain-testnet-bepolia", berachain_testnet_bepolia_default],
    ["berachain-testnet-bartio", berachain_testnet_bartio_default],
    ["berachain-testnet-artio", berachain_testnet_artio_default],
    ["zero-g-testnet-galileo", zero_g_testnet_galileo_default],
    ["ethereum-testnet-goerli-base-1", ethereum_testnet_goerli_base_1_default],
    ["ethereum-testnet-sepolia-base-1", ethereum_testnet_sepolia_base_1_default],
    ["plume-devnet", plume_devnet_default],
    ["plume-testnet-sepolia", plume_testnet_sepolia_default],
    ["adi-testnet", adi_testnet_default],
    ["etherlink-testnet", etherlink_testnet_default],
    ["polygon-testnet-tatara", polygon_testnet_tatara_default],
    ["ethereum-testnet-holesky-taiko-1", ethereum_testnet_holesky_taiko_1_default],
    ["ethereum-testnet-hoodi-taiko", ethereum_testnet_hoodi_taiko_default],
    ["ethereum-testnet-hoodi-taiko-1", ethereum_testnet_hoodi_taiko_1_default],
    ["mind-testnet", mind_testnet_default],
    ["bitcoin-testnet-bitlayer-1", bitcoin_testnet_bitlayer_1_default],
    ["ethereum-testnet-sepolia-ronin-1", ethereum_testnet_sepolia_ronin_1_default],
    ["ethereum-testnet-goerli-arbitrum-1", ethereum_testnet_goerli_arbitrum_1_default],
    ["ethereum-testnet-sepolia-arbitrum-1", ethereum_testnet_sepolia_arbitrum_1_default],
    ["private-testnet-mica", private_testnet_mica_default],
    ["avalanche-subnet-dexalot-testnet", avalanche_subnet_dexalot_testnet_default],
    ["ethereum-testnet-sepolia-scroll-1", ethereum_testnet_sepolia_scroll_1_default],
    ["ethereum-testnet-hoodi", ethereum_testnet_hoodi_default],
    ["avalanche-testnet-nexon", avalanche_testnet_nexon_default],
    ["bitcoin-testnet-merlin", bitcoin_testnet_merlin_default],
    ["pharos-testnet", pharos_testnet_default],
    ["pharos-atlantic-testnet", pharos_atlantic_testnet_default],
    [
      "ethereum-testnet-sepolia-polygon-validium-1",
      ethereum_testnet_sepolia_polygon_validium_1_default
    ],
    ["hemi-testnet-sepolia", hemi_testnet_sepolia_default],
    ["ink-testnet-sepolia", ink_testnet_sepolia_default],
    ["bitcoin-testnet-sepolia-bob-1", bitcoin_testnet_sepolia_bob_1_default],
    ["zklink_nova-testnet", zklink_nova_testnet_default],
    ["codex-testnet", codex_testnet_default],
    [
      "ethereum-testnet-sepolia-arbitrum-1-treasure-1",
      ethereum_testnet_sepolia_arbitrum_1_treasure_1_default
    ],
    ["treasure-testnet-topaz", treasure_testnet_topaz_default],
    ["jovay-testnet", jovay_testnet_default],
    ["arc-testnet", arc_testnet_default],
    ["dogeos-testnet-chikyu", dogeos_testnet_chikyu_default],
    ["celo-sepolia", celo_sepolia_default],
    ["ethereum-testnet-sepolia", ethereum_testnet_sepolia_default],
    ["ethereum-testnet-sepolia-optimism-1", ethereum_testnet_sepolia_optimism_1_default],
    ["neox-testnet-t4", neox_testnet_t4_default],
    ["ethereum-testnet-sepolia-corn-1", ethereum_testnet_sepolia_corn_1_default],
    ["filecoin-testnet", filecoin_testnet_default],
    ["plume-testnet", plume_testnet_default],
    ["ethereum-testnet-sepolia-blast-1", ethereum_testnet_sepolia_blast_1_default],
    ["zora-testnet", zora_testnet_default],
    ["tron-testnet-shasta-evm", tron_testnet_shasta_evm_default],
    ["tron-devnet-evm", tron_devnet_evm_default],
    ["tron-testnet-nile-evm", tron_testnet_nile_evm_default]
  ]),
  solana: new Map([
    ["solana-testnet", solana_testnet_default],
    ["solana-devnet", solana_devnet_default]
  ]),
  aptos: new Map([
    ["aptos-testnet", aptos_testnet_default],
    ["aptos-localnet", aptos_localnet_default]
  ]),
  sui: new Map([
    ["sui-testnet", sui_testnet_default],
    ["sui-localnet", sui_localnet_default]
  ]),
  ton: new Map([
    ["ton-testnet", ton_testnet_default],
    ["ton-localnet", ton_localnet_default]
  ]),
  tron: new Map([
    ["tron-testnet-shasta", tron_testnet_shasta_default],
    ["tron-devnet", tron_devnet_default],
    ["tron-testnet-nile", tron_testnet_nile_default]
  ])
};

class NetworkLookup {
  maps;
  constructor(maps) {
    this.maps = maps;
  }
  find(options) {
    const { chainSelector, chainSelectorName, isTestnet, chainFamily } = options;
    const getBySelector = (map) => {
      if (chainSelector === undefined)
        return;
      return map.get(chainSelector);
    };
    if (chainSelector === undefined && !chainSelectorName) {
      return;
    }
    if (chainFamily && chainSelector !== undefined) {
      if (isTestnet === false) {
        return getBySelector(this.maps.mainnetBySelectorByFamily[chainFamily]);
      }
      if (isTestnet === true) {
        return getBySelector(this.maps.testnetBySelectorByFamily[chainFamily]);
      }
      let network282 = getBySelector(this.maps.testnetBySelectorByFamily[chainFamily]);
      if (!network282) {
        network282 = getBySelector(this.maps.mainnetBySelectorByFamily[chainFamily]);
      }
      return network282;
    }
    if (chainFamily && chainSelectorName) {
      if (isTestnet === false) {
        return this.maps.mainnetByNameByFamily[chainFamily].get(chainSelectorName);
      }
      if (isTestnet === true) {
        return this.maps.testnetByNameByFamily[chainFamily].get(chainSelectorName);
      }
      let network282 = this.maps.testnetByNameByFamily[chainFamily].get(chainSelectorName);
      if (!network282) {
        network282 = this.maps.mainnetByNameByFamily[chainFamily].get(chainSelectorName);
      }
      return network282;
    }
    if (chainSelector !== undefined) {
      if (isTestnet === false) {
        return getBySelector(this.maps.mainnetBySelector);
      }
      if (isTestnet === true) {
        return getBySelector(this.maps.testnetBySelector);
      }
      let network282 = getBySelector(this.maps.testnetBySelector);
      if (!network282) {
        network282 = getBySelector(this.maps.mainnetBySelector);
      }
      return network282;
    }
    if (chainSelectorName) {
      if (isTestnet === false) {
        return this.maps.mainnetByName.get(chainSelectorName);
      }
      if (isTestnet === true) {
        return this.maps.testnetByName.get(chainSelectorName);
      }
      let network282 = this.maps.testnetByName.get(chainSelectorName);
      if (!network282) {
        network282 = this.maps.mainnetByName.get(chainSelectorName);
      }
      return network282;
    }
    return;
  }
}
var defaultLookup = new NetworkLookup({
  mainnetByName,
  mainnetByNameByFamily,
  mainnetBySelector,
  mainnetBySelectorByFamily,
  testnetByName,
  testnetByNameByFamily,
  testnetBySelector,
  testnetBySelectorByFamily
});

class Int64 {
  static INT64_MIN = -(2n ** 63n);
  static INT64_MAX = 2n ** 63n - 1n;
  value;
  static toInt64Bigint(v) {
    if (typeof v === "string") {
      const bi2 = BigInt(v);
      return Int64.toInt64Bigint(bi2);
    }
    if (typeof v === "bigint") {
      if (v > Int64.INT64_MAX)
        throw new Error("int64 overflow");
      else if (v < Int64.INT64_MIN)
        throw new Error("int64 underflow");
      return v;
    }
    if (!Number.isFinite(v) || !Number.isInteger(v))
      throw new Error("int64 requires an integer number");
    const bi = BigInt(v);
    if (bi > Int64.INT64_MAX)
      throw new Error("int64 overflow");
    else if (bi < Int64.INT64_MIN)
      throw new Error("int64 underflow");
    return bi;
  }
  constructor(v) {
    this.value = Int64.toInt64Bigint(v);
  }
  add(i2, safe = true) {
    return safe ? new Int64(this.value + i2.value) : new Int64(BigInt.asIntN(64, this.value + i2.value));
  }
  sub(i2, safe = true) {
    return safe ? new Int64(this.value - i2.value) : new Int64(BigInt.asIntN(64, this.value - i2.value));
  }
  mul(i2, safe = true) {
    return safe ? new Int64(this.value * i2.value) : new Int64(BigInt.asIntN(64, this.value * i2.value));
  }
  div(i2, safe = true) {
    return safe ? new Int64(this.value / i2.value) : new Int64(BigInt.asIntN(64, this.value / i2.value));
  }
}

class UInt64 {
  static UINT64_MAX = 2n ** 64n - 1n;
  value;
  static toUint64Bigint(v) {
    if (typeof v === "string") {
      const bi2 = BigInt(v);
      return UInt64.toUint64Bigint(bi2);
    }
    if (typeof v === "bigint") {
      if (v > UInt64.UINT64_MAX)
        throw new Error("uint64 overflow");
      else if (v < 0n)
        throw new Error("uint64 underflow");
      return v;
    }
    if (!Number.isFinite(v) || !Number.isInteger(v))
      throw new Error("uint64 requires an integer number");
    const bi = BigInt(v);
    if (bi > UInt64.UINT64_MAX)
      throw new Error("uint64 overflow");
    else if (bi < 0n)
      throw new Error("uint64 underflow");
    return bi;
  }
  constructor(v) {
    this.value = UInt64.toUint64Bigint(v);
  }
  add(i2, safe = true) {
    return safe ? new UInt64(this.value + i2.value) : new UInt64(BigInt.asUintN(64, this.value + i2.value));
  }
  sub(i2, safe = true) {
    return safe ? new UInt64(this.value - i2.value) : new UInt64(BigInt.asUintN(64, this.value - i2.value));
  }
  mul(i2, safe = true) {
    return safe ? new UInt64(this.value * i2.value) : new UInt64(BigInt.asUintN(64, this.value * i2.value));
  }
  div(i2, safe = true) {
    return safe ? new UInt64(this.value / i2.value) : new UInt64(BigInt.asUintN(64, this.value / i2.value));
  }
}

class Decimal {
  coeffecient;
  exponent;
  static parse(s) {
    const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s.trim());
    if (!m || m[2] === "" && (m[3] === undefined || m[3] === ""))
      throw new Error("invalid decimal string");
    const signStr = m[1] ?? "+";
    const intPart = m[2] ?? "0";
    let fracPart = m[3] ?? "";
    while (fracPart.length > 0 && fracPart[fracPart.length - 1] === "0") {
      fracPart = fracPart.slice(0, -1);
    }
    const exponent = fracPart.length === 0 ? 0 : -fracPart.length;
    const digits = intPart + fracPart || "0";
    const coeffecient = BigInt((signStr === "-" ? "-" : "") + digits);
    return new Decimal(coeffecient, exponent);
  }
  constructor(coeffecient, exponent) {
    this.coeffecient = coeffecient;
    this.exponent = exponent;
  }
}

class Value {
  value;
  static from(value) {
    return new Value(value);
  }
  static wrap(value) {
    return new Value(value);
  }
  constructor(value) {
    if (value instanceof Value) {
      this.value = value.value;
    } else if (isValueProto(value)) {
      this.value = value;
    } else {
      this.value = Value.wrapInternal(value);
    }
  }
  proto() {
    return this.value;
  }
  static toUint8Array(input) {
    return input instanceof Uint8Array ? input : new Uint8Array(input);
  }
  static bigintToBytesBE(abs) {
    if (abs === 0n)
      return new Uint8Array;
    let hex = abs.toString(16);
    if (hex.length % 2 === 1)
      hex = "0" + hex;
    const len2 = hex.length / 2;
    const out = new Uint8Array(len2);
    for (let i2 = 0;i2 < len2; i2++) {
      out[i2] = parseInt(hex.slice(i2 * 2, i2 * 2 + 2), 16);
    }
    return out;
  }
  static bigIntToProtoBigInt(v) {
    const sign = v === 0n ? 0n : v < 0n ? -1n : 1n;
    const abs = v < 0n ? -v : v;
    return create(BigIntSchema, {
      absVal: Value.bigintToBytesBE(abs),
      sign
    });
  }
  static toTimestamp(d) {
    const date = d instanceof Date ? d : new Date(d);
    return timestampFromDate(date);
  }
  static isPlainObject(v) {
    return typeof v === "object" && v !== null && v.constructor === Object;
  }
  static isObject(v) {
    return typeof v === "object" && v !== null;
  }
  static wrapInternal(v) {
    if (v === null || v === undefined)
      throw new Error("cannot wrap null/undefined into Value");
    if (v instanceof Value) {
      return v.proto();
    }
    if (v instanceof Uint8Array)
      return create(ValueSchema2, { value: { case: "bytesValue", value: v } });
    if (v instanceof ArrayBuffer)
      return create(ValueSchema2, {
        value: { case: "bytesValue", value: Value.toUint8Array(v) }
      });
    if (v instanceof Date)
      return create(ValueSchema2, {
        value: { case: "timeValue", value: Value.toTimestamp(v) }
      });
    if (v instanceof Int64) {
      return create(ValueSchema2, {
        value: { case: "int64Value", value: v.value }
      });
    }
    if (v instanceof UInt64) {
      return create(ValueSchema2, {
        value: { case: "uint64Value", value: v.value }
      });
    }
    if (v instanceof Decimal) {
      const decimalProto = create(DecimalSchema, {
        coefficient: Value.bigIntToProtoBigInt(v.coeffecient),
        exponent: v.exponent
      });
      return create(ValueSchema2, {
        value: { case: "decimalValue", value: decimalProto }
      });
    }
    switch (typeof v) {
      case "string":
        return create(ValueSchema2, {
          value: { case: "stringValue", value: v }
        });
      case "boolean":
        return create(ValueSchema2, { value: { case: "boolValue", value: v } });
      case "bigint": {
        return create(ValueSchema2, {
          value: { case: "bigintValue", value: Value.bigIntToProtoBigInt(v) }
        });
      }
      case "number": {
        return create(ValueSchema2, {
          value: { case: "float64Value", value: v }
        });
      }
      case "object":
        break;
      default:
        throw new Error(`unsupported type: ${typeof v}`);
    }
    if (Array.isArray(v)) {
      const fields2 = v.map(Value.wrapInternal);
      const list = create(ListSchema, { fields: fields2 });
      return create(ValueSchema2, { value: { case: "listValue", value: list } });
    }
    if (Value.isPlainObject(v)) {
      const fields2 = {};
      for (const [k, vv] of Object.entries(v)) {
        fields2[k] = Value.wrapInternal(vv);
      }
      const map = create(MapSchema, { fields: fields2 });
      return create(ValueSchema2, { value: { case: "mapValue", value: map } });
    }
    if (Value.isObject(v) && v.constructor !== Object) {
      const fields2 = {};
      for (const [k, vv] of Object.entries(v)) {
        fields2[k] = Value.wrapInternal(vv);
      }
      const map = create(MapSchema, { fields: fields2 });
      return create(ValueSchema2, { value: { case: "mapValue", value: map } });
    }
    throw new Error("unsupported object instance");
  }
  unwrap() {
    return unwrap(this.value);
  }
  unwrapToType(options) {
    const unwrapped = this.unwrap();
    if ("instance" in options) {
      if (typeof unwrapped !== typeof options.instance) {
        throw new Error(`Cannot unwrap to type ${typeof options.instance}`);
      }
      return unwrapped;
    }
    if (options.schema) {
      return options.schema.parse(unwrapped);
    }
    const obj = options.factory();
    if (typeof unwrapped === "object" && unwrapped !== null) {
      Object.assign(obj, unwrapped);
    } else {
      throw new Error(`Cannot copy properties from primitive value to object instance. Use a schema instead.`);
    }
    return obj;
  }
}
function unwrap(value) {
  switch (value.value.case) {
    case "stringValue":
      return value.value.value;
    case "boolValue":
      return value.value.value;
    case "bytesValue":
      return value.value.value;
    case "int64Value":
      return new Int64(value.value.value);
    case "uint64Value":
      return new UInt64(value.value.value);
    case "float64Value":
      return value.value.value;
    case "bigintValue": {
      const bigIntValue = value.value.value;
      const absVal = bigIntValue.absVal;
      const sign = bigIntValue.sign;
      let result = 0n;
      for (const byte of absVal) {
        result = result << 8n | BigInt(byte);
      }
      return sign < 0n ? -result : result;
    }
    case "timeValue": {
      return timestampDate(value.value.value);
    }
    case "listValue": {
      const list = value.value.value;
      return list.fields.map(unwrap);
    }
    case "mapValue": {
      const map = value.value.value;
      const result = {};
      for (const [key, val] of Object.entries(map.fields)) {
        result[key] = unwrap(val);
      }
      return result;
    }
    case "decimalValue": {
      const decimal = value.value.value;
      const coefficient = decimal.coefficient;
      const exponent = decimal.exponent;
      if (!coefficient) {
        return new Decimal(0n, 0);
      }
      let coeffBigInt;
      const absVal = coefficient.absVal;
      const sign = coefficient.sign;
      let result = 0n;
      for (const byte of absVal) {
        result = result << 8n | BigInt(byte);
      }
      coeffBigInt = sign < 0n ? -result : result;
      return new Decimal(coeffBigInt, exponent);
    }
    default:
      throw new Error(`Unsupported value type: ${value.value.case}`);
  }
}
function isValueProto(value) {
  return value != null && typeof value.$typeName === "string" && value.$typeName === "values.v1.Value";
}
async function standardValidate(schema, input) {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise)
    result = await result;
  if (result.issues) {
    const errorDetails = JSON.stringify(result.issues, null, 2);
    throw new Error(`Config validation failed. Expectations were not matched:

${errorDetails}`);
  }
  return result.value;
}
var defaultJsonParser = (config) => JSON.parse(Buffer.from(config).toString());
var configHandler = async (request, { configParser, configSchema } = {}) => {
  const config = request.config;
  const parser = configParser || defaultJsonParser;
  let intermediateConfig;
  try {
    intermediateConfig = parser(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse configuration: ${error.message}`);
    } else {
      throw new Error(`Failed to parse configuration: unknown error`);
    }
  }
  return configSchema ? standardValidate(configSchema, intermediateConfig) : intermediateConfig;
};
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});
var util;
(function(util2) {
  util2.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error;
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value2) => {
    if (typeof value2 === "bigint") {
      return value2.toString();
    }
    return value2;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i2 = 0;
          while (i2 < issue.path.length) {
            const el = issue.path[i2];
            const terminal = i2 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i2++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value2) {
    if (!(value2 instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value2}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value2 = await pair.value;
      syncPairs.push({
        key,
        value: value2
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value: value2 } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value2.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value2.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value2.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value2.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value2) => ({ status: "dirty", value: value2 });
var OK = (value2) => ({ status: "valid", value: value2 });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

class ParseInputLazyPath {
  constructor(parent, value2, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value2;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}

class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value2, options) {
    return this._addCheck({
      kind: "includes",
      value: value2,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value2, message) {
    return this._addCheck({
      kind: "startsWith",
      value: value2,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value2, message) {
    return this._addCheck({
      kind: "endsWith",
      value: value2,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len2, message) {
    return this._addCheck({
      kind: "length",
      value: len2,
      ...errorUtil.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}

class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};

class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};

class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};

class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};

class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};

class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};

class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};

class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};

class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};

class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i2) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i2) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len2, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len2, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}

class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value2 = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value2, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {} else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value2 = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath(ctx, value2, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          syncPairs.push({
            key,
            value: value2,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField2 = fieldSchema;
        while (newField2 instanceof ZodOptional) {
          newField2 = newField2._def.innerType;
        }
        newShape[key] = newField2;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};

class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types3, params) => {
  return new ZodUnion({
    options: types3,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value2 of discriminatorValues) {
        if (optionsMap.has(value2)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value2)}`);
        }
        optionsMap.set(value2, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};

class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};

class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}

class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value2], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value2, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          if (key.status === "aborted" || value2.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value2.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value2.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value2 = pair.value;
        if (key.status === "aborted" || value2.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value2.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value2.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};

class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i2) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i2)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size2, message) {
    return this.min(size2, message).max(size2, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};

class ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}

class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};

class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value2, params) => {
  return new ZodLiteral({
    value: value2,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}

class ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum.create = createZodEnum;

class ZodNativeEnum extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};

class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};

class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};

class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};

class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};

class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};

class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};

class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");

class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}

class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var globalHostBindingsSchema = exports_external.object({
  switchModes: exports_external.function().args(exports_external.nativeEnum(Mode)).returns(exports_external.void()),
  log: exports_external.function().args(exports_external.string()).returns(exports_external.void()),
  sendResponse: exports_external.function().args(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()])).returns(exports_external.number()),
  versionV2: exports_external.function().args().returns(exports_external.void()),
  callCapability: exports_external.function().args(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()])).returns(exports_external.number()),
  awaitCapabilities: exports_external.function().args(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()]), exports_external.number()).returns(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()])),
  getSecrets: exports_external.function().args(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()]), exports_external.number()).returns(exports_external.any()),
  awaitSecrets: exports_external.function().args(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()]), exports_external.number()).returns(exports_external.union([exports_external.instanceof(Uint8Array), exports_external.custom()])),
  getWasiArgs: exports_external.function().args().returns(exports_external.string()),
  now: exports_external.function().args().returns(exports_external.number())
});
var validateGlobalHostBindings = () => {
  const globalFunctions = globalThis;
  try {
    return globalHostBindingsSchema.parse(globalFunctions);
  } catch (error) {
    const missingFunctions = Object.keys(globalHostBindingsSchema.shape).filter((key) => !(key in globalFunctions));
    throw new Error(`Missing required global host functions: ${missingFunctions.join(", ")}. ` + `The CRE WASM runtime must provide these functions on globalThis. ` + `This usually means the workflow is being executed outside the CRE WASM environment, ` + `or the host runtime version is incompatible with this SDK version.`);
  }
};
var _hostBindings = null;
var hostBindings = new Proxy({}, {
  get(target, prop) {
    if (!_hostBindings) {
      _hostBindings = validateGlobalHostBindings();
    }
    return _hostBindings[prop];
  }
});

class ConsensusCapability {
  static CAPABILITY_ID = "consensus@1.0.0-alpha";
  static CAPABILITY_NAME = "consensus";
  static CAPABILITY_VERSION = "1.0.0-alpha";
  simple(runtime, input) {
    let payload;
    if (input.$typeName) {
      payload = input;
    } else {
      payload = fromJson(SimpleConsensusInputsSchema, input);
    }
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    const capabilityResponse = runtime.callCapability({
      capabilityId,
      method: "Simple",
      payload,
      inputSchema: SimpleConsensusInputsSchema,
      outputSchema: ValueSchema2
    });
    return {
      result: () => {
        const result = capabilityResponse.result();
        return result;
      }
    };
  }
  report(runtime, input) {
    let payload;
    if (input.$typeName) {
      payload = input;
    } else {
      payload = fromJson(ReportRequestSchema, input);
    }
    const capabilityId = ConsensusCapability.CAPABILITY_ID;
    const capabilityResponse = runtime.callCapability({
      capabilityId,
      method: "Report",
      payload,
      inputSchema: ReportRequestSchema,
      outputSchema: ReportResponseSchema
    });
    return {
      result: () => {
        const result = capabilityResponse.result();
        return new Report(result);
      }
    };
  }
}

class CapabilityError extends Error {
  name;
  capabilityId;
  method;
  callbackId;
  constructor(message, options) {
    super(message);
    this.name = "CapabilityError";
    if (options) {
      this.capabilityId = options.capabilityId;
      this.method = options.method;
      this.callbackId = options.callbackId;
    }
  }
}

class BaseRuntimeImpl {
  config;
  nextCallId;
  helpers;
  maxResponseSize;
  mode;
  modeError;
  constructor(config, nextCallId, helpers, maxResponseSize, mode) {
    this.config = config;
    this.nextCallId = nextCallId;
    this.helpers = helpers;
    this.maxResponseSize = maxResponseSize;
    this.mode = mode;
  }
  callCapability({ capabilityId, method, payload, inputSchema, outputSchema }) {
    if (this.modeError) {
      return {
        result: () => {
          throw this.modeError;
        }
      };
    }
    const callbackId = this.allocateCallbackId();
    const anyPayload = anyPack(inputSchema, payload);
    const req = create(CapabilityRequestSchema, {
      id: capabilityId,
      method,
      payload: anyPayload,
      callbackId
    });
    if (!this.helpers.call(req)) {
      return {
        result: () => {
          throw new CapabilityError(`Capability '${capabilityId}' not found: the host rejected the call to method '${method}'. Verify the capability ID is correct and the capability is available in this CRE environment`, {
            callbackId,
            method,
            capabilityId
          });
        }
      };
    }
    return {
      result: () => this.awaitAndUnwrapCapabilityResponse(callbackId, capabilityId, method, outputSchema)
    };
  }
  allocateCallbackId() {
    const callbackId = this.nextCallId;
    if (this.mode === Mode.DON) {
      this.nextCallId++;
    } else {
      this.nextCallId--;
    }
    return callbackId;
  }
  awaitAndUnwrapCapabilityResponse(callbackId, capabilityId, method, outputSchema) {
    const awaitRequest = create(AwaitCapabilitiesRequestSchema, {
      ids: [callbackId]
    });
    const awaitResponse = this.helpers.await(awaitRequest, this.maxResponseSize);
    const capabilityResponse = awaitResponse.responses[callbackId];
    if (!capabilityResponse) {
      throw new CapabilityError(`No response found for capability '${capabilityId}' method '${method}' (callback ID ${callbackId}): the host returned a response map that does not contain an entry for this call`, {
        capabilityId,
        method,
        callbackId
      });
    }
    const response = capabilityResponse.response;
    switch (response.case) {
      case "payload": {
        try {
          return anyUnpack(response.value, outputSchema);
        } catch {
          throw new CapabilityError(`Failed to deserialize response payload for capability '${capabilityId}' method '${method}': the response could not be unpacked into the expected output schema`, {
            capabilityId,
            method,
            callbackId
          });
        }
      }
      case "error":
        throw new CapabilityError(`Capability '${capabilityId}' method '${method}' returned an error: ${response.value}`, {
          capabilityId,
          method,
          callbackId
        });
      default:
        throw new CapabilityError(`Unexpected response type '${response.case}' for capability '${capabilityId}' method '${method}': expected 'payload' or 'error'`, {
          capabilityId,
          method,
          callbackId
        });
    }
  }
  getNextCallId() {
    return this.nextCallId;
  }
  now() {
    return new Date(this.helpers.now());
  }
  log(message) {
    this.helpers.log(message);
  }
}

class NodeRuntimeImpl extends BaseRuntimeImpl {
  _isNodeRuntime = true;
  constructor(config, nextCallId, helpers, maxResponseSize) {
    helpers.switchModes(Mode.NODE);
    super(config, nextCallId, helpers, maxResponseSize, Mode.NODE);
  }
}

class RuntimeImpl extends BaseRuntimeImpl {
  nextNodeCallId = -1;
  constructor(config, nextCallId, helpers, maxResponseSize) {
    helpers.switchModes(Mode.DON);
    super(config, nextCallId, helpers, maxResponseSize, Mode.DON);
  }
  runInNodeMode(fn, consensusAggregation, unwrapOptions) {
    return (...args) => {
      this.modeError = new DonModeError;
      const nodeRuntime = new NodeRuntimeImpl(this.config, this.nextNodeCallId, this.helpers, this.maxResponseSize);
      const consensusInput = this.prepareConsensusInput(consensusAggregation);
      try {
        const observation = fn(nodeRuntime, ...args);
        this.captureObservation(consensusInput, observation, consensusAggregation.descriptor);
      } catch (e) {
        this.captureError(consensusInput, e);
      } finally {
        this.restoreDonMode(nodeRuntime);
      }
      return this.runConsensusAndWrap(consensusInput, unwrapOptions);
    };
  }
  prepareConsensusInput(consensusAggregation) {
    const consensusInput = create(SimpleConsensusInputsSchema, {
      descriptors: consensusAggregation.descriptor
    });
    if (consensusAggregation.defaultValue) {
      const defaultValue = Value.from(consensusAggregation.defaultValue).proto();
      clearIgnoredFields(defaultValue, consensusAggregation.descriptor);
      consensusInput.default = defaultValue;
    }
    return consensusInput;
  }
  captureObservation(consensusInput, observation, descriptor) {
    const observationValue = Value.from(observation).proto();
    clearIgnoredFields(observationValue, descriptor);
    consensusInput.observation = {
      case: "value",
      value: observationValue
    };
  }
  captureError(consensusInput, e) {
    consensusInput.observation = {
      case: "error",
      value: e instanceof Error && e.message || String(e)
    };
  }
  restoreDonMode(nodeRuntime) {
    this.modeError = undefined;
    this.nextNodeCallId = nodeRuntime.nextCallId;
    nodeRuntime.modeError = new NodeModeError;
    this.helpers.switchModes(Mode.DON);
  }
  runConsensusAndWrap(consensusInput, unwrapOptions) {
    const consensus = new ConsensusCapability;
    const call = consensus.simple(this, consensusInput);
    return {
      result: () => {
        const result = call.result();
        const wrappedValue = Value.wrap(result);
        return unwrapOptions ? wrappedValue.unwrapToType(unwrapOptions) : wrappedValue.unwrap();
      }
    };
  }
  getSecret(request) {
    if (this.modeError) {
      return {
        result: () => {
          throw this.modeError;
        }
      };
    }
    const secretRequest = request.$typeName ? request : create(SecretRequestSchema, request);
    const id = this.nextCallId;
    this.nextCallId++;
    const secretsReq = create(GetSecretsRequestSchema, {
      callbackId: id,
      requests: [secretRequest]
    });
    if (!this.helpers.getSecrets(secretsReq, this.maxResponseSize)) {
      return {
        result: () => {
          throw new SecretsError(secretRequest, "host is not making the secrets request");
        }
      };
    }
    return {
      result: () => this.awaitAndUnwrapSecret(id, secretRequest)
    };
  }
  awaitAndUnwrapSecret(id, secretRequest) {
    const awaitRequest = create(AwaitSecretsRequestSchema, { ids: [id] });
    const awaitResponse = this.helpers.awaitSecrets(awaitRequest, this.maxResponseSize);
    const secretsResponse = awaitResponse.responses[id];
    if (!secretsResponse) {
      throw new SecretsError(secretRequest, "no response");
    }
    const responses = secretsResponse.responses;
    if (responses.length !== 1) {
      throw new SecretsError(secretRequest, "invalid value returned from host");
    }
    const response = responses[0].response;
    switch (response.case) {
      case "secret":
        return response.value;
      case "error":
        throw new SecretsError(secretRequest, response.value.error);
      default:
        throw new SecretsError(secretRequest, "cannot unmarshal returned value from host");
    }
  }
  report(input) {
    const consensus = new ConsensusCapability;
    const call = consensus.report(this, input);
    return {
      result: () => call.result()
    };
  }
}
function clearIgnoredFields(value2, descriptor) {
  if (!descriptor || !value2) {
    return;
  }
  const fieldsMap = descriptor.descriptor?.case === "fieldsMap" ? descriptor.descriptor.value : undefined;
  if (!fieldsMap) {
    return;
  }
  if (value2.value?.case === "mapValue") {
    const mapValue = value2.value.value;
    if (!mapValue || !mapValue.fields) {
      return;
    }
    for (const [key, val] of Object.entries(mapValue.fields)) {
      const nestedDescriptor = fieldsMap.fields[key];
      if (!nestedDescriptor) {
        delete mapValue.fields[key];
        continue;
      }
      const nestedFieldsMap = nestedDescriptor.descriptor?.case === "fieldsMap" ? nestedDescriptor.descriptor.value : undefined;
      if (nestedFieldsMap && val.value?.case === "mapValue") {
        clearIgnoredFields(val, nestedDescriptor);
      }
    }
  }
}

class Runtime extends RuntimeImpl {
  constructor(config, nextCallId, maxResponseSize) {
    super(config, nextCallId, WasmRuntimeHelpers.getInstance(), maxResponseSize);
  }
}
function toI32ResponseSize(maxResponseSize) {
  if (maxResponseSize > 2147483647n || maxResponseSize < -2147483648n) {
    throw new Error(`maxResponseSize ${maxResponseSize} exceeds i32 range. Expected a value between -2147483648 and 2147483647`);
  }
  return Math.trunc(Number(maxResponseSize));
}

class WasmRuntimeHelpers {
  static instance;
  constructor() {}
  now() {
    return hostBindings.now();
  }
  static getInstance() {
    if (!WasmRuntimeHelpers.instance) {
      WasmRuntimeHelpers.instance = new WasmRuntimeHelpers;
    }
    return WasmRuntimeHelpers.instance;
  }
  call(request) {
    return hostBindings.callCapability(toBinary(CapabilityRequestSchema, request)) >= 0;
  }
  await(request, maxResponseSize) {
    const responseSize = toI32ResponseSize(maxResponseSize);
    const response = hostBindings.awaitCapabilities(toBinary(AwaitCapabilitiesRequestSchema, request), responseSize);
    const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response;
    return fromBinary(AwaitCapabilitiesResponseSchema, responseBytes);
  }
  getSecrets(request, maxResponseSize) {
    const responseSize = toI32ResponseSize(maxResponseSize);
    return hostBindings.getSecrets(toBinary(GetSecretsRequestSchema, request), responseSize) >= 0;
  }
  awaitSecrets(request, maxResponseSize) {
    const responseSize = toI32ResponseSize(maxResponseSize);
    const response = hostBindings.awaitSecrets(toBinary(AwaitSecretsRequestSchema, request), responseSize);
    const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response;
    return fromBinary(AwaitSecretsResponseSchema, responseBytes);
  }
  switchModes(mode) {
    hostBindings.switchModes(mode);
  }
  log(message) {
    hostBindings.log(message);
  }
}

class Runner {
  config;
  request;
  constructor(config, request) {
    this.config = config;
    this.request = request;
  }
  static async newRunner(configHandlerParams) {
    hostBindings.versionV2();
    const request = Runner.getRequest();
    const config = await configHandler(request, configHandlerParams);
    return new Runner(config, request);
  }
  static getRequest() {
    const argsString = hostBindings.getWasiArgs();
    let args;
    try {
      args = JSON.parse(argsString);
    } catch (e) {
      throw new Error("Invalid request: could not parse WASI arguments as JSON. Ensure the WASM runtime is passing valid arguments to the workflow");
    }
    if (args.length !== 2) {
      throw new Error(`Invalid request: expected exactly 2 WASI arguments (script name and base64-encoded request payload), but received ${args.length}`);
    }
    const base64Request = args[1];
    const bytes = Buffer.from(base64Request, "base64");
    return fromBinary(ExecuteRequestSchema, bytes);
  }
  async run(initFn) {
    const runtime = new Runtime(this.config, 0, this.request.maxResponseSize);
    let result;
    try {
      const workflow = await initFn(this.config, {
        getSecret: runtime.getSecret.bind(runtime)
      });
      switch (this.request.request.case) {
        case "subscribe":
          result = this.handleSubscribePhase(this.request, workflow);
          break;
        case "trigger":
          result = this.handleExecutionPhase(this.request, workflow, runtime);
          break;
        default:
          throw new Error(`Unknown request type '${this.request.request.case}': expected 'subscribe' or 'trigger'. This may indicate a version mismatch between the SDK and the CRE runtime`);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      result = create(ExecutionResultSchema, {
        result: { case: "error", value: err }
      });
    }
    const awaitedResult = await result;
    hostBindings.sendResponse(toBinary(ExecutionResultSchema, awaitedResult));
  }
  async handleExecutionPhase(req, workflow, runtime) {
    if (req.request.case !== "trigger") {
      throw new Error(`cannot handle non-trigger request as a trigger: received request type '${req.request.case}' in handleExecutionPhase. This is an internal SDK error`);
    }
    const triggerMsg = req.request.value;
    const id = BigInt(triggerMsg.id);
    if (id > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`Trigger ID ${id} exceeds JavaScript safe integer range (Number.MAX_SAFE_INTEGER = ${Number.MAX_SAFE_INTEGER}). This trigger ID cannot be safely represented as a number`);
    }
    const index = Number(triggerMsg.id);
    if (Number.isFinite(index) && index >= 0 && index < workflow.length) {
      const entry = workflow[index];
      const schema = entry.trigger.outputSchema();
      if (!triggerMsg.payload) {
        return create(ExecutionResultSchema, {
          result: {
            case: "error",
            value: `trigger payload is missing for handler at index ${index} (trigger ID ${triggerMsg.id}). The trigger event must include a payload`
          }
        });
      }
      const payloadAny = triggerMsg.payload;
      const decoded = fromBinary(schema, payloadAny.value);
      const adapted = entry.trigger.adapt(decoded);
      try {
        const result = await entry.fn(runtime, adapted);
        const wrapped = Value.wrap(result);
        return create(ExecutionResultSchema, {
          result: { case: "value", value: wrapped.proto() }
        });
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        return create(ExecutionResultSchema, {
          result: { case: "error", value: err }
        });
      }
    }
    return create(ExecutionResultSchema, {
      result: {
        case: "error",
        value: `trigger not found: no workflow handler registered at index ${index} (trigger ID ${triggerMsg.id}). The workflow has ${workflow.length} handler(s) registered. Verify the trigger subscription matches a registered handler`
      }
    });
  }
  handleSubscribePhase(req, workflow) {
    if (req.request.case !== "subscribe") {
      return create(ExecutionResultSchema, {
        result: {
          case: "error",
          value: `subscribe request expected but received '${req.request.case}' in handleSubscribePhase. This is an internal SDK error`
        }
      });
    }
    const subscriptions = workflow.map((entry) => ({
      id: entry.trigger.capabilityId(),
      method: entry.trigger.method(),
      payload: entry.trigger.configAsAny()
    }));
    const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
      subscriptions
    });
    return create(ExecutionResultSchema, {
      result: { case: "triggerSubscriptions", value: subscriptionRequest }
    });
  }
}
var prepareErrorResponse = (error) => {
  let errorMessage = null;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = String(error) || null;
  }
  if (typeof errorMessage !== "string") {
    return null;
  }
  const result = create(ExecutionResultSchema, {
    result: { case: "error", value: errorMessage }
  });
  return toBinary(ExecutionResultSchema, result);
};
var sendErrorResponse = (error) => {
  const payload = prepareErrorResponse(error);
  if (payload === null) {
    console.error("Failed to serialize error response: the error could not be converted to a string. Original error:", error);
    const fallback = prepareErrorResponse("Unknown error: the original error could not be serialized");
    if (fallback !== null) {
      hostBindings.sendResponse(fallback);
    }
    return;
  }
  hostBindings.sendResponse(payload);
};
var exports_external2 = {};
__export(exports_external2, {
  void: () => voidType2,
  util: () => util3,
  unknown: () => unknownType2,
  union: () => unionType2,
  undefined: () => undefinedType2,
  tuple: () => tupleType2,
  transformer: () => effectsType2,
  symbol: () => symbolType2,
  string: () => stringType2,
  strictObject: () => strictObjectType2,
  setErrorMap: () => setErrorMap2,
  set: () => setType2,
  record: () => recordType2,
  quotelessJson: () => quotelessJson2,
  promise: () => promiseType2,
  preprocess: () => preprocessType2,
  pipeline: () => pipelineType2,
  ostring: () => ostring2,
  optional: () => optionalType2,
  onumber: () => onumber2,
  oboolean: () => oboolean2,
  objectUtil: () => objectUtil2,
  object: () => objectType2,
  number: () => numberType2,
  nullable: () => nullableType2,
  null: () => nullType2,
  never: () => neverType2,
  nativeEnum: () => nativeEnumType2,
  nan: () => nanType2,
  map: () => mapType2,
  makeIssue: () => makeIssue2,
  literal: () => literalType2,
  lazy: () => lazyType2,
  late: () => late2,
  isValid: () => isValid2,
  isDirty: () => isDirty2,
  isAsync: () => isAsync2,
  isAborted: () => isAborted2,
  intersection: () => intersectionType2,
  instanceof: () => instanceOfType2,
  getParsedType: () => getParsedType2,
  getErrorMap: () => getErrorMap2,
  function: () => functionType2,
  enum: () => enumType2,
  effect: () => effectsType2,
  discriminatedUnion: () => discriminatedUnionType2,
  defaultErrorMap: () => en_default2,
  datetimeRegex: () => datetimeRegex2,
  date: () => dateType2,
  custom: () => custom2,
  coerce: () => coerce2,
  boolean: () => booleanType2,
  bigint: () => bigIntType2,
  array: () => arrayType2,
  any: () => anyType2,
  addIssueToContext: () => addIssueToContext2,
  ZodVoid: () => ZodVoid2,
  ZodUnknown: () => ZodUnknown2,
  ZodUnion: () => ZodUnion2,
  ZodUndefined: () => ZodUndefined2,
  ZodType: () => ZodType2,
  ZodTuple: () => ZodTuple2,
  ZodTransformer: () => ZodEffects2,
  ZodSymbol: () => ZodSymbol2,
  ZodString: () => ZodString2,
  ZodSet: () => ZodSet2,
  ZodSchema: () => ZodType2,
  ZodRecord: () => ZodRecord2,
  ZodReadonly: () => ZodReadonly2,
  ZodPromise: () => ZodPromise2,
  ZodPipeline: () => ZodPipeline2,
  ZodParsedType: () => ZodParsedType2,
  ZodOptional: () => ZodOptional2,
  ZodObject: () => ZodObject2,
  ZodNumber: () => ZodNumber2,
  ZodNullable: () => ZodNullable2,
  ZodNull: () => ZodNull2,
  ZodNever: () => ZodNever2,
  ZodNativeEnum: () => ZodNativeEnum2,
  ZodNaN: () => ZodNaN2,
  ZodMap: () => ZodMap2,
  ZodLiteral: () => ZodLiteral2,
  ZodLazy: () => ZodLazy2,
  ZodIssueCode: () => ZodIssueCode2,
  ZodIntersection: () => ZodIntersection2,
  ZodFunction: () => ZodFunction2,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind2,
  ZodError: () => ZodError3,
  ZodEnum: () => ZodEnum2,
  ZodEffects: () => ZodEffects2,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion2,
  ZodDefault: () => ZodDefault2,
  ZodDate: () => ZodDate2,
  ZodCatch: () => ZodCatch2,
  ZodBranded: () => ZodBranded2,
  ZodBoolean: () => ZodBoolean2,
  ZodBigInt: () => ZodBigInt2,
  ZodArray: () => ZodArray2,
  ZodAny: () => ZodAny2,
  Schema: () => ZodType2,
  ParseStatus: () => ParseStatus2,
  OK: () => OK2,
  NEVER: () => NEVER2,
  INVALID: () => INVALID2,
  EMPTY_PATH: () => EMPTY_PATH2,
  DIRTY: () => DIRTY2,
  BRAND: () => BRAND2
});
var util3;
(function(util4) {
  util4.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util4.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error;
  }
  util4.assertNever = assertNever;
  util4.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util4.getValidEnumValues = (obj) => {
    const validKeys = util4.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util4.objectValues(filtered);
  };
  util4.objectValues = (obj) => {
    return util4.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util4.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util4.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util4.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util4.joinValues = joinValues;
  util4.jsonStringifyReplacer = (_, value2) => {
    if (typeof value2 === "bigint") {
      return value2.toString();
    }
    return value2;
  };
})(util3 || (util3 = {}));
var objectUtil2;
(function(objectUtil3) {
  objectUtil3.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil2 || (objectUtil2 = {}));
var ZodParsedType2 = util3.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType2 = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType2.undefined;
    case "string":
      return ZodParsedType2.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType2.nan : ZodParsedType2.number;
    case "boolean":
      return ZodParsedType2.boolean;
    case "function":
      return ZodParsedType2.function;
    case "bigint":
      return ZodParsedType2.bigint;
    case "symbol":
      return ZodParsedType2.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType2.array;
      }
      if (data === null) {
        return ZodParsedType2.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType2.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType2.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType2.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType2.date;
      }
      return ZodParsedType2.object;
    default:
      return ZodParsedType2.unknown;
  }
};
var ZodIssueCode2 = util3.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson2 = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError3 extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i2 = 0;
          while (i2 < issue.path.length) {
            const el = issue.path[i2];
            const terminal = i2 === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i2++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value2) {
    if (!(value2 instanceof ZodError3)) {
      throw new Error(`Not a ZodError: ${value2}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util3.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError3.create = (issues) => {
  const error = new ZodError3(issues);
  return error;
};
var errorMap2 = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode2.invalid_type:
      if (issue.received === ZodParsedType2.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode2.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util3.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode2.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util3.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode2.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode2.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util3.joinValues(issue.options)}`;
      break;
    case ZodIssueCode2.invalid_enum_value:
      message = `Invalid enum value. Expected ${util3.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode2.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode2.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode2.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode2.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util3.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode2.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode2.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode2.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode2.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode2.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode2.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util3.assertNever(issue);
  }
  return { message };
};
var en_default2 = errorMap2;
var overrideErrorMap2 = en_default2;
function setErrorMap2(map) {
  overrideErrorMap2 = map;
}
function getErrorMap2() {
  return overrideErrorMap2;
}
var makeIssue2 = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH2 = [];
function addIssueToContext2(ctx, issueData) {
  const overrideMap = getErrorMap2();
  const issue = makeIssue2({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default2 ? undefined : en_default2
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus2 {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID2;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value2 = await pair.value;
      syncPairs.push({
        key,
        value: value2
      });
    }
    return ParseStatus2.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value: value2 } = pair;
      if (key.status === "aborted")
        return INVALID2;
      if (value2.status === "aborted")
        return INVALID2;
      if (key.status === "dirty")
        status.dirty();
      if (value2.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value2.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value2.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID2 = Object.freeze({
  status: "aborted"
});
var DIRTY2 = (value2) => ({ status: "dirty", value: value2 });
var OK2 = (value2) => ({ status: "valid", value: value2 });
var isAborted2 = (x) => x.status === "aborted";
var isDirty2 = (x) => x.status === "dirty";
var isValid2 = (x) => x.status === "valid";
var isAsync2 = (x) => typeof Promise !== "undefined" && x instanceof Promise;
var errorUtil2;
(function(errorUtil3) {
  errorUtil3.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil3.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil2 || (errorUtil2 = {}));

class ParseInputLazyPath2 {
  constructor(parent, value2, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value2;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult2 = (ctx, result) => {
  if (isValid2(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError3(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams2(params) {
  if (!params)
    return {};
  const { errorMap: errorMap3, invalid_type_error, required_error, description } = params;
  if (errorMap3 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap3)
    return { errorMap: errorMap3, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType2 {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType2(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType2(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus2,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType2(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync2(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult2(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid2(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid2(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync2(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult2(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode2.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects2({
      schema: this,
      typeName: ZodFirstPartyTypeKind2.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional2.create(this, this._def);
  }
  nullable() {
    return ZodNullable2.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray2.create(this);
  }
  promise() {
    return ZodPromise2.create(this, this._def);
  }
  or(option) {
    return ZodUnion2.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection2.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects2({
      ...processCreateParams2(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind2.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault2({
      ...processCreateParams2(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind2.ZodDefault
    });
  }
  brand() {
    return new ZodBranded2({
      typeName: ZodFirstPartyTypeKind2.ZodBranded,
      type: this,
      ...processCreateParams2(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch2({
      ...processCreateParams2(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind2.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline2.create(this, target);
  }
  readonly() {
    return ZodReadonly2.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex2 = /^c[^\s-]{8,}$/i;
var cuid2Regex2 = /^[0-9a-z]+$/;
var ulidRegex2 = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex2 = /^[a-z0-9_-]{21}$/i;
var jwtRegex2 = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex2 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex2;
var ipv4Regex2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex2 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex2 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex2 = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource2 = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex2 = new RegExp(`^${dateRegexSource2}$`);
function timeRegexSource2(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex2(args) {
  return new RegExp(`^${timeRegexSource2(args)}$`);
}
function datetimeRegex2(args) {
  let regex = `${dateRegexSource2}T${timeRegexSource2(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP2(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4Regex2.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6Regex2.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT2(jwt, alg) {
  if (!jwtRegex2.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr2(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4CidrRegex2.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6CidrRegex2.test(ip)) {
    return true;
  }
  return false;
}

class ZodString2 extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext2(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.string,
        received: ctx2.parsedType
      });
      return INVALID2;
    }
    const status = new ParseStatus2;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext2(ctx, {
              code: ZodIssueCode2.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext2(ctx, {
              code: ZodIssueCode2.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "email",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex2) {
          emojiRegex2 = new RegExp(_emojiRegex2, "u");
        }
        if (!emojiRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "emoji",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "uuid",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "nanoid",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "cuid",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "cuid2",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "ulid",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "url",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "regex",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex2(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex2;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex2(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "duration",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP2(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "ip",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT2(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "jwt",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr2(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "cidr",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "base64",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex2.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            validation: "base64url",
            code: ZodIssueCode2.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util3.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode2.invalid_string,
      ...errorUtil2.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString2({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil2.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil2.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil2.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil2.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil2.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil2.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil2.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil2.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil2.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil2.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil2.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil2.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil2.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil2.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil2.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil2.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil2.errToObj(message)
    });
  }
  includes(value2, options) {
    return this._addCheck({
      kind: "includes",
      value: value2,
      position: options?.position,
      ...errorUtil2.errToObj(options?.message)
    });
  }
  startsWith(value2, message) {
    return this._addCheck({
      kind: "startsWith",
      value: value2,
      ...errorUtil2.errToObj(message)
    });
  }
  endsWith(value2, message) {
    return this._addCheck({
      kind: "endsWith",
      value: value2,
      ...errorUtil2.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil2.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil2.errToObj(message)
    });
  }
  length(len2, message) {
    return this._addCheck({
      kind: "length",
      value: len2,
      ...errorUtil2.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil2.errToObj(message));
  }
  trim() {
    return new ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString2.create = (params) => {
  return new ZodString2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams2(params)
  });
};
function floatSafeRemainder2(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}

class ZodNumber2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext2(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.number,
        received: ctx2.parsedType
      });
      return INVALID2;
    }
    let ctx = undefined;
    const status = new ParseStatus2;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util3.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder2(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util3.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil2.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil2.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil2.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil2.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new ZodNumber2({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil2.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber2({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil2.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil2.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil2.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil2.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil2.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil2.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil2.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil2.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil2.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util3.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber2.create = (params) => {
  return new ZodNumber2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams2(params)
  });
};

class ZodBigInt2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus2;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util3.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext2(ctx, {
      code: ZodIssueCode2.invalid_type,
      expected: ZodParsedType2.bigint,
      received: ctx.parsedType
    });
    return INVALID2;
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil2.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil2.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil2.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil2.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new ZodBigInt2({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil2.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt2({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil2.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil2.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil2.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil2.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil2.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt2.create = (params) => {
  return new ZodBigInt2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams2(params)
  });
};

class ZodBoolean2 extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.boolean,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
}
ZodBoolean2.create = (params) => {
  return new ZodBoolean2({
    typeName: ZodFirstPartyTypeKind2.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams2(params)
  });
};

class ZodDate2 extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext2(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.date,
        received: ctx2.parsedType
      });
      return INVALID2;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext2(ctx2, {
        code: ZodIssueCode2.invalid_date
      });
      return INVALID2;
    }
    const status = new ParseStatus2;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util3.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate2({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil2.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil2.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate2.create = (params) => {
  return new ZodDate2({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind2.ZodDate,
    ...processCreateParams2(params)
  });
};

class ZodSymbol2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.symbol,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
}
ZodSymbol2.create = (params) => {
  return new ZodSymbol2({
    typeName: ZodFirstPartyTypeKind2.ZodSymbol,
    ...processCreateParams2(params)
  });
};

class ZodUndefined2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.undefined,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
}
ZodUndefined2.create = (params) => {
  return new ZodUndefined2({
    typeName: ZodFirstPartyTypeKind2.ZodUndefined,
    ...processCreateParams2(params)
  });
};

class ZodNull2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.null,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
}
ZodNull2.create = (params) => {
  return new ZodNull2({
    typeName: ZodFirstPartyTypeKind2.ZodNull,
    ...processCreateParams2(params)
  });
};

class ZodAny2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK2(input.data);
  }
}
ZodAny2.create = (params) => {
  return new ZodAny2({
    typeName: ZodFirstPartyTypeKind2.ZodAny,
    ...processCreateParams2(params)
  });
};

class ZodUnknown2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK2(input.data);
  }
}
ZodUnknown2.create = (params) => {
  return new ZodUnknown2({
    typeName: ZodFirstPartyTypeKind2.ZodUnknown,
    ...processCreateParams2(params)
  });
};

class ZodNever2 extends ZodType2 {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext2(ctx, {
      code: ZodIssueCode2.invalid_type,
      expected: ZodParsedType2.never,
      received: ctx.parsedType
    });
    return INVALID2;
  }
}
ZodNever2.create = (params) => {
  return new ZodNever2({
    typeName: ZodFirstPartyTypeKind2.ZodNever,
    ...processCreateParams2(params)
  });
};

class ZodVoid2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.void,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
}
ZodVoid2.create = (params) => {
  return new ZodVoid2({
    typeName: ZodFirstPartyTypeKind2.ZodVoid,
    ...processCreateParams2(params)
  });
};

class ZodArray2 extends ZodType2 {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType2.array) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.array,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext2(ctx, {
          code: tooBig ? ZodIssueCode2.too_big : ZodIssueCode2.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext2(ctx, {
          code: ZodIssueCode2.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext2(ctx, {
          code: ZodIssueCode2.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i2) => {
        return def.type._parseAsync(new ParseInputLazyPath2(ctx, item, ctx.path, i2));
      })).then((result2) => {
        return ParseStatus2.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i2) => {
      return def.type._parseSync(new ParseInputLazyPath2(ctx, item, ctx.path, i2));
    });
    return ParseStatus2.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray2({
      ...this._def,
      minLength: { value: minLength, message: errorUtil2.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray2({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil2.toString(message) }
    });
  }
  length(len2, message) {
    return new ZodArray2({
      ...this._def,
      exactLength: { value: len2, message: errorUtil2.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray2.create = (schema, params) => {
  return new ZodArray2({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind2.ZodArray,
    ...processCreateParams2(params)
  });
};
function deepPartialify2(schema) {
  if (schema instanceof ZodObject2) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional2.create(deepPartialify2(fieldSchema));
    }
    return new ZodObject2({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray2) {
    return new ZodArray2({
      ...schema._def,
      type: deepPartialify2(schema.element)
    });
  } else if (schema instanceof ZodOptional2) {
    return ZodOptional2.create(deepPartialify2(schema.unwrap()));
  } else if (schema instanceof ZodNullable2) {
    return ZodNullable2.create(deepPartialify2(schema.unwrap()));
  } else if (schema instanceof ZodTuple2) {
    return ZodTuple2.create(schema.items.map((item) => deepPartialify2(item)));
  } else {
    return schema;
  }
}

class ZodObject2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util3.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext2(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.object,
        received: ctx2.parsedType
      });
      return INVALID2;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever2 && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value2 = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath2(ctx, value2, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever2) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext2(ctx, {
            code: ZodIssueCode2.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {} else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value2 = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath2(ctx, value2, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          syncPairs.push({
            key,
            value: value2,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus2.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus2.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil2.errToObj;
    return new ZodObject2({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil2.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject2({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject2({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject2({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject2({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind2.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject2({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util3.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject2({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util3.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject2({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify2(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util3.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject2({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util3.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField2 = fieldSchema;
        while (newField2 instanceof ZodOptional2) {
          newField2 = newField2._def.innerType;
        }
        newShape[key] = newField2;
      }
    }
    return new ZodObject2({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum2(util3.objectKeys(this.shape));
  }
}
ZodObject2.create = (shape, params) => {
  return new ZodObject2({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams2(params)
  });
};
ZodObject2.strictCreate = (shape, params) => {
  return new ZodObject2({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams2(params)
  });
};
ZodObject2.lazycreate = (shape, params) => {
  return new ZodObject2({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams2(params)
  });
};

class ZodUnion2 extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError3(result.ctx.common.issues));
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_union,
        unionErrors
      });
      return INVALID2;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError3(issues2));
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_union,
        unionErrors
      });
      return INVALID2;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion2.create = (types4, params) => {
  return new ZodUnion2({
    options: types4,
    typeName: ZodFirstPartyTypeKind2.ZodUnion,
    ...processCreateParams2(params)
  });
};
var getDiscriminator2 = (type) => {
  if (type instanceof ZodLazy2) {
    return getDiscriminator2(type.schema);
  } else if (type instanceof ZodEffects2) {
    return getDiscriminator2(type.innerType());
  } else if (type instanceof ZodLiteral2) {
    return [type.value];
  } else if (type instanceof ZodEnum2) {
    return type.options;
  } else if (type instanceof ZodNativeEnum2) {
    return util3.objectValues(type.enum);
  } else if (type instanceof ZodDefault2) {
    return getDiscriminator2(type._def.innerType);
  } else if (type instanceof ZodUndefined2) {
    return [undefined];
  } else if (type instanceof ZodNull2) {
    return [null];
  } else if (type instanceof ZodOptional2) {
    return [undefined, ...getDiscriminator2(type.unwrap())];
  } else if (type instanceof ZodNullable2) {
    return [null, ...getDiscriminator2(type.unwrap())];
  } else if (type instanceof ZodBranded2) {
    return getDiscriminator2(type.unwrap());
  } else if (type instanceof ZodReadonly2) {
    return getDiscriminator2(type.unwrap());
  } else if (type instanceof ZodCatch2) {
    return getDiscriminator2(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion2 extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.object) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.object,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID2;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator2(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value2 of discriminatorValues) {
        if (optionsMap.has(value2)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value2)}`);
        }
        optionsMap.set(value2, type);
      }
    }
    return new ZodDiscriminatedUnion2({
      typeName: ZodFirstPartyTypeKind2.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams2(params)
    });
  }
}
function mergeValues2(a, b) {
  const aType = getParsedType2(a);
  const bType = getParsedType2(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType2.object && bType === ZodParsedType2.object) {
    const bKeys = util3.objectKeys(b);
    const sharedKeys = util3.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues2(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType2.array && bType === ZodParsedType2.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues2(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType2.date && bType === ZodParsedType2.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection2 extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted2(parsedLeft) || isAborted2(parsedRight)) {
        return INVALID2;
      }
      const merged = mergeValues2(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext2(ctx, {
          code: ZodIssueCode2.invalid_intersection_types
        });
        return INVALID2;
      }
      if (isDirty2(parsedLeft) || isDirty2(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection2.create = (left, right, params) => {
  return new ZodIntersection2({
    left,
    right,
    typeName: ZodFirstPartyTypeKind2.ZodIntersection,
    ...processCreateParams2(params)
  });
};

class ZodTuple2 extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.array) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.array,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID2;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath2(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus2.mergeArray(status, results);
      });
    } else {
      return ParseStatus2.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple2({
      ...this._def,
      rest
    });
  }
}
ZodTuple2.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple2({
    items: schemas,
    typeName: ZodFirstPartyTypeKind2.ZodTuple,
    rest: null,
    ...processCreateParams2(params)
  });
};

class ZodRecord2 extends ZodType2 {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.object) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.object,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath2(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath2(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus2.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus2.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType2) {
      return new ZodRecord2({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind2.ZodRecord,
        ...processCreateParams2(third)
      });
    }
    return new ZodRecord2({
      keyType: ZodString2.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind2.ZodRecord,
      ...processCreateParams2(second)
    });
  }
}

class ZodMap2 extends ZodType2 {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.map) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.map,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value2], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath2(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath2(ctx, value2, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          if (key.status === "aborted" || value2.status === "aborted") {
            return INVALID2;
          }
          if (key.status === "dirty" || value2.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value2.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value2 = pair.value;
        if (key.status === "aborted" || value2.status === "aborted") {
          return INVALID2;
        }
        if (key.status === "dirty" || value2.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value2.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap2.create = (keyType, valueType, params) => {
  return new ZodMap2({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind2.ZodMap,
    ...processCreateParams2(params)
  });
};

class ZodSet2 extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.set) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.set,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext2(ctx, {
          code: ZodIssueCode2.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext2(ctx, {
          code: ZodIssueCode2.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID2;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i2) => valueType._parse(new ParseInputLazyPath2(ctx, item, ctx.path, i2)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet2({
      ...this._def,
      minSize: { value: minSize, message: errorUtil2.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet2({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil2.toString(message) }
    });
  }
  size(size2, message) {
    return this.min(size2, message).max(size2, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet2.create = (valueType, params) => {
  return new ZodSet2({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind2.ZodSet,
    ...processCreateParams2(params)
  });
};

class ZodFunction2 extends ZodType2 {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.function) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.function,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    function makeArgsIssue(args, error) {
      return makeIssue2({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap2(), en_default2].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode2.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue2({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap2(), en_default2].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode2.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise2) {
      const me = this;
      return OK2(async function(...args) {
        const error = new ZodError3([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK2(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError3([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError3([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction2({
      ...this._def,
      args: ZodTuple2.create(items).rest(ZodUnknown2.create())
    });
  }
  returns(returnType) {
    return new ZodFunction2({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction2({
      args: args ? args : ZodTuple2.create([]).rest(ZodUnknown2.create()),
      returns: returns || ZodUnknown2.create(),
      typeName: ZodFirstPartyTypeKind2.ZodFunction,
      ...processCreateParams2(params)
    });
  }
}

class ZodLazy2 extends ZodType2 {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy2.create = (getter, params) => {
  return new ZodLazy2({
    getter,
    typeName: ZodFirstPartyTypeKind2.ZodLazy,
    ...processCreateParams2(params)
  });
};

class ZodLiteral2 extends ZodType2 {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_literal,
        expected: this._def.value
      });
      return INVALID2;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral2.create = (value2, params) => {
  return new ZodLiteral2({
    value: value2,
    typeName: ZodFirstPartyTypeKind2.ZodLiteral,
    ...processCreateParams2(params)
  });
};
function createZodEnum2(values, params) {
  return new ZodEnum2({
    values,
    typeName: ZodFirstPartyTypeKind2.ZodEnum,
    ...processCreateParams2(params)
  });
}

class ZodEnum2 extends ZodType2 {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext2(ctx, {
        expected: util3.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode2.invalid_type
      });
      return INVALID2;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext2(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_enum_value,
        options: expectedValues
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum2.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum2.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum2.create = createZodEnum2;

class ZodNativeEnum2 extends ZodType2 {
  _parse(input) {
    const nativeEnumValues = util3.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType2.string && ctx.parsedType !== ZodParsedType2.number) {
      const expectedValues = util3.objectValues(nativeEnumValues);
      addIssueToContext2(ctx, {
        expected: util3.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode2.invalid_type
      });
      return INVALID2;
    }
    if (!this._cache) {
      this._cache = new Set(util3.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util3.objectValues(nativeEnumValues);
      addIssueToContext2(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_enum_value,
        options: expectedValues
      });
      return INVALID2;
    }
    return OK2(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum2.create = (values, params) => {
  return new ZodNativeEnum2({
    values,
    typeName: ZodFirstPartyTypeKind2.ZodNativeEnum,
    ...processCreateParams2(params)
  });
};

class ZodPromise2 extends ZodType2 {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType2.promise && ctx.common.async === false) {
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.promise,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    const promisified = ctx.parsedType === ZodParsedType2.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK2(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise2.create = (schema, params) => {
  return new ZodPromise2({
    type: schema,
    typeName: ZodFirstPartyTypeKind2.ZodPromise,
    ...processCreateParams2(params)
  });
};

class ZodEffects2 extends ZodType2 {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind2.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext2(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID2;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID2;
          if (result.status === "dirty")
            return DIRTY2(result.value);
          if (status.value === "dirty")
            return DIRTY2(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID2;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID2;
        if (result.status === "dirty")
          return DIRTY2(result.value);
        if (status.value === "dirty")
          return DIRTY2(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID2;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID2;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid2(base))
          return INVALID2;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid2(base))
            return INVALID2;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util3.assertNever(effect);
  }
}
ZodEffects2.create = (schema, effect, params) => {
  return new ZodEffects2({
    schema,
    typeName: ZodFirstPartyTypeKind2.ZodEffects,
    effect,
    ...processCreateParams2(params)
  });
};
ZodEffects2.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects2({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind2.ZodEffects,
    ...processCreateParams2(params)
  });
};

class ZodOptional2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType2.undefined) {
      return OK2(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional2.create = (type, params) => {
  return new ZodOptional2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodOptional,
    ...processCreateParams2(params)
  });
};

class ZodNullable2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType2.null) {
      return OK2(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable2.create = (type, params) => {
  return new ZodNullable2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodNullable,
    ...processCreateParams2(params)
  });
};

class ZodDefault2 extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType2.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault2.create = (type, params) => {
  return new ZodDefault2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams2(params)
  });
};

class ZodCatch2 extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync2(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError3(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError3(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch2.create = (type, params) => {
  return new ZodCatch2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams2(params)
  });
};

class ZodNaN2 extends ZodType2 {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType2.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext2(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType2.nan,
        received: ctx.parsedType
      });
      return INVALID2;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN2.create = (params) => {
  return new ZodNaN2({
    typeName: ZodFirstPartyTypeKind2.ZodNaN,
    ...processCreateParams2(params)
  });
};
var BRAND2 = Symbol("zod_brand");

class ZodBranded2 extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline2 extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID2;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY2(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID2;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline2({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind2.ZodPipeline
    });
  }
}

class ZodReadonly2 extends ZodType2 {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid2(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync2(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly2.create = (type, params) => {
  return new ZodReadonly2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodReadonly,
    ...processCreateParams2(params)
  });
};
function cleanParams2(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom2(check, _params = {}, fatal) {
  if (check)
    return ZodAny2.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams2(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams2(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny2.create();
}
var late2 = {
  object: ZodObject2.lazycreate
};
var ZodFirstPartyTypeKind2;
(function(ZodFirstPartyTypeKind3) {
  ZodFirstPartyTypeKind3["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind3["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind3["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind3["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind3["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind3["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind3["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind3["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind3["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind3["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind3["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind3["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind3["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind3["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind3["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind3["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind3["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind3["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind3["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind3["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind3["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind3["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind3["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind3["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind3["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind3["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind3["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind3["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind3["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind3["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind3["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind3["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind3["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind3["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind3["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind3["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind2 || (ZodFirstPartyTypeKind2 = {}));
var instanceOfType2 = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom2((data) => data instanceof cls, params);
var stringType2 = ZodString2.create;
var numberType2 = ZodNumber2.create;
var nanType2 = ZodNaN2.create;
var bigIntType2 = ZodBigInt2.create;
var booleanType2 = ZodBoolean2.create;
var dateType2 = ZodDate2.create;
var symbolType2 = ZodSymbol2.create;
var undefinedType2 = ZodUndefined2.create;
var nullType2 = ZodNull2.create;
var anyType2 = ZodAny2.create;
var unknownType2 = ZodUnknown2.create;
var neverType2 = ZodNever2.create;
var voidType2 = ZodVoid2.create;
var arrayType2 = ZodArray2.create;
var objectType2 = ZodObject2.create;
var strictObjectType2 = ZodObject2.strictCreate;
var unionType2 = ZodUnion2.create;
var discriminatedUnionType2 = ZodDiscriminatedUnion2.create;
var intersectionType2 = ZodIntersection2.create;
var tupleType2 = ZodTuple2.create;
var recordType2 = ZodRecord2.create;
var mapType2 = ZodMap2.create;
var setType2 = ZodSet2.create;
var functionType2 = ZodFunction2.create;
var lazyType2 = ZodLazy2.create;
var literalType2 = ZodLiteral2.create;
var enumType2 = ZodEnum2.create;
var nativeEnumType2 = ZodNativeEnum2.create;
var promiseType2 = ZodPromise2.create;
var effectsType2 = ZodEffects2.create;
var optionalType2 = ZodOptional2.create;
var nullableType2 = ZodNullable2.create;
var preprocessType2 = ZodEffects2.createWithPreprocess;
var pipelineType2 = ZodPipeline2.create;
var ostring2 = () => stringType2().optional();
var onumber2 = () => numberType2().optional();
var oboolean2 = () => booleanType2().optional();
var coerce2 = {
  string: (arg) => ZodString2.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber2.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean2.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt2.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate2.create({ ...arg, coerce: true })
};
var NEVER2 = INVALID2;
var numberColumnSchema = exports_external2.array(exports_external2.number());
var bigintColumnSchema = exports_external2.array(exports_external2.string().transform((val) => BigInt(val)));
var errorMessageVariants = exports_external2.enum(["QueryResultsDeserialization", "AttestorDeserialization", "VerificationError", "TypeConversion", "Serialization"]);
var timeUnitSchema = exports_external2.union([
  exports_external2.literal("Second"),
  exports_external2.literal("Millisecond"),
  exports_external2.literal("Microsecond"),
  exports_external2.literal("Nanosecond")
]);
var columnSchema = exports_external2.discriminatedUnion("type", [
  exports_external2.object({ type: exports_external2.literal("Boolean"), column: exports_external2.array(exports_external2.boolean()) }),
  exports_external2.object({ type: exports_external2.literal("TinyInt"), column: numberColumnSchema }),
  exports_external2.object({ type: exports_external2.literal("SmallInt"), column: numberColumnSchema }),
  exports_external2.object({ type: exports_external2.literal("Int"), column: numberColumnSchema }),
  exports_external2.object({ type: exports_external2.literal("BigInt"), column: bigintColumnSchema }),
  exports_external2.object({ type: exports_external2.literal("VarChar"), column: exports_external2.array(exports_external2.string()) }),
  exports_external2.object({
    type: exports_external2.literal("Decimal75"),
    precision: exports_external2.number(),
    scale: exports_external2.number(),
    column: bigintColumnSchema
  }),
  exports_external2.object({
    type: exports_external2.literal("TimestampTZ"),
    timeUnit: timeUnitSchema,
    offset: exports_external2.number(),
    column: bigintColumnSchema
  }),
  exports_external2.object({
    type: exports_external2.literal("VarBinary"),
    column: exports_external2.array(exports_external2.array(exports_external2.number().min(0).max(255).transform((byteArray) => new Uint8Array(byteArray))))
  }),
  exports_external2.object({ type: exports_external2.literal("Scalar"), column: bigintColumnSchema })
]);
var proofOfSqlResultSchema = exports_external2.discriminatedUnion("verificationStatus", [
  exports_external2.object({
    verificationStatus: exports_external2.literal("Success"),
    result: exports_external2.record(exports_external2.string(), columnSchema)
  }),
  exports_external2.object({ verificationStatus: exports_external2.literal("Failure"), error: errorMessageVariants, message: exports_external2.string() })
]);
var proofOfSqlSchema = exports_external2.object({
  verify: exports_external2.function().args(exports_external2.string(), exports_external2.array(exports_external2.string())).returns(exports_external2.string().transform((val) => proofOfSqlResultSchema.parse(JSON.parse(val))))
});
var obj = globalThis["proofOfSql"];
var proofOfSql = () => proofOfSqlSchema.parse(obj);
var valid_gateway_response_default = {
  queryId: "060e98dd-63a3-40f3-9ca3-cf2451b9bd36",
  created: "2026-03-19T04:19:10.438548Z",
  commitmentScheme: "HYPER_KZG",
  success: true,
  canceled: false,
  error: null,
  completed: "2026-03-19T04:19:31.023715Z",
  metadata: null,
  plan: "0x0000000000000001000000000000000f455448455245554d2e424c4f434b5300000000000000010000000000000000000000000000000c424c4f434b5f4e554d424552000000050000000000000002000000000000000c424c4f434b5f4e554d424552000000000000000c7265636f72645f636f756e74000000030000000400000003000000090000000200000000000000000000000000000001000000000000000000000000000000010000000000000000000000000000000100000000010000000000000000000000000000000131000000000000000200000000000000000000000000000000000000000000000100000000000000000100000000000000010000000000000002000000000000000000000000000000000000000000000001",
  commitments: {
    commitments: {
      "ETHEREUM.BLOCKS": {
        commitment: "0x000000000000000000000000001f3fd100000000000000102c3ad7e3d1a0837b129ac631d591897f433d01b9b73270c98fe436a567ce88bd21dbfaa66bc6a64e3bf2edc5cdce8c93892c8f1b0e634986a418045599ac165608e9db231522fd450d18aca11256dce316b5378c55a8ae13a6e20844dfac1b7f24e19c535b1042d238a8a036efb93b4b8cf2ecbd1bb221b9fd8a4c1cd5c267c22edd5ce8410952d1f3bbc99292dad7613b91a8cb2841048b656892eddbd4993c1762ef4a2fe0331e3e9fd2a6c05f4b62350c8f7aa501dfba5ad4f5ded783e8a90e2b86efd087780d03aa9b47eb21daf4ffde0ae1dbb1e4e8f92ce6bd803ff25008de6325bb5e50d7e8c9bed8fbdd018e46027ce8e918ae8dd5901873cbce1a3a09932f6edf40e45b80e1081020cb7cbad7beef295a2b7919ebbc618d6f938eac16c576502dd1c00d5b462399ac64bfb4680bfa8915b0393620db8a399a0041150d8a1e648f04f46ae3f49936f65b9a102468cd8f12dc415112d73479aed9cd391ffe9481813af75723cb8f0e0dedb00e533b526aec40f2b31868cf18bc3706b118e5e60b677ad5272745e801b9a211d27dd7e190360def8572bb23b55f2241911e330ec5adce60978d7beb2f89c26a041da236a1c918e252f5c07bfbdc6e68850ec829518d5ecbe668908c0489fb7570a6843b6b659ac98a9fec2cc800fd652a2a18c05fb13ca05dd3d17b2bab47370b6efe39e1ee9f117dd2b760ac362f2095299e6b4b282f368d163e9f646a8486b5a56ba1edd4a32b5fcf1827c4805fc5941647bcad4fe40a6b1c85c51e0991dfdb6bfe9d20141bbac302f8a8cff22cf8bd120dfee669d61e5069d2439a63fe82fc92ca436f89a3abc8ea5f9c5490d9d1c92ceebb61721d9a9bdee4cdbda1e0c501bf48ef688373270b1655a91e0d61325c202163ddc738b0ebaa69c64189e8856254a613efcfb57253ff0cbe035a26cc5a15bc63bc4e1a6f1e2405446088264e44b363b7c675d5e8790e1f5944e3c4bc90133ca1824ebdb731f290378c334974492cbcdcb8d28d823948ce8f34891a7d121cbfd22f81561fe420e0130419e90417b19d25ebe15ce677e84910047fe5a5460e71246be311fdc48b525c02180ab898ad756775788db997ef1fa1b0e393cae204b17aa5e58643e54451be36b0204d6733abc72b1a1f51ff93f1c09da22b282504bd9e0cd4a57be9b452a73e89bb50ea6e91f2bd1c58c9ec82ab5339e08dec2229ff8f037d8c0ddf9b7a3465ad336ec89370a0a1c8d412157a90d79d5dd953c716c0552ed02e249a3494ec62695ef7218de4ff6854bd266a16d768bd080178780ec85875772ac72c0c24d0c7440269c23777b96e504638bb1f2b46c8f4420b49000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000a54494d455f5354414d5000000000090000000100000000000000070000000200000196ab84a4980000019c79871998000000000000000c424c4f434b5f4e554d424552000000000500000005000000020000000001564c4d000000000175c76f000000000000000a424c4f434b5f48415348000000000b0000000000000000000000094741535f4c494d495400000000084b000000000000000000000000084741535f5553454400000000084b000000000000000000000000054d494e4552000000000b00000000000000000000000b504152454e545f48415348000000000b00000000000000000000000652455741524400000000084b0000000000000000000000000453495a4500000000050000000500000002000000000000048b00000000001584fd00000000000000115452414e53414354494f4e5f434f554e54000000000400000004000000020000000000000ac100000000000000054e4f4e4345000000000b00000000000000000000000d52454345495054535f524f4f54000000000b00000000000000000000000b534841335f554e434c4553000000000b00000000000000000000000a53544154455f524f4f54000000000b0000000000000000000000115452414e53414354494f4e535f524f4f54000000000b00000000000000000000000c554e434c45535f434f554e540000000005000000050000000200000000000000000000000000000000",
        merkleProof: [
          "0x67a9c1f0be7a58c57344dd8eb7429746a336ebb53219cd3254fc22429feef148",
          "0x0ce3af87a38c8a639a9645a48b3c013b0c38485dcb6050b0958c768589dd95b2",
          "0x0d1025dacdc58c0d5114ed9bd472267ee89c008fb68dd20268648deb1b8e1390",
          "0x6d3a91215c7c691fe199fb757da654321e8ae5eabc086e1790689d08ad888c82",
          "0x59e790762e7e893be56d766c176c722e4f3aa7f27fc4fdd1ba5c571039043512",
          "0xeeb5e1f34ffad5c559ac3baf7f35115f430cd7afc94a7527cad94a9a11aa3487",
          "0x9d944dfaa117ff1f605fac87b083de39d74c7b0023513dbef893b44b0bdbe6d2",
          "0x85854f1054632810a8df8ca131a7cdd7bd9754c9df548331dfd84af70a51e8ad"
        ]
      }
    },
    r: [
      "0x6a6cf2fbeeb285146026ba12cd6dd9c16142de660fe872bb715fa2c178d1c7ea",
      "0x4621fe79ebc1aacd5d8c4867b088be98758dba204efc84a9885e02ae786a66c3",
      "0x224190f7697aba6fe361107a3ae42c0ed45aa17836ce59f0af80dd478f31599a"
    ],
    s: [
      "0x42e49ec9a626807a9489fbb1ae18961801bdde788927db2fd5a6beee4cfcc59a",
      "0x7bcf2dca14e4318b3f9455ea0f00073cfa9c793d956f0b83601fda61090da196",
      "0x4288836d52faf693e8fff5a335f832b63bc78242b327ec5924490cbd93b58e9d"
    ],
    v: [
      1,
      1,
      1
    ],
    stateRoot: [
      "0x00bd4ef5bb38096d2138abfe8eb310d7e6db19753a9a639a6e486b4438b350c0ff",
      "0x00bd4ef5bb38096d2138abfe8eb310d7e6db19753a9a639a6e486b4438b350c0ff",
      "0x00bd4ef5bb38096d2138abfe8eb310d7e6db19753a9a639a6e486b4438b350c0ff"
    ],
    address20s: [
      "0xd347bfe3e75930c1253ef5d877ff6a5cee90d919",
      "0x349b729d1ceeaae54fab5655f621750be6fadb49",
      "0x3c9260330194d2b79038d0190e6bce7346e110a9"
    ],
    blockNumber: 9083634,
    blockHash: "0x75390ff07d94e3d2368ca2eda5a400a3d04c187691d69b693b1d9706bc096cc1"
  },
  proof: "0x00000000001f3fd10000000000000004000000000000000500000000001f3fcb00000000001f3fcc000000000000000100000000000000000000000000000001000000000000000200000000001f3fcb00000000001f3fcc000000000000000508ff8b99eaa744a39af9d2e0c7d3e561f0154120ff5b79eefe745ca30126cd29239561c30b8cd5eec2a483c95b3091773a13499201f82bc0fb027ea1b52293dd0fd5d636f060c8d7839304edcb5517d21dfb3bc581d06e39b809161a53dec80a1808967b1e158e19baf9053b48b38a8ca4f2cd6b1c7e367aa6ea4c42532b42c3024acf6f99a8497c6814cf6773194379ea3760418c8912f57573b6fa1cb395c626eafd6e8d50e0fa490abcac1d62f26b95a3172efb676c107c9444d05d575b94000d4a3659184c60f57d9ae2a248d7aaafab974e933bdf67324fa4fc0a23968f2e06c722b5d994f151748db127a8a6aa50aeac562e998a5661c9873b10bb3731000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000020000000000000001c0720d4b53c6ab7c3d4d47061703f0de1ed70a8bc87f1dada0d5cac8510dc510712c8bb0318129685ac74ebc7562954dc3d2af8657721899d8b5121b34aa85be52924cc13502ce88396649ddcfd8c2b2cbb06f4752053cd83402e39453f4d5c0a059e6922c5796bc78c9554a21d043ff3ae44386c63bc69658ac26622596e8ea600ac85b966796b7233db93b688303407462d71ccdf7a0eb2f4262dfd44e603b82acd22205ff466f02e63b0ff3101c7c28b9cad822835c5abd1710e3544e95667275b11e8d90532d4e436e4d942dcc6ab8b0e721f3b850a10428eaa2a2f03a0b11148266c93047ffeb717bc8925377981644776e1eaae0f71f182702d441ab6ab09bd7b0093b77f062e8773d326f8d07344cd8e276e8f685f5955f10dd32a762b11ac328c608873b63c9caac2c99ae947552b2e67e74926d591ced4c0e04c27ba1621a64ecaaef0376f998334d2af1a9672bbf91115a77cf15bf0b9378bbb3aee0c51709b88933a609a303efc4d9174d6df75c33464a6f5bb10fd34cc67f094ad2ef89b1e24aa177246361a8792e46fc062ca9091a3b67e2924eaf3f00e97211b216f4ec9ab64ec1eb95a6e57734f14c8c773563c26ab9ade7c0068b6286125f1046ad844aa6088d6ae97a87699e1958ff3e4df5e9fc83b8e5d50582dbab410d22626d1e1dbf855719f53652af1c6b22fc21d8335e7a838dd77c69eee7690f40c242394a993208a0f29dbba3f5396fb5ee980e0565f85d7825740f661cbb9edd4261e39d543363005dcabe42508a8d9385947f7dea6f2a1004326c031c7d6c18b1147c97eaaf10d38f988cf53d250f294127474efa2544adc0d7f4e3ac0c7b5942c858eda2258e2f3573d73c984ed9f7e9bc069df689e38cb5ace7aa606ad4fbe13afc3fa9c0b414ed9c4e6eb4f7f989029add2b7e53d773e218324d7759676120c9f5b48a1843b05f6d5781e0af6752e7e0be999fad647fa2a9043a381a3d68310a5616b9c615f59636ecd9712fa8c59503ed2d61841375379b485afb7d5cbc205936597ce604905c1d4c38025d7a59dbdfbf1b03b955425f837cc4c46ef513215dc0f9d2f0b2e74651d8519052373b1cf6c21d58ed40a9fa15f8f4ba88125592c2f924aa71e6e39044a4e8906a2509b18c4a2ccadef3ce453bb60783977cf0a1615a2389e87501d6899a4bffd20a9ff4646e98272db347835b921a82700b6df1d9158355eff6d69dc4690dc6d45940e9b89abeca55617b332554ec06c4e25c32e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd307610f966905bcc9f8d3c92141d726b195b8ebdfe9fb16910e076eaef78a99f18141c0762fb29b13b3cac5c6ca99f919286e4c8008d602c031794a0d6c86c7078cb2e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd30761615a2389e87501d6899a4bffd20a9ff4646e98272db347835b921a82700b6df1d9158355eff6d69dc4690dc6d45940e9b89abeca55617b332554ec06c4e25c31615a2389e87501d6899a4bffd20a9ff4646e98272db347835b921a82700b6df1d9158355eff6d69dc4690dc6d45940e9b89abeca55617b332554ec06c4e25c310f966905bcc9f8d3c92141d726b195b8ebdfe9fb16910e076eaef78a99f18141c0762fb29b13b3cac5c6ca99f919286e4c8008d602c031794a0d6c86c7078cb2e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd30762e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd30761615a2389e87501d6899a4bffd20a9ff4646e98272db347835b921a82700b6df1d9158355eff6d69dc4690dc6d45940e9b89abeca55617b332554ec06c4e25c32e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd30762e77dbf917a5387380a9f4c4ca77d4237c4fae68c35a32684a1dbf2b7289627f2320b58b3afb78c32c9e48e89f59d0949ce9ec1d4090bbe27dbf4003d5bd307614ae465122525373e09503c62379fc799f2e67696ac52ae45e3761b44e884295232db0b13e58342da00bd5f7819711c21c50bcdffb1531a88fdb661cb471e18f2560a01a04b5e812bd8b5bb0bd9aa9caad56f262ca6dce46fec9106805a4a80f0a9db76e1e6e00e6e87794cc05413fe069d7910284ea48abf359ed735a1cbbad0d3f055f32352dcba5fd1df5adf2ab9d8287f43ddee4fef1b1efbda13a72d5130cad30c58eb46a94c3bdd1fd05e044a39367073e00fc2f5ccaa49e18ed638cd90000000000000001800000000000000000000000000000000000000000000000000000000177cfff000000000000000000000000000000000000000000000000000000000000000000000000000000540935f74f16327fe15396865e1fbb818bcb621963608be8a1f68f8334630e839b275620f87da7eb4aebe089e5d37bb2682402907c0e1a9b8eacabca02945bb889040d8b693590855a16b3521513873a545f83f014d4fbd00d24657bfdd07ac2452e49a3d3ed14f7fb696337653ee2cd6794d98f7294c4febb02028bc3840d80cd01c4345b2950b50c36b656097a4a5f3d0087c5d9c867db9a4b664ddbb298ea720ef2b91fa412dd8b1f3c994a7e97ed23232c68afbd730f925835c7c11c343ee905d5ceedf231536b70a38d11473df7a3befa19cbf3a3732477e2a1de8828e8221ace4ab3fd1cfefe8c695f57bdb08de19c1905b5fe5d0b482a90ec1fc4014d5d2e1e0d9a0d54b974112baf441a1f0f20eb43a6ee8376cf8eeb1ebcc198c0098d1a76f43a4ba242b7201720bde469d21810d2b25e175c494e1b7ebfe03b1397b51699139e5ea046def72681f6c8b30954d61ee7f6f5a487db0af80fb354929b78175e9b68178a7232d2acf2b8dced034ddc9e2b7959e06959b23391a9c69be6761194066fe78a67d72dbad90083b43c8499657d73895d41ae6f1536acded3595e067e4c473fa1714862be7165a52ac460974f5759691c05428dd0ca53b487c84f30643a99182a76a1d546ec1b4bb7d1ae83cee389995310fc7b353ca1e76cf4f6038300754d4f0f61869304503018eb57c419c6fd671d8092b6924a0cc5394e2e24ca8cdc3238b1c49b6f279f2d47065496c6d3ef998277b99f161bec1a2a37f0270ab27f46e2379f61b4cbb41c1e82e4a82f618a37dbb82f4096d7850187a931120d069302e1477db36b365db3a000ebe877e1d2de46522aabb91473e80e8cd20f0d346f46b5068c7faa097bff446d84a12cb6b77e5811c7ade7c2c8a7fb9b4608735976a9a7c366b789ec0b7ca9aecccda71f08ca530e6da0ca5725ed24bbf3094b73daf43db495e36d182b7247e2b6849a6d391ee8c32ec87a520e9902d62f2d90719d792003a61fac8b1fb69f164898af290ed3844afd7f3a29237189072a1f8271517ecda5f05d343c3a47c787b42d17372b1343fa5e72bd9e2410cba68b08b1d8759cb976f59fb10023d00ecd694831d9541eb830d678376c5acfdd125f1cf230232deda855684588172402bf40f4fe95d8a7ba2e89e15ca2f3901fd6101450877003f4080ee6672555ed7cbc2b308572531168b01509d7a78752b86a8a273aaa4c6482d48c6dc825b6394aa75660d55a75e578bf330f2ab078935a6b030f837bba18ba769841149d40eb5ae0ef063d6c713e8baf87b1057e4f8ee3278f0f97d438e9e0ee1f3d35489ba9ee4ef5ae167e5501b634ff3198b2bd702eead81bee2e72fd5274886ad9c9aada4be41c8740ffc39b52a6e27b730c9525ff6d6715c2ba8a46fb39183c5c68757b70c18bf2dd4fb09cae7c04081de13c1f7b87842e240425047bc72b04126cb8a7a1fa8f7e0810b503852e7d12ad9e75e99837d110e8a366ffef9f732cb363fc158faef7dcbd47250e6e9bc6a1dad16783947ffa14352c56679562e67f9a5ba32c1c4abef58448522eafcbe05e4bb5158092a05330233ae4b276c7159b3894ad5b36dc5776cd84ee914d928697d6afae67a84f6e17c70b591741ebb93fe30ed3472d8d511bc4c9e1e98a86ad31556045479c0e8613fca4941067d04c417663cad62159cf032dd02bd1a6651b1e5dc650da758e030e2a2941e8ff0cee4bbb5f0d69cc8035224f63f174f988197a4e9ee4d0e2f74430630851380267e8c6fbe2c591e26b446bc92a4409327b3613e8513a3503dfd8002886d6b94b58e068a4dee03711cc86a4fafa84bfd69bfe2b8a6c52a8d1362f2d346a50271356f7c05e57056a1f3ad63bb7d7e54ece5f116144567155e1d1a22549b64480d3f64a6cf47ac860c620d09c891898f42546bf5f6fdf16e5fcb2f10f9213b66f77cb9e9f18d434c9af934a9d18c923f589c7ef84f13348b3ac57a70c9e2684e7cd161f52b98e489fa29cc6ef6c4c6eaf7bf83e5bd123658320f2721683bde28c6db3a88524d07b7fec0cde61d018f42a53c004d6c9ab20dd843b7e1eccc358eebdad1f85e1c75b3dd7baa1062ae14260ff3c5fae941672e2e4e6a920a5cde2ff125774c6e175422cc5667c9b77c0a83542e89f22faa5c28e3e79560743ffce97bc0e7c33a77656114e22b32b909ced2b6de084360abc451b9caec5106f9a9cf474b6e0a0f3bbd2fdb024c82a007643cc142f2237c1596c20fd37e22d610434a871d5ba839c8df4939f3dfaaec277e3a911dbcfd3be614b67a7a7fb2fc4b005e58f39ad7f158ed50ca0c9adac79103bac0445e0015bb65669c039d012a6906c30fdfa7bbde3a7207c43df729ced130afec355c69bf0395e3d76b5f921bf4c67c618a1078bda14df501efd8141f507b8e357c56caf1e3553501061ef111eee5b71bd8e97b3e435b25b7d8b7eb94ec5e7e12fc2d165527ba856675fc2171a1cb2396f0ec449431f3a7c3de122421f1b90376b9a295295e8fc5da812051bf69d9cb8ef0731eb07e69ee530ba881d74bff36ae5b4d8990e74409abe60c421d7c91813eb1ad7fc543746a9446a9d39f38da1a91a3023747e194e6c583cba0fbffa0c986ac8199108ee9dc64afc3e64f658d597481a027619fdff1e59ad42035b5544443b24a07e5bb7e459ebf2e69e30b94a11803a4b668e2d5b980331420745a7adf3ab01814916cf42d260e6919113dcd5ce2dabc79c091009c20213fb2d0376a79e33b4185b3518c8a2d4f50330db853cc3994e961b471c38a69cd11322ac892051237387d005a4ba1ef5a1ff12c396318a552e6735326e6bb683f24e1ed9b36b4da87d4d5d378ce22ee2b6832c0998f397fbde30414197daed88b0d206c77da797bc0c26a1675d4b0c17f32482f026555e88b4efcfaec4ec830717da2851d8b58caaf044fbef79f8b52fa3112ad0a9caac64f32a5b358a8cbd5de74f24c2ff5fcadbec659bf032166587c3d3c5bb1f082174d8c5e63f24e5853d746f1e9c9ff03b727fbeef4c7e8dc9d7c22278d245a95d23776c2999123766b63ff002f10b98fdba6b1a8ad127e90813da2c93af92642f7608cd903209e71821c8df2be63abdf02e260c52f8776b3d1ebd4c9ca7cdd078942c36157dc80058e239da2286b6bdb5ef0d470d9397cce6e8c95bccef1b4866636441802e2ee42bb284bc08ac18d09ca2128d45a64768b740bf6812fe08ba8bf13bf5e8fed43b5513ffee1d5b3e3b36a3c5febca53b910305e0718edf6bb290eea11b9f13c5f30425b79e185af5e2df8bfa8201351e00fd9a2b0ba24024de6b748d03365df57bda2fe8eb13a0f724b82fecdd64d724166bd73d8a6deba42403ecee08ad5fb9b7730adff1145d67655044fa88441d465cb78e667be7a159e6efe5d9c40abb03bd7d542aeb29a574a8706a636e5804b07bb1ab4683793f4c890d6b8938001965acd77e0be502539fb1524cbd002f39140e7955c529db19f5f0c90fd81b3f12d34513aec4321e83f2cb0a28e7cbde3fced11c6327615f202166a2cbf0d75ed5fecf16940e92122663af49d74434e2be718074e445c6b2e4c6759f5bebf5dbaff879f0af66830374aab17429ad8f4385ff7749c229aa3e25847ac34c18f27ece0e7791a4807c2869eec9dd57195925a9c75c3422b5347bdd519d07863afc680f728c29d8d05f03f3f2fed6e58815601f93fa053b6ff5ddeee6e21b4fa278d2e1a7a099c4883328aeb03a251e3f191da9870f3ed6a2595313ba428c5bc9fa06491a9ef03010bb00000000000000052044da296750c39e5d659ed37823920dfe95a5a68cf0fef8e00bc164fbf4f0560b5fb97b20469467749f3fe6e7b1f0cc3efd523e55661a55f2aa194c31924b9f2e967763004d713d5f3061ef50512b1a3c65899887541f2fff92760a7154930623aa0a6424687c11659c4396c2806cfdcf497d1fe1cccaa497a7c8d5e572b8331438e0ae9f21f022ab0b301a59c71e26656f45e27c0102e9bf06f48a4d1acc66000000000000000103b0959866f654f56dc56084fc8eac84faab7289000c442b27ccfe2a5be82799000000000000001c19271c5cd3ba8db3ce0e4743d3e982e13a03da74e016c09ae7c3b9584a19c2ad2ba3b4042525ffb4a632733a33ed59673c58fb318b226f522b3b9a7eea42aff10b2c7a42b86c2425b9ddb4880ddfc934cbba97c211edc4315c6b1e3d140f266408e7ec14fb627d9c5e287834ec6618015611e16c3c79e03281f57155e0f383b51b3a1bc1c152d7c7b2e78c552832f9cace76d439654f77ecd5cf45310708d7ee263234c7464e88da45936d7450af00b63557bfb474afbfef3c8f77babf74b1ac170720dae42c5c2c73c5a578b6ea7e25b7ba1c93b778429ab2d7a7805f1d0284266f6c25d6f9b0926c4a2d0189aaaee51a0d392c7299c4619c02e01b31538021299c7c9f42de91edb970473493b0b4b71bb401ae7b8e28a5065a0ecf2acab0981ca684c50e1e4aa8f684b9667a569f9cfcc1b2438685c35163c05566b88a00ed141cb832936616151118ba31597dad0e75fafa381b4d833f4fe7389c43238a911c527632ed8f52c99d39d269eea6408d4b70ab03c9a536fb2982c472a5e90cc32229e5b03be06c2cde7bf342197ee0be355fb96059fdadd0ab50a489f7c21c1520984bfa3c348d1c859320039df70e4494c6c80c50ed3fc2401a61975e45b95c0c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf62b211457c231c8fe76210f51b6a18e19f8a4595b19667f8c735440136ffb82d70c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf620984bfa3c348d1c859320039df70e4494c6c80c50ed3fc2401a61975e45b95c20984bfa3c348d1c859320039df70e4494c6c80c50ed3fc2401a61975e45b95c2b211457c231c8fe76210f51b6a18e19f8a4595b19667f8c735440136ffb82d70c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf60c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf620984bfa3c348d1c859320039df70e4494c6c80c50ed3fc2401a61975e45b95c0c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf60c5f6b4b9d129cf9da87efe9442ff01e2f578229d4ec3cd881136d0d112aecf611a2a566bc1274251cb7264e0f0fba615ee71117353f2ddd51a1228d912f6a2009bc278fe31f7f88772ae794d8de029a7250cd947a35d1db6feae9efabd5f557000db25a34c0c63fd7dfc605d20f7d8553bfa39b466250cdc4e2f8dbe5e4f12a000000000000001409ee0c41501a8c990a21f8bafd765db9c82798c148ed8f461a8a466136bc1c7e1e20050e27eede8973ae369f6783cb00d8b6a26a58e83e3112781b7aa8d2330d09364762bd7ff948e328a2d49fac3c0b31262502bb162ff598e6f99d246142e9182f7cd013c2c94eeaa88346ee1233dd0c43a5b84e36a56a8a532d7689033eaf00e6cc773825a2e3c5cee267034a5f7155d5fda0c16e50e0c22b8c9c8e216af102534ae8df6d2a8ae3330244a3fbe4f8175e21e71b870de8485bee105d8f644f206ca0ebbefef752ee9dd17060a8ccb346c70e799396324b440ba117c960bc9329453c39edeefacbeeac21da87ace7163dee0ec4c992039b1216121a7b411e0501e7b050f6783b02614a0a11a9bb4c7588144b39f58ad6c73f7eefcbfc179adc2c09239b51742da4dbfebd0e7fd79a7544fece0c194db6779209d460fca6ede40a851e40fb204827b42e8aa79c74b9fd6fb35987dc5c3e7095303259b09dd8f9297fdd99a84a9d0b1498066b23715594d0253ec3f698673ef6dc8d7f516f9de907926a5dd851ab9718e5a83621550d034c9bb14e1b73283b19fc671fdf7a46190476917152d929e6e313ff70bfc1f447dd28ec295066d46faad1fa4751015b120b9bfcd4fdc532c319c98eba74e0d4fafbe696d5d99b60e56ab635ab65f0f25a113bc336a35c77df604a4c139f509f1c41224723b9ede80ea89dd2e989324b762f56e19dc05f07145d1550cd510814a1282d2a485d24c9e5335342f92d9583c210d58e12fd227d5b6b1de85891b7377d75975009bbdba9945c8843911cecc6071cfedc5d4d72df7e31a856a94271fb583ce316a27902a3d21be6dd8a5cca434d2a104b961a0dd06afb20c23cf57108ba3752d0136297ca742635565e0544321508c8bbc476fadfce804612926b4d02cc2708e5bfb04afd087fba4efbcb78429527904182700b0a2ea26e66313f9bf43f6ac824700e08a9d8da2dbab96170e5111a2db272860e3e1715da1660826c93b44c96beb47f9827cf3f5cab0048aa462c10e5cd2139e0953d00509fcc96cda8d443e99a1fff59306b802c63fb97363b5e1b0d230af56c65736232eaf1d298ff4896fe91d1d5fb2ae01f2d225ef2055e730c3443b1c37022076cb4d343a756456ce12829074b14b75ae3612bfb7722439403829f75da579dae23867460b64bed355ab9323c2833f9d802739a7dcb48f00e274c7603664cfd495e8286dd726b791a1f3a59732abb0eb6bf8de4533908ef53091edf341131268a214cf3f28e07ef6fcf698e578fc3a5b63da716f23b6578a82f0dc69fcda6a5e56cb8de218259f1dc021c6e7dfd9021bdfad7b0807cf096bd23ed96481c6e112dc90fcce5319790513f697c1d65989a3a7b556d228054dd632e6b99ad1f37e94ae4a6ed496edab26997d0c6d149baed7b2f2b3dd3e2f57e672a46aba67f1bc2a39008fd89b01117800ea7630e0e5c27ab4bb431c05054d8d31dcb6b514e67a005c4607137a14f61a2c3ab0166c9750c20cd54a925601cac99010e6dd0228e93d15b0108ae402804c7429f0fff533cb60f906b7f5c7bd5937c239439a6cd6055fefcccf2d738ef79e0ff0014f4aa6202bcbc9f0ab3d9c892e91a7d132702b651207f465994beaa6df74eaa65f973b138be2f1a9baa0a2cd22919f038af67e67943fdddd65027d31412fa638816611a041891ea51b3376753af170bf96f618b318ae2b06343a20788edb91e0fa014954e2579a2b8ccb4c9fd9727cf811fa04a5efac66f39cb87af59b56f300970f05876cfc2ccf36d8e0d89bc00000000000000152aa1c64ea78f30a4a1fa451e21055a97f440bf82a06cb2fdf5ba477c09012501266a6a64815e81c88b7f2ff01f53ea63058626b805f4ed341e5bb4b7e47462eb20121a8930eaa42bd4a67aae42f0a2c564b91b8a3aaaad6e2d79deb44531252e05e6047e5cbf8ab72d4339a982b3890eb675173214269b790fb1159d5cc07edd04fb219bba71bb4651699d7fdf02cc8a8b9919910c602ce061e852710446463509f181f165385967072190bef3347f5daac6a454ff35d55afddc89560b4f12a42367d5a3e302158c15913bc8734666cad3c443f3536c4d3f9521745a380153e32afc956e82c66e8d7f082833765806e277dc9d539f9085033f7e1dcbdb910e8306ccaf3cc5479fbfbd7a14d2d2aa3911a6aaf3a11f4c87e82194b69694da12f929c634dcc4264ab9e0c0d4a796eed2cff3623b7463e9b0768bb92c623be1be8d1d50437ae97efa508b42925cec69d95a5cf760002192eb3b422ab6aea852c0e02a08e31d7ce98e9e5f4cb4d4fa085f5db7796b16146047887339bdefab4fc99325f6a998ac2fb71a4d4396e966c4d55b0e56da815c02fb8241cadcd4c7fb3ef90d7e221c0771e3565bf069da8e9de5b09d7db24fb0427392aa8b3ad792f68a3a0ee718eefe56353827c27d1bdb383ecfcd5148dd4f450ecbf1d2b010c3c2336721ee3502400541d96789ba68881002c3bfaee66a0a44f9669a4d361167d120a5123061a5f2f6bc8e712d615be002d3e4a47a2b6cc16fda6a1d58a2d9c1eb562c1ab362be206732c28b9faf0034e3e1bf6995eb80b602b1de4702e294ea6cf004077889ff5c9f2ddabe5bbe896f08f3116efcfc61b7e49a9b0da6c5ffc7b63d6a26f067890132d7395e73fd4aee73af905eefe98c051401f0b4a3e9dee0498cf71e16b5d26cc2d263b5f8fea4a8dad317ffc0cb45cdd97c379feeca6e4a4cc5522df253c60c6216f2afcd7e786fcda1edfac3081926b45d1745d53314209c0abe0e8a99a57057f51f4e2fb26afddcf0eed12873648002db6d631f0a7a38f41b9a127b6b652385ce27a60f8c83696ac38b4881255deac2fbfc5025e4037cf76cf802e24f3f111331ceb3901d28e93c963d75f4f4dc5b177e33f738ce4b8b64058f05354480b13882e2ab586ecf9ba0cb661a10024efee82a769ef7a63d788f46d92a87e4edcfe82b524b26897320021cf05a0889e3a218ad3374ab436d871ea2a92e6bcfe6d0fe9fc73dbe0b368d145c5936d71644d9517e5e6421a0d247725efe01891ba8d649b63722a660c59dfe06c0dcb28cf119faf8c6c1468df663b9fe9406017b1d7b1ac3cda859221de15923a674d7ee70831724b50080283c2ca7e3a70c6aff88800bfa786da681dc2ae7211b022a09fbadad5a13a6555638920665300c9264f1ac0ab04147257a28b43c73eb91733441167c0a2b75fd1ca3a5f92330117468ba0f263eff5de7aa9fa3efa0930326c0bca4bfe3f1a69fcd0cc048320720958acaee09fa4a0a8fa9bcb533c3d970886145dc35479f63ef5799dbd342e50731dd73b33a8ba8274484a11bbd8bdd862bcace7041d0aa287fdc21ff02281c040bac3641450c8dede26adce086dc7b07b5f1b49d113ab51d9dc039852e4b2c2f094a2ba7b3270f98a6d03dbfea77e9c441c1c728eb425c8d8cfcc62b72fdce10554ca8916379dfa2bba1f57f8f4f1967c93875526ea37c16c3bb9fecda9edb069dcf287ab0112ac8b4bc1ec73a8daa67c226a1949577f4e292151258861ae10d9bdbc60e45158c35dfb0500b9914d96cf4c2a9acaa370c68ced8f6e6c842e8276239e39a99b91147c9434b4cf60eadc44b12edb0ca9e205b546d29bc1d0eb51426bfbdf3e4c569b4f80e48775bda08e6f23395f5cc4f4a80b4aa492cc488d71bf1eb0e23fdfa9b3eaaae37c88f1ba246d8c1d3f3b49331eacec2e3e5a17b491a096aa7d38f0b8af78328f6d451786eb4a0a6cc82ec5de376d06ad9125cc4cf2598077144b298f9b405573e9d0afd19ac9fe7ccc8f9eb813e3896f9ad5f8e2f07f9acdb8470e22209b4745fd907fd45ae31230ba7cef34103207a3fc6fe5a812c899272c9d3bd3dde167ffd5d26f822f759c380f38bf1b9ed1cc383118566ca1d60b96b41e65b24d6c1a1050c307708ee7d8f1ca06259195434097fa2e40f3e3051ee3b1d7025a38bbc57b6651a5cc01b5126916f6cb3b4585f13d3a8aa195f06506db51419eb86dce92542627edca6c0c6eb4a9295efc5b6f5a5839775e2f511c07903cffb6f3933464d9233ba329c5e56a8eed105b9b7edef2e7e016370ea09ec93ea34cc3a73fd7abe5db12a3180f8510b6b8e35341b8fa8a592e366e5142cf47140f6f905e0674a6d6f22b3e2e36df40cfabb46e667b5b14cc12a7d30f7164bf5352eae9d2f27c4aabc73e7e541d8fe47d4a28a1c6bb397e74df29df42e0fbde395d909143912939383636a5d5fd93b331c50aa594c6389e0cc14d0e39907faa9aed194f7423ad655eef73d83fe4219dd6c3a003caa1c005f90787bdc0d0d7d98ac4a73c24f526aa8747676b70f0296d4c4a9d38496f05f462ddf7c9e312fb1ec827117842871c49eb27277c7544221c7502ff9d88c7d335ee4236dc56e07bb09a3999c8e734f167a31c7f6952ff7583fc0ca3fd41b403fac17a2eb8e7b28d7a2ba2be95eca2c449bd17d256f75141bc600f53e7e091745b70e66ec71c9031578f1741acda5fbfe4af4c1f974356eeec8404b9506314b3ea730ff8b53fb1ed210c5526a52f66d1e6b192b71eb5502bc2f5bcba88c63f4eb966a34d9bb690ce6b9a9b4fdc01822b039995f4a22f8013ae42ca5f82e9ecb6c1737c131546e234f0befd4f920b65d81f1b23613ec49b6ed21bcf06d42d479f4a0a202877fe80260c51ede8bffbdfba4ec644142e41fea824cc5d67815ef0f70c54eba36ebe7124e6bdbc39e19f05b5cb15301e2d57a458da4aaa6ce20e5f24e0b67ee045e7e29ded7c182b5a7ef30af4b68dfaf8fbc8283ca125227ebaeef1254f4042e03bf262d3095e856c44772124cd96c8a6a6ca3d88572e4092afbf99871d99d84548026aa6adf8e66580423618a2ae72b4cd95d0ef4b82c8f38f25b9cbc0dfcb51425",
  results: "0x0000000000000002000000000000000c424c4f434b5f4e554d424552000000000500000000000000010000000001564c4d000000000000000c7265636f72645f636f756e74000000000500000000000000010000000000000001"
};
var configSchema = exports_external.object({
  schedule: exports_external.string()
});
var onCronTrigger = (runtime2) => {
  const inputString = JSON.stringify(valid_gateway_response_default);
  const result = proofOfSql().verify(inputString, []);
  switch (result.verificationStatus) {
    case "Failure":
      return `SQL Proof Verification Failed: ${result.error}`;
    case "Success":
      runtime2.log(`SQL Proof Verification Succeeded`);
  }
  return result.verificationStatus;
};
var initWorkflow = (config) => {
  const cron = new CronCapability;
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
};
async function main() {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run(initWorkflow);
}
main().catch(sendErrorResponse);
export {
  main
};
