// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array4, tail) {
    let t = tail || new Empty();
    for (let i = array4.length - 1; i >= 0; --i) {
      t = new NonEmpty(array4[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length4 = 0;
    while (current) {
      current = current.tail;
      length4++;
    }
    return length4 - 1;
  }
};
function prepend(element4, tail) {
  return new NonEmpty(element4, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index3) {
    if (index3 < 0 || index3 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index3);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index3) {
  if (bitOffset === 0) {
    return buffer[index3] ?? 0;
  } else {
    const a = buffer[index3] << bitOffset & 255;
    const b = buffer[index3 + 1] >> 8 - bitOffset;
    return a | b;
  }
}
var UtfCodepoint = class {
  constructor(value) {
    this.value = value;
  }
};
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
function bitArraySlice(bitArray, start4, end) {
  end ??= bitArray.bitSize;
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return new BitArray(new Uint8Array());
  }
  if (start4 === 0 && end === bitArray.bitSize) {
    return bitArray;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const startByteIndex = Math.trunc(start4 / 8);
  const endByteIndex = Math.trunc((end + 7) / 8);
  const byteLength = endByteIndex - startByteIndex;
  let buffer;
  if (startByteIndex === 0 && byteLength === bitArray.rawBuffer.byteLength) {
    buffer = bitArray.rawBuffer;
  } else {
    buffer = new Uint8Array(
      bitArray.rawBuffer.buffer,
      bitArray.rawBuffer.byteOffset + startByteIndex,
      byteLength
    );
  }
  return new BitArray(buffer, end - start4, start4 % 8);
}
function bitArraySliceToInt(bitArray, start4, end, isBigEndian, isSigned) {
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return 0;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const isStartByteAligned = start4 % 8 === 0;
  const isEndByteAligned = end % 8 === 0;
  if (isStartByteAligned && isEndByteAligned) {
    return intFromAlignedSlice(
      bitArray,
      start4 / 8,
      end / 8,
      isBigEndian,
      isSigned
    );
  }
  const size3 = end - start4;
  const startByteIndex = Math.trunc(start4 / 8);
  const endByteIndex = Math.trunc((end - 1) / 8);
  if (startByteIndex == endByteIndex) {
    const mask2 = 255 >> start4 % 8;
    const unusedLowBitCount = (8 - end % 8) % 8;
    let value = (bitArray.rawBuffer[startByteIndex] & mask2) >> unusedLowBitCount;
    if (isSigned) {
      const highBit = 2 ** (size3 - 1);
      if (value >= highBit) {
        value -= highBit * 2;
      }
    }
    return value;
  }
  if (size3 <= 53) {
    return intFromUnalignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromUnalignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSlice(bitArray, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  if (byteSize <= 6) {
    return intFromAlignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromAlignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value = 0;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value *= 256;
      value += buffer[i];
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
      value *= 256;
      value += buffer[i];
    }
  }
  if (isSigned) {
    const highBit = 2 ** (byteSize * 8 - 1);
    if (value >= highBit) {
      value -= highBit * 2;
    }
  }
  return value;
}
function intFromAlignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value = 0n;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value *= 256n;
      value += BigInt(buffer[i]);
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
      value *= 256n;
      value += BigInt(buffer[i]);
    }
  }
  if (isSigned) {
    const highBit = 1n << BigInt(byteSize * 8 - 1);
    if (value >= highBit) {
      value -= highBit * 2n;
    }
  }
  return Number(value);
}
function intFromUnalignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size3 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value = 0;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value = buffer[byteIndex++] & (1 << leadingBitsCount) - 1;
      size3 -= leadingBitsCount;
    }
    while (size3 >= 8) {
      value *= 256;
      value += buffer[byteIndex++];
      size3 -= 8;
    }
    if (size3 > 0) {
      value *= 2 ** size3;
      value += buffer[byteIndex] >> 8 - size3;
    }
  } else {
    if (isStartByteAligned) {
      let size4 = end - start4;
      let scale = 1;
      while (size4 >= 8) {
        value += buffer[byteIndex++] * scale;
        scale *= 256;
        size4 -= 8;
      }
      value += (buffer[byteIndex] >> 8 - size4) * scale;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size4 = end - start4;
      let scale = 1;
      while (size4 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value += (byte & 255) * scale;
        scale *= 256;
        size4 -= 8;
        byteIndex++;
      }
      if (size4 > 0) {
        const lowBitsUsed = size4 - Math.max(0, size4 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size4 -= lowBitsUsed;
        if (size4 > 0) {
          trailingByte *= 2 ** size4;
          trailingByte += buffer[byteIndex + 1] >> 8 - size4;
        }
        value += trailingByte * scale;
      }
    }
  }
  if (isSigned) {
    const highBit = 2 ** (end - start4 - 1);
    if (value >= highBit) {
      value -= highBit * 2;
    }
  }
  return value;
}
function intFromUnalignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size3 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value = 0n;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value = BigInt(buffer[byteIndex++] & (1 << leadingBitsCount) - 1);
      size3 -= leadingBitsCount;
    }
    while (size3 >= 8) {
      value *= 256n;
      value += BigInt(buffer[byteIndex++]);
      size3 -= 8;
    }
    if (size3 > 0) {
      value <<= BigInt(size3);
      value += BigInt(buffer[byteIndex] >> 8 - size3);
    }
  } else {
    if (isStartByteAligned) {
      let size4 = end - start4;
      let shift = 0n;
      while (size4 >= 8) {
        value += BigInt(buffer[byteIndex++]) << shift;
        shift += 8n;
        size4 -= 8;
      }
      value += BigInt(buffer[byteIndex] >> 8 - size4) << shift;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size4 = end - start4;
      let shift = 0n;
      while (size4 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value += BigInt(byte & 255) << shift;
        shift += 8n;
        size4 -= 8;
        byteIndex++;
      }
      if (size4 > 0) {
        const lowBitsUsed = size4 - Math.max(0, size4 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size4 -= lowBitsUsed;
        if (size4 > 0) {
          trailingByte <<= size4;
          trailingByte += buffer[byteIndex + 1] >> 8 - size4;
        }
        value += BigInt(trailingByte) << shift;
      }
    }
  }
  if (isSigned) {
    const highBit = 2n ** BigInt(end - start4 - 1);
    if (value >= highBit) {
      value -= highBit * 2n;
    }
  }
  return Number(value);
}
function bitArrayValidateRange(bitArray, start4, end) {
  if (start4 < 0 || start4 > bitArray.bitSize || end < start4 || end > bitArray.bitSize) {
    const msg = `Invalid bit array slice: start = ${start4}, end = ${end}, bit size = ${bitArray.bitSize}`;
    throw new globalThis.Error(msg);
  }
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a = values3.pop();
    let b = values3.pop();
    if (a === b) continue;
    if (!isObject(a) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get3] = getters(a);
    for (let k of keys2(a)) {
      values3.push(get3(a, k), get3(b, k));
    }
  }
  return true;
}
function getters(object4) {
  if (object4 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object4 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c)) return false;
  return a.constructor === b.constructor;
}
function makeError(variant, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra) error[k] = extra[k];
  return error;
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size3 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size3, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size3 = root3.array.length;
  for (let i = 0; i < size3; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size3 = items.length;
  for (let i = 0; i < size3; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size3) {
    this.root = root3;
    this.size = size3;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};
function from_result(result) {
  if (result.isOk()) {
    let a = result[0];
    return new Some(a);
  } else {
    return new None();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value) {
  return map_insert(key, value, dict2);
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first = loop$first;
    let second = loop$second;
    if (first.hasLength(0)) {
      return second;
    } else {
      let first$1 = first.head;
      let rest$1 = first.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first, second) {
  return append_loop(reverse(first), second);
}
function prepend2(list4, item) {
  return prepend(item, list4);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare4 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4.hasLength(0)) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare4(prev, new$1);
      if ($ instanceof Gt && direction instanceof Descending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Lt && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Eq && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Gt && direction instanceof Ascending) {
        let acc$1 = (() => {
          if (direction instanceof Ascending) {
            return prepend(reverse(growing$1), acc);
          } else {
            return prepend(growing$1, acc);
          }
        })();
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let direction$1 = (() => {
            let $1 = compare4(new$1, next);
            if ($1 instanceof Lt) {
              return new Ascending();
            } else if ($1 instanceof Eq) {
              return new Ascending();
            } else {
              return new Descending();
            }
          })();
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Lt && direction instanceof Descending) {
        let acc$1 = (() => {
          if (direction instanceof Ascending) {
            return prepend(reverse(growing$1), acc);
          } else {
            return prepend(growing$1, acc);
          }
        })();
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let direction$1 = (() => {
            let $1 = compare4(new$1, next);
            if ($1 instanceof Lt) {
              return new Ascending();
            } else if ($1 instanceof Eq) {
              return new Ascending();
            } else {
              return new Descending();
            }
          })();
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        let acc$1 = (() => {
          if (direction instanceof Ascending) {
            return prepend(reverse(growing$1), acc);
          } else {
            return prepend(growing$1, acc);
          }
        })();
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let direction$1 = (() => {
            let $1 = compare4(new$1, next);
            if ($1 instanceof Lt) {
              return new Ascending();
            } else if ($1 instanceof Eq) {
              return new Ascending();
            } else {
              return new Descending();
            }
          })();
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let ascending1 = sequences2.head;
      let ascending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let descending = merge_ascendings(
        ascending1,
        ascending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(descending, acc);
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let descending1 = sequences2.head;
      let descending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let ascending = merge_descendings(
        descending1,
        descending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(ascending, acc);
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare4 = loop$compare;
    if (sequences2.hasLength(0)) {
      return toList([]);
    } else if (sequences2.hasLength(1) && direction instanceof Ascending) {
      let sequence = sequences2.head;
      return sequence;
    } else if (sequences2.hasLength(1) && direction instanceof Descending) {
      let sequence = sequences2.head;
      return reverse(sequence);
    } else if (direction instanceof Ascending) {
      let sequences$1 = merge_ascending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Descending();
      loop$compare = compare4;
    } else {
      let sequences$1 = merge_descending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Ascending();
      loop$compare = compare4;
    }
  }
}
function sort(list4, compare4) {
  if (list4.hasLength(0)) {
    return toList([]);
  } else if (list4.hasLength(1)) {
    let x = list4.head;
    return toList([x]);
  } else {
    let x = list4.head;
    let y = list4.tail.head;
    let rest$1 = list4.tail.tail;
    let direction = (() => {
      let $ = compare4(x, y);
      if ($ instanceof Lt) {
        return new Ascending();
      } else if ($ instanceof Eq) {
        return new Ascending();
      } else {
        return new Descending();
      }
    })();
    let sequences$1 = sequences(
      rest$1,
      compare4,
      toList([x]),
      direction,
      y,
      toList([])
    );
    return merge_all(sequences$1, new Ascending(), compare4);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function is_ok(result) {
  if (!result.isOk()) {
    return false;
  } else {
    return true;
  }
}
function map2(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error(e);
  }
}
function unwrap(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function to_string(term) {
  return term.toString();
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function new_map() {
  return Dict.new();
}
function map_get(map7, key) {
  const value = map7.get(key, NOT_FOUND);
  if (value === NOT_FOUND) {
    return new Error(Nil);
  }
  return new Ok(value);
}
function map_insert(key, value, map7) {
  return map7.set(key, value);
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings.atLeastLength(1)) {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    } else {
      return accumulator;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data = $[0];
  let errors = $[1];
  if (errors.hasLength(0)) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map3(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data = $[0];
      let errors = $[1];
      return [transformer(data), errors];
    }
  );
}

// build/dev/javascript/iv/iv_ffi.mjs
var empty = () => [];
var singleton = (x) => [x];
var pair = (x, y) => [x, y];
var append3 = (xs, x) => [...xs, x];
var prepend3 = (xs, x) => [x, ...xs];
var concat3 = (xs, ys) => [...xs, ...ys];
var get1 = (idx, xs) => xs[idx - 1];
var set1 = (idx, xs, x) => xs.with(idx - 1, x);
var length2 = (xs) => xs.length;
var split1 = (idx, xs) => [xs.slice(0, idx - 1), xs.slice(idx - 1)];
var map4 = (xs, f) => xs.map(f);
var bsl = (a, b) => a << b;
var bsr = (a, b) => a >> b;

// build/dev/javascript/iv/iv/internal/vector.mjs
function fold_loop(loop$xs, loop$state, loop$idx, loop$len, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let state = loop$state;
    let idx = loop$idx;
    let len = loop$len;
    let fun = loop$fun;
    let $ = idx <= len;
    if ($) {
      loop$xs = xs;
      loop$state = fun(state, get1(idx, xs));
      loop$idx = idx + 1;
      loop$len = len;
      loop$fun = fun;
    } else {
      return state;
    }
  }
}
function fold3(xs, state, fun) {
  let len = length2(xs);
  return fold_loop(xs, state, 1, len, fun);
}
function fold_skip_last(xs, state, fun) {
  let len = length2(xs);
  return fold_loop(xs, state, 1, len - 1, fun);
}
function fold_skip_first(xs, state, fun) {
  let len = length2(xs);
  return fold_loop(xs, state, 2, len, fun);
}
function fold_right_loop(loop$xs, loop$state, loop$idx, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let state = loop$state;
    let idx = loop$idx;
    let fun = loop$fun;
    let $ = idx > 0;
    if ($) {
      loop$xs = xs;
      loop$state = fun(state, get1(idx, xs));
      loop$idx = idx - 1;
      loop$fun = fun;
    } else {
      return state;
    }
  }
}
function fold_right(xs, state, fun) {
  let len = length2(xs);
  return fold_right_loop(xs, state, len, fun);
}
function find_map_loop(loop$xs, loop$idx, loop$len, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let idx = loop$idx;
    let len = loop$len;
    let fun = loop$fun;
    let $ = idx <= len;
    if ($) {
      let item = get1(idx, xs);
      let $1 = fun(item);
      if ($1.isOk()) {
        let result = $1;
        return result;
      } else {
        loop$xs = xs;
        loop$idx = idx + 1;
        loop$len = len;
        loop$fun = fun;
      }
    } else {
      return new Error(void 0);
    }
  }
}
function find_map(xs, fun) {
  let len = length2(xs);
  return find_map_loop(xs, 1, len, fun);
}
function find_index_loop(loop$xs, loop$idx, loop$len, loop$fun) {
  while (true) {
    let xs = loop$xs;
    let idx = loop$idx;
    let len = loop$len;
    let fun = loop$fun;
    let $ = idx <= len;
    if ($) {
      let $1 = fun(get1(idx, xs), idx);
      if ($1.isOk()) {
        let result = $1;
        return result;
      } else {
        loop$xs = xs;
        loop$idx = idx + 1;
        loop$len = len;
        loop$fun = fun;
      }
    } else {
      return new Error(void 0);
    }
  }
}
function find_index(xs, fun) {
  let len = length2(xs);
  return find_index_loop(xs, 1, len, fun);
}

// build/dev/javascript/iv/iv/internal/node.mjs
var Balanced = class extends CustomType {
  constructor(size3, children) {
    super();
    this.size = size3;
    this.children = children;
  }
};
var Unbalanced = class extends CustomType {
  constructor(sizes, children) {
    super();
    this.sizes = sizes;
    this.children = children;
  }
};
var Leaf = class extends CustomType {
  constructor(children) {
    super();
    this.children = children;
  }
};
var Concatenated = class extends CustomType {
  constructor(merged) {
    super();
    this.merged = merged;
  }
};
var NoFreeSlot = class extends CustomType {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
};
var RebalanceState = class extends CustomType {
  constructor(balance, roots, subtrees, overflow) {
    super();
    this.balance = balance;
    this.roots = roots;
    this.subtrees = subtrees;
    this.overflow = overflow;
  }
};
var FromLeft = class extends CustomType {
  constructor(left, merged) {
    super();
    this.left = left;
    this.merged = merged;
  }
};
var FromRight = class extends CustomType {
  constructor(merged, right) {
    super();
    this.merged = merged;
    this.right = right;
  }
};
var RebalanceMerge = class extends CustomType {
  constructor(left, merged, right) {
    super();
    this.left = left;
    this.merged = merged;
    this.right = right;
  }
};
var Split = class extends CustomType {
  constructor(prefix, suffix) {
    super();
    this.prefix = prefix;
    this.suffix = suffix;
  }
};
var EmptyPrefix = class extends CustomType {
};
function leaf(items) {
  return new Leaf(items);
}
function size(node) {
  if (node instanceof Balanced) {
    let size$1 = node.size;
    return size$1;
  } else if (node instanceof Leaf) {
    let children = node.children;
    return length2(children);
  } else {
    let sizes = node.sizes;
    return get1(length2(sizes), sizes);
  }
}
function compute_sizes(nodes) {
  let first_size = size(get1(1, nodes));
  return fold_skip_first(
    nodes,
    singleton(first_size),
    (sizes, node) => {
      let size$1 = get1(length2(sizes), sizes) + size(node);
      return append3(sizes, size$1);
    }
  );
}
function unbalanced(_, nodes) {
  let sizes = compute_sizes(nodes);
  return new Unbalanced(sizes, nodes);
}
function find_size(loop$sizes, loop$size_idx_plus_one, loop$index) {
  while (true) {
    let sizes = loop$sizes;
    let size_idx_plus_one = loop$size_idx_plus_one;
    let index3 = loop$index;
    let $ = get1(size_idx_plus_one, sizes) > index3;
    if ($) {
      return size_idx_plus_one - 1;
    } else {
      loop$sizes = sizes;
      loop$size_idx_plus_one = size_idx_plus_one + 1;
      loop$index = index3;
    }
  }
}
function find_map2(node, fun) {
  if (node instanceof Leaf) {
    let children = node.children;
    return find_map(children, fun);
  } else if (node instanceof Balanced) {
    let children = node.children;
    return find_map(
      children,
      (_capture) => {
        return find_map2(_capture, fun);
      }
    );
  } else {
    let children = node.children;
    return find_map(
      children,
      (_capture) => {
        return find_map2(_capture, fun);
      }
    );
  }
}
function extract_children(node) {
  if (node instanceof Balanced) {
    let children = node.children;
    return children;
  } else if (node instanceof Unbalanced) {
    let children = node.children;
    return children;
  } else {
    throw makeError(
      "panic",
      "iv/internal/node",
      542,
      "extract_children",
      "`panic` expression evaluated.",
      {}
    );
  }
}
function extract_items(node) {
  if (!(node instanceof Leaf)) {
    throw makeError(
      "let_assert",
      "iv/internal/node",
      547,
      "extract_items",
      "Pattern match failed, no pattern matched the value.",
      { value: node }
    );
  }
  let children = node.children;
  return children;
}
function sum_children_counts(count, node) {
  if (node instanceof Balanced) {
    let children = node.children;
    return count + length2(children);
  } else if (node instanceof Leaf) {
    let children = node.children;
    return count + length2(children);
  } else {
    let children = node.children;
    return count + length2(children);
  }
}
function rebalance_skip_subtree(state, overflow) {
  let _record = state;
  return new RebalanceState(
    state.balance - 1,
    _record.roots,
    _record.subtrees,
    overflow
  );
}
function map5(node, fun) {
  if (node instanceof Balanced) {
    let size$1 = node.size;
    let children = node.children;
    return new Balanced(
      size$1,
      map4(children, (_capture) => {
        return map5(_capture, fun);
      })
    );
  } else if (node instanceof Unbalanced) {
    let sizes = node.sizes;
    let children = node.children;
    return new Unbalanced(
      sizes,
      map4(children, (_capture) => {
        return map5(_capture, fun);
      })
    );
  } else {
    let children = node.children;
    return new Leaf(map4(children, fun));
  }
}
function fold_right2(node, state, fun) {
  if (node instanceof Balanced) {
    let children = node.children;
    return fold_right(
      children,
      state,
      (state2, node2) => {
        return fold_right2(node2, state2, fun);
      }
    );
  } else if (node instanceof Unbalanced) {
    let children = node.children;
    return fold_right(
      children,
      state,
      (state2, node2) => {
        return fold_right2(node2, state2, fun);
      }
    );
  } else {
    let children = node.children;
    return fold_right(children, state, fun);
  }
}
function balanced(shift, nodes) {
  let len = length2(nodes);
  let last_child = get1(len, nodes);
  let max_size = bsl(1, shift);
  let size$1 = max_size * (len - 1) + size(last_child);
  return new Balanced(size$1, nodes);
}
function branch(shift, nodes) {
  let len = length2(nodes);
  let max_size = bsl(1, shift);
  let sizes = compute_sizes(nodes);
  let prefix_size = (() => {
    if (len === 1) {
      return 0;
    } else {
      return get1(len - 1, sizes);
    }
  })();
  let is_balanced = prefix_size === max_size * (len - 1);
  if (is_balanced) {
    let size$1 = get1(len, sizes);
    return new Balanced(size$1, nodes);
  } else {
    return new Unbalanced(sizes, nodes);
  }
}
var branch_bits = 5;
function do_split(shift, node, index3) {
  if (node instanceof Balanced) {
    let children = node.children;
    let node_index = bsr(index3, shift);
    let index$1 = index3 - bsl(node_index, shift);
    let child = get1(node_index + 1, children);
    let child_shift = shift - branch_bits;
    let $ = do_split(child_shift, child, index$1);
    if ($ instanceof EmptyPrefix && node_index === 0) {
      return new EmptyPrefix();
    } else if ($ instanceof EmptyPrefix) {
      let $1 = split1(node_index + 1, children);
      let before_children = $1[0];
      let after_children = $1[1];
      let prefix = balanced(shift, before_children);
      let suffix = balanced(shift, after_children);
      return new Split(prefix, suffix);
    } else {
      let prefix = $.prefix;
      let suffix = $.suffix;
      let $1 = split1(node_index + 1, children);
      let before_children = $1[0];
      let after_children = $1[1];
      let prefix$1 = balanced(shift, append3(before_children, prefix));
      let suffix$1 = unbalanced(shift, set1(1, after_children, suffix));
      return new Split(prefix$1, suffix$1);
    }
  } else if (node instanceof Unbalanced) {
    let sizes = node.sizes;
    let children = node.children;
    let start_search_index = bsr(index3, shift);
    let node_index = find_size(sizes, start_search_index + 1, index3);
    let index$1 = (() => {
      if (node_index === 0) {
        return index3;
      } else {
        return index3 - get1(node_index, sizes);
      }
    })();
    let child = get1(node_index + 1, children);
    let child_shift = shift - branch_bits;
    let $ = do_split(child_shift, child, index$1);
    if ($ instanceof EmptyPrefix && node_index === 0) {
      return new EmptyPrefix();
    } else if ($ instanceof EmptyPrefix) {
      let $1 = split1(node_index + 1, children);
      let before_children = $1[0];
      let after_children = $1[1];
      let $2 = split1(node_index + 1, sizes);
      let before_sizes = $2[0];
      let after_sizes = $2[1];
      let before_size = get1(node_index, before_sizes);
      let after_sizes$1 = map4(
        after_sizes,
        (s) => {
          return s - before_size;
        }
      );
      let prefix = new Unbalanced(before_sizes, before_children);
      let suffix = new Unbalanced(after_sizes$1, after_children);
      return new Split(prefix, suffix);
    } else {
      let prefix = $.prefix;
      let suffix = $.suffix;
      let $1 = split1(node_index + 1, children);
      let before_children = $1[0];
      let after_children = $1[1];
      let $2 = split1(node_index + 1, sizes);
      let before_sizes = $2[0];
      let after_sizes = $2[1];
      let before_children$1 = append3(before_children, prefix);
      let before_size = (() => {
        if (node_index === 0) {
          return 0;
        } else {
          return get1(node_index, before_sizes);
        }
      })();
      let before_sizes$1 = append3(
        before_sizes,
        before_size + size(prefix)
      );
      let after_children$1 = set1(1, after_children, suffix);
      let after_delta = size(suffix) - get1(1, after_sizes);
      let after_sizes$1 = map4(
        after_sizes,
        (s) => {
          return s + after_delta;
        }
      );
      let prefix$1 = new Unbalanced(before_sizes$1, before_children$1);
      let suffix$1 = new Unbalanced(after_sizes$1, after_children$1);
      return new Split(prefix$1, suffix$1);
    }
  } else {
    let children = node.children;
    if (index3 === 0) {
      return new EmptyPrefix();
    } else {
      let $ = split1(index3 + 1, children);
      let before = $[0];
      let after = $[1];
      return new Split(new Leaf(before), new Leaf(after));
    }
  }
}
function split2(shift, node, index3) {
  let $ = do_split(shift, node, index3);
  if ($ instanceof Split) {
    let prefix = $.prefix;
    let suffix = $.suffix;
    return new Ok([prefix, suffix]);
  } else {
    return new Error(void 0);
  }
}
var branch_factor = 32;
function find_index2(offset, node, fun) {
  if (node instanceof Leaf) {
    let children = node.children;
    return find_index(
      children,
      (item, index3) => {
        let $ = fun(item);
        if ($) {
          return new Ok(offset + index3 - 1);
        } else {
          return new Error(void 0);
        }
      }
    );
  } else if (node instanceof Balanced) {
    let children = node.children;
    return find_index(
      children,
      (child, index3) => {
        return find_index2(offset + (index3 - 1) * branch_factor, child, fun);
      }
    );
  } else {
    let sizes = node.sizes;
    let children = node.children;
    return find_index(
      children,
      (child, index3) => {
        let child_offset = (() => {
          if (index3 === 1) {
            return 0;
          } else {
            return get1(index3 - 1, sizes);
          }
        })();
        return find_index2(offset + child_offset, child, fun);
      }
    );
  }
}
function compute_balance(params) {
  let s = (() => {
    if (params instanceof FromLeft) {
      let left = params.left;
      let merged = params.merged;
      return fold_skip_last(left, 0, sum_children_counts) + fold3(
        merged,
        0,
        sum_children_counts
      );
    } else if (params instanceof FromRight) {
      let merged = params.merged;
      let right = params.right;
      return fold3(merged, 0, sum_children_counts) + fold_skip_first(
        right,
        0,
        sum_children_counts
      );
    } else {
      let left = params.left;
      let merged = params.merged;
      let right = params.right;
      return fold_skip_last(left, 0, sum_children_counts) + fold3(
        merged,
        0,
        sum_children_counts
      ) + fold_skip_first(right, 0, sum_children_counts);
    }
  })();
  let n = (() => {
    if (params instanceof FromLeft) {
      let left = params.left;
      let merged = params.merged;
      return length2(left) + length2(merged) - 1;
    } else if (params instanceof FromRight) {
      let merged = params.merged;
      let right = params.right;
      return length2(merged) + length2(right) - 1;
    } else {
      let left = params.left;
      let merged = params.merged;
      let right = params.right;
      return length2(left) + length2(merged) + length2(
        right
      ) - 2;
    }
  })();
  let n_opt = bsr(s + branch_factor - 1, branch_bits);
  return n - n_opt - 2;
}
function rebalance_push_subtree(state, subtree, overflow, shift) {
  let $ = length2(state.subtrees) === branch_factor;
  if ($) {
    let root3 = branch(shift + branch_bits, state.subtrees);
    let _record = state;
    return new RebalanceState(
      _record.balance,
      append3(state.roots, root3),
      singleton(subtree),
      overflow
    );
  } else {
    let _record = state;
    return new RebalanceState(
      _record.balance,
      _record.roots,
      append3(state.subtrees, subtree),
      overflow
    );
  }
}
function rebalance_push(state, subtree, extract, construct, shift) {
  let children = extract(subtree);
  let subtree_len = length2(children);
  let $ = length2(state.overflow);
  if ($ === 0) {
    let $1 = state.balance <= 0 || subtree_len >= branch_factor - 1;
    if ($1) {
      return rebalance_push_subtree(state, subtree, state.overflow, shift);
    } else {
      return rebalance_skip_subtree(state, children);
    }
  } else {
    let overflow_len = $;
    let $1 = overflow_len + subtree_len <= branch_factor;
    if ($1) {
      let $2 = overflow_len + subtree_len < branch_factor - 1;
      if ($2) {
        let overflow = concat3(state.overflow, children);
        return rebalance_skip_subtree(state, overflow);
      } else {
        let children$1 = concat3(state.overflow, children);
        let subtree$1 = construct(children$1);
        return rebalance_push_subtree(state, subtree$1, empty(), shift);
      }
    } else {
      let subtree_len$1 = (() => {
        let $22 = subtree_len + overflow_len;
        if ($22 < 32) {
          let subtree_len$12 = $22;
          return subtree_len$12;
        } else {
          return branch_factor;
        }
      })();
      let $2 = split1(subtree_len$1 - overflow_len + 1, children);
      let to_move = $2[0];
      let overflow = $2[1];
      let subtree$1 = construct(concat3(state.overflow, to_move));
      return rebalance_push_subtree(state, subtree$1, overflow, shift);
    }
  }
}
function rebalance_finalise(state, construct, shift) {
  let state$1 = (() => {
    let $2 = length2(state.overflow) > 0;
    if ($2) {
      let node = construct(state.overflow);
      return rebalance_push_subtree(state, node, empty(), shift);
    } else {
      return state;
    }
  })();
  let $ = length2(state$1.subtrees) > 0;
  if ($) {
    let root3 = branch(shift + branch_bits, state$1.subtrees);
    return append3(state$1.roots, root3);
  } else {
    return state$1.roots;
  }
}
function do_rebalance(shift, params, extract, construct) {
  let balance = compute_balance(params);
  let state = new RebalanceState(
    balance,
    empty(),
    empty(),
    empty()
  );
  let push2 = (state2, node) => {
    return rebalance_push(state2, node, extract, construct, shift);
  };
  let state$1 = (() => {
    if (params instanceof FromLeft) {
      let left = params.left;
      let merged = params.merged;
      let _pipe = state;
      let _pipe$1 = fold_skip_last(left, _pipe, push2);
      return fold3(merged, _pipe$1, push2);
    } else if (params instanceof FromRight) {
      let merged = params.merged;
      let right = params.right;
      let _pipe = state;
      let _pipe$1 = fold3(merged, _pipe, push2);
      return fold_skip_first(right, _pipe$1, push2);
    } else {
      let left = params.left;
      let merged = params.merged;
      let right = params.right;
      let _pipe = state;
      let _pipe$1 = fold_skip_last(left, _pipe, push2);
      let _pipe$2 = fold3(merged, _pipe$1, push2);
      return fold_skip_first(right, _pipe$2, push2);
    }
  })();
  return rebalance_finalise(state$1, construct, shift);
}
function rebalance(shift, params) {
  let shift$1 = shift - branch_bits;
  let $ = shift$1 > 0;
  if ($) {
    let construct = (children) => {
      return branch(shift$1, children);
    };
    return do_rebalance(shift$1, params, extract_children, construct);
  } else {
    return do_rebalance(
      shift$1,
      params,
      extract_items,
      (var0) => {
        return new Leaf(var0);
      }
    );
  }
}
function concat_children(left_shift, left_children, right_shift, right_children) {
  let left_down = left_shift - branch_bits;
  let left_init = get1(length2(left_children), left_children);
  let right_down = right_shift - branch_bits;
  let right_head = get1(1, right_children);
  let merged = concat4(left_init, left_down, right_head, right_down);
  let params = new RebalanceMerge(left_children, merged, right_children);
  return rebalance(left_shift, params);
}
function concat4(left, left_shift, right, right_shift) {
  if (left instanceof Balanced && left_shift > right_shift) {
    let cl = left.children;
    return concat_left(left_shift, cl, right_shift, right);
  } else if (left instanceof Unbalanced && left_shift > right_shift) {
    let cl = left.children;
    return concat_left(left_shift, cl, right_shift, right);
  } else if (right instanceof Balanced && right_shift > left_shift) {
    let cr = right.children;
    return concat_right(left_shift, left, right_shift, cr);
  } else if (right instanceof Unbalanced && right_shift > left_shift) {
    let cr = right.children;
    return concat_right(left_shift, left, right_shift, cr);
  } else if (left instanceof Balanced && right instanceof Leaf) {
    let cl = left.children;
    return concat_left(left_shift, cl, right_shift, right);
  } else if (left instanceof Unbalanced && right instanceof Leaf) {
    let cl = left.children;
    return concat_left(left_shift, cl, right_shift, right);
  } else if (left instanceof Leaf && right instanceof Balanced) {
    let cr = right.children;
    return concat_right(left_shift, left, right_shift, cr);
  } else if (left instanceof Leaf && right instanceof Unbalanced) {
    let cr = right.children;
    return concat_right(left_shift, left, right_shift, cr);
  } else if (left instanceof Balanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    return concat_children(left_shift, cl, right_shift, cr);
  } else if (left instanceof Balanced && right instanceof Unbalanced) {
    let cl = left.children;
    let cr = right.children;
    return concat_children(left_shift, cl, right_shift, cr);
  } else if (left instanceof Unbalanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    return concat_children(left_shift, cl, right_shift, cr);
  } else if (left instanceof Unbalanced && right instanceof Unbalanced) {
    let cl = left.children;
    let cr = right.children;
    return concat_children(left_shift, cl, right_shift, cr);
  } else {
    return pair(left, right);
  }
}
function concat_left(left_shift, left_children, right_shift, right_child) {
  let down_shift = left_shift - branch_bits;
  let left_init = get1(length2(left_children), left_children);
  let merged = concat4(left_init, down_shift, right_child, right_shift);
  return rebalance(left_shift, new FromLeft(left_children, merged));
}
function concat_right(left_shift, left_child, right_shift, right_children) {
  let down_shift = right_shift - branch_bits;
  let right_head = get1(1, right_children);
  let merged = concat4(left_child, left_shift, right_head, down_shift);
  return rebalance(right_shift, new FromRight(merged, right_children));
}
function direct_append_balanced(left_shift, left, left_children, right_shift, right) {
  let left_len = length2(left_children);
  let left_last = get1(left_len, left_children);
  let $ = direct_concat(left_shift - branch_bits, left_last, right_shift, right);
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children = set1(left_len, left_children, updated);
    return new Concatenated(balanced(left_shift, children));
  } else if ($ instanceof NoFreeSlot && left_len < 32) {
    let node = $.right;
    let children = append3(left_children, node);
    let $1 = size(left_last) === bsl(1, left_shift);
    if ($1) {
      return new Concatenated(balanced(left_shift, children));
    } else {
      return new Concatenated(unbalanced(left_shift, children));
    }
  } else {
    let node = $.right;
    return new NoFreeSlot(left, balanced(left_shift, singleton(node)));
  }
}
function direct_concat(left_shift, left, right_shift, right) {
  if (left instanceof Balanced && right instanceof Leaf) {
    let cl = left.children;
    return direct_append_balanced(left_shift, left, cl, right_shift, right);
  } else if (left instanceof Unbalanced && right instanceof Leaf) {
    let sizes = left.sizes;
    let cl = left.children;
    return direct_append_unbalanced(
      left_shift,
      left,
      cl,
      sizes,
      right_shift,
      right
    );
  } else if (left instanceof Leaf && right instanceof Balanced) {
    let cr = right.children;
    return direct_prepend_balanced(left_shift, left, right_shift, right, cr);
  } else if (left instanceof Leaf && right instanceof Unbalanced) {
    let sr = right.sizes;
    let cr = right.children;
    return direct_prepend_unbalanced(
      left_shift,
      left,
      right_shift,
      right,
      cr,
      sr
    );
  } else if (left instanceof Leaf && right instanceof Leaf) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      return new Concatenated(new Leaf(concat3(cl, cr)));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Balanced && left_shift > right_shift) {
    let cl = left.children;
    return direct_append_balanced(left_shift, left, cl, right_shift, right);
  } else if (left instanceof Unbalanced && left_shift > right_shift) {
    let sizes = left.sizes;
    let cl = left.children;
    return direct_append_unbalanced(
      left_shift,
      left,
      cl,
      sizes,
      right_shift,
      right
    );
  } else if (right instanceof Balanced && right_shift > left_shift) {
    let cr = right.children;
    return direct_prepend_balanced(left_shift, left, right_shift, right, cr);
  } else if (right instanceof Unbalanced && right_shift > left_shift) {
    let sr = right.sizes;
    let cr = right.children;
    return direct_prepend_unbalanced(
      left_shift,
      left,
      right_shift,
      right,
      cr,
      sr
    );
  } else if (left instanceof Balanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat3(cl, cr);
      let left_last = get1(length2(cl), cl);
      let $1 = size(left_last) === bsl(1, left_shift);
      if ($1) {
        return new Concatenated(balanced(left_shift, merged));
      } else {
        return new Concatenated(unbalanced(left_shift, merged));
      }
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Balanced && right instanceof Unbalanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat3(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else if (left instanceof Unbalanced && right instanceof Balanced) {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat3(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  } else {
    let cl = left.children;
    let cr = right.children;
    let $ = length2(cl) + length2(cr) <= branch_factor;
    if ($) {
      let merged = concat3(cl, cr);
      return new Concatenated(unbalanced(left_shift, merged));
    } else {
      return new NoFreeSlot(left, right);
    }
  }
}
function direct_append_unbalanced(left_shift, left, left_children, sizes, right_shift, right) {
  let left_len = length2(left_children);
  let left_last = get1(left_len, left_children);
  let $ = direct_concat(left_shift - branch_bits, left_last, right_shift, right);
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children = set1(left_len, left_children, updated);
    let last_size = get1(left_len, sizes) + size(updated);
    let sizes$1 = set1(left_len, sizes, last_size);
    return new Concatenated(new Unbalanced(sizes$1, children));
  } else if ($ instanceof NoFreeSlot && left_len < 32) {
    let node = $.right;
    let children = append3(left_children, node);
    let sizes$1 = append3(
      sizes,
      get1(left_len, sizes) + size(node)
    );
    return new Concatenated(new Unbalanced(sizes$1, children));
  } else {
    let node = $.right;
    return new NoFreeSlot(left, balanced(left_shift, singleton(node)));
  }
}
function direct_prepend_balanced(left_shift, left, right_shift, right, right_children) {
  let right_len = length2(right_children);
  let right_first = get1(1, right_children);
  let $ = direct_concat(
    left_shift,
    left,
    right_shift - branch_bits,
    right_first
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children = set1(1, right_children, updated);
    return new Concatenated(unbalanced(right_shift, children));
  } else if ($ instanceof NoFreeSlot && right_len < 32) {
    let node = $.left;
    let children = prepend3(right_children, node);
    return new Concatenated(unbalanced(right_shift, children));
  } else {
    let node = $.left;
    return new NoFreeSlot(balanced(right_shift, singleton(node)), right);
  }
}
function direct_prepend_unbalanced(left_shift, left, right_shift, right, right_children, sizes) {
  let right_len = length2(right_children);
  let right_first = get1(1, right_children);
  let $ = direct_concat(
    left_shift,
    left,
    right_shift - branch_bits,
    right_first
  );
  if ($ instanceof Concatenated) {
    let updated = $.merged;
    let children = set1(1, right_children, updated);
    let size_delta = size(updated) - size(right_first);
    let sizes$1 = map4(sizes, (s) => {
      return s + size_delta;
    });
    return new Concatenated(new Unbalanced(sizes$1, children));
  } else if ($ instanceof NoFreeSlot && right_len < 32) {
    let node = $.left;
    let children = prepend3(right_children, node);
    let size$1 = size(node);
    let sizes$1 = (() => {
      let _pipe = sizes;
      let _pipe$1 = map4(_pipe, (s) => {
        return s + size$1;
      });
      return prepend3(_pipe$1, size$1);
    })();
    return new Concatenated(new Unbalanced(sizes$1, children));
  } else {
    let node = $.left;
    return new NoFreeSlot(balanced(right_shift, singleton(node)), right);
  }
}

// build/dev/javascript/iv/iv/internal/builder.mjs
var Builder = class extends CustomType {
  constructor(nodes, items, push_node, push_item) {
    super();
    this.nodes = nodes;
    this.items = items;
    this.push_node = push_node;
    this.push_item = push_item;
  }
};
function append_node(nodes, node, shift) {
  if (nodes.hasLength(0)) {
    return toList([singleton(node)]);
  } else {
    let nodes$1 = nodes.head;
    let rest = nodes.tail;
    let $ = length2(nodes$1) < branch_factor;
    if ($) {
      return prepend(append3(nodes$1, node), rest);
    } else {
      let shift$1 = shift + branch_bits;
      let new_node = balanced(shift$1, nodes$1);
      return prepend(
        singleton(node),
        append_node(rest, new_node, shift$1)
      );
    }
  }
}
function new$() {
  return new Builder(toList([]), empty(), append_node, append3);
}
function push(builder, item) {
  let nodes = builder.nodes;
  let items = builder.items;
  let push_node = builder.push_node;
  let push_item = builder.push_item;
  let $ = length2(items) === branch_factor;
  if ($) {
    let leaf2 = leaf(items);
    return new Builder(
      push_node(nodes, leaf2, 0),
      singleton(item),
      push_node,
      push_item
    );
  } else {
    return new Builder(nodes, push_item(items, item), push_node, push_item);
  }
}
function compress_nodes(loop$nodes, loop$push_node, loop$shift) {
  while (true) {
    let nodes = loop$nodes;
    let push_node = loop$push_node;
    let shift = loop$shift;
    if (nodes.hasLength(0)) {
      return new Error(void 0);
    } else if (nodes.hasLength(1)) {
      let root3 = nodes.head;
      return new Ok([shift, root3]);
    } else {
      let nodes$1 = nodes.head;
      let rest = nodes.tail;
      let shift$1 = shift + branch_bits;
      let compressed = push_node(rest, branch(shift$1, nodes$1), shift$1);
      loop$nodes = compressed;
      loop$push_node = push_node;
      loop$shift = shift$1;
    }
  }
}
function build(builder) {
  let nodes = builder.nodes;
  let items = builder.items;
  let push_node = builder.push_node;
  let items_len = length2(items);
  let nodes$1 = (() => {
    let $ = items_len > 0;
    if ($) {
      return push_node(nodes, leaf(items), 0);
    } else {
      return nodes;
    }
  })();
  return compress_nodes(nodes$1, push_node, 0);
}

// build/dev/javascript/iv/iv.mjs
var Empty2 = class extends CustomType {
};
var Array2 = class extends CustomType {
  constructor(shift, root3) {
    super();
    this.shift = shift;
    this.root = root3;
  }
};
function array(shift, nodes) {
  let $ = length2(nodes);
  if ($ === 0) {
    return new Empty2();
  } else if ($ === 1) {
    return new Array2(shift, get1(1, nodes));
  } else {
    let shift$1 = shift + branch_bits;
    return new Array2(shift$1, branch(shift$1, nodes));
  }
}
function wrap(item) {
  return new Array2(0, leaf(singleton(item)));
}
function initialise_loop(loop$idx, loop$length, loop$builder, loop$fun) {
  while (true) {
    let idx = loop$idx;
    let length4 = loop$length;
    let builder = loop$builder;
    let fun = loop$fun;
    let $ = idx < length4;
    if ($) {
      loop$idx = idx + 1;
      loop$length = length4;
      loop$builder = push(builder, fun(idx));
      loop$fun = fun;
    } else {
      return build(builder);
    }
  }
}
function initialise(length4, fun) {
  let $ = initialise_loop(0, length4, new$(), fun);
  if ($.isOk()) {
    let shift = $[0][0];
    let nodes = $[0][1];
    return array(shift, nodes);
  } else {
    return new Empty2();
  }
}
function length3(array4) {
  if (array4 instanceof Empty2) {
    return 0;
  } else {
    let root3 = array4.root;
    return size(root3);
  }
}
function find_map3(array4, is_desired) {
  if (array4 instanceof Empty2) {
    return new Error(void 0);
  } else {
    let root3 = array4.root;
    return find_map2(root3, is_desired);
  }
}
function find2(array4, is_desired) {
  return find_map3(
    array4,
    (item) => {
      let $ = is_desired(item);
      if ($) {
        return new Ok(item);
      } else {
        return new Error(void 0);
      }
    }
  );
}
function find_index3(array4, is_desired) {
  if (array4 instanceof Empty2) {
    return new Error(void 0);
  } else {
    let root3 = array4.root;
    return find_index2(0, root3, is_desired);
  }
}
function direct_concat2(left, right) {
  if (left instanceof Empty2) {
    return right;
  } else if (right instanceof Empty2) {
    return left;
  } else {
    let left_shift = left.shift;
    let left$1 = left.root;
    let right_shift = right.shift;
    let right$1 = right.root;
    let shift = (() => {
      let $2 = left_shift > right_shift;
      if ($2) {
        return left_shift;
      } else {
        return right_shift;
      }
    })();
    let $ = direct_concat(left_shift, left$1, right_shift, right$1);
    if ($ instanceof Concatenated) {
      let root3 = $.merged;
      return new Array2(shift, root3);
    } else {
      let left$2 = $.left;
      let right$2 = $.right;
      return array(shift, pair(left$2, right$2));
    }
  }
}
function append4(array4, item) {
  return direct_concat2(array4, wrap(item));
}
function prepend4(array4, item) {
  return direct_concat2(wrap(item), array4);
}
function concat5(left, right) {
  if (left instanceof Empty2) {
    return right;
  } else if (right instanceof Empty2) {
    return left;
  } else {
    let shift1 = left.shift;
    let root1 = left.root;
    let shift2 = right.shift;
    let root22 = right.root;
    let max_shift = (() => {
      let $ = shift1 >= shift2;
      if ($) {
        return shift1;
      } else {
        return shift2;
      }
    })();
    let root3 = concat4(root1, shift1, root22, shift2);
    return array(max_shift, root3);
  }
}
function split3(array4, index3) {
  if (array4 instanceof Empty2) {
    return [new Empty2(), new Empty2()];
  } else if (index3 <= 0) {
    return [new Empty2(), array4];
  } else {
    let shift = array4.shift;
    let root3 = array4.root;
    let $ = size(root3);
    if (index3 >= $) {
      let length$1 = $;
      return [array4, new Empty2()];
    } else {
      let $1 = split2(shift, root3, index3);
      if ($1.isOk()) {
        let prefix = $1[0][0];
        let suffix = $1[0][1];
        return [new Array2(shift, prefix), new Array2(shift, suffix)];
      } else {
        return [new Empty2(), array4];
      }
    }
  }
}
function insert_clamped(array4, index3, item) {
  let $ = length3(array4);
  if (index3 <= 0) {
    return prepend4(array4, item);
  } else if (index3 >= $) {
    let len = $;
    return append4(array4, item);
  } else {
    let $1 = split3(array4, index3);
    let before = $1[0];
    let after = $1[1];
    return concat5(direct_concat2(before, wrap(item)), after);
  }
}
function drop_first(array4, n) {
  let $ = split3(array4, n);
  let result = $[1];
  return result;
}
function take_first(array4, n) {
  let $ = split3(array4, n);
  let result = $[0];
  return result;
}
function try_delete(array4, index3) {
  let $ = 0 <= index3 && index3 < length3(array4);
  if ($) {
    return concat5(take_first(array4, index3), drop_first(array4, index3 + 1));
  } else {
    return array4;
  }
}
function map6(array4, fun) {
  if (array4 instanceof Empty2) {
    return new Empty2();
  } else {
    let shift = array4.shift;
    let root3 = array4.root;
    return new Array2(shift, map5(root3, fun));
  }
}
function fold_right3(array4, state, fun) {
  if (array4 instanceof Empty2) {
    return state;
  } else {
    let root3 = array4.root;
    return fold_right2(root3, state, fun);
  }
}
function to_list(array4) {
  return fold_right3(array4, toList([]), prepend2);
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$3() {
  return new Set2(new_map());
}
function contains(set, member) {
  let _pipe = set.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function insert2(set, member) {
  return new Set2(insert(set.dict, member, token));
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var EMPTY_DICT = /* @__PURE__ */ Dict.new();
function empty_dict() {
  return EMPTY_DICT;
}
var EMPTY_SET = /* @__PURE__ */ new$3();
function empty_set() {
  return EMPTY_SET;
}
var document = globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var DOCUMENT_FRAGMENT_NODE = 11;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare3(a, b) {
  if (a.name === b.name) {
    return EQ;
  } else if (a.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
};
var Property = class extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name, handler, include, prevent_default2, stop_propagation, immediate2, limit) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default2;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.limit = limit;
  }
};
var NoLimit = class extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
};
var Debounce = class extends CustomType {
  constructor(kind, delay) {
    super();
    this.kind = kind;
    this.delay = delay;
  }
};
var Throttle = class extends CustomType {
  constructor(kind, delay) {
    super();
    this.kind = kind;
    this.delay = delay;
  }
};
function limit_equals(a, b) {
  if (a instanceof NoLimit && b instanceof NoLimit) {
    return true;
  } else if (a instanceof Debounce && b instanceof Debounce && a.delay === b.delay) {
    let d1 = a.delay;
    let d2 = b.delay;
    return true;
  } else if (a instanceof Throttle && b instanceof Throttle && a.delay === b.delay) {
    let d1 = a.delay;
    let d2 = b.delay;
    return true;
  } else {
    return false;
  }
}
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes.hasLength(0)) {
      return merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "class") {
      let kind = attributes.head.kind;
      let class1 = attributes.head.value;
      let class2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value = class1 + " " + class2;
      let attribute$1 = new Attribute(kind, "class", value);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "style") {
      let kind = attributes.head.kind;
      let style1 = attributes.head.value;
      let style2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value = style1 + ";" + style2;
      let attribute$1 = new Attribute(kind, "style", value);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else {
      let attribute$1 = attributes.head;
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = prepend(attribute$1, merged);
    }
  }
}
function prepare(attributes) {
  if (attributes.hasLength(0)) {
    return attributes;
  } else if (attributes.hasLength(1)) {
    return attributes;
  } else {
    let _pipe = attributes;
    let _pipe$1 = sort(_pipe, (a, b) => {
      return compare3(b, a);
    });
    return merge(_pipe$1, empty_list);
  }
}
var attribute_kind = 0;
function attribute(name, value) {
  return new Attribute(attribute_kind, name, value);
}
var property_kind = 1;
var event_kind = 2;
function event(name, handler, include, prevent_default2, stop_propagation, immediate2, limit) {
  return new Event2(
    event_kind,
    name,
    handler,
    include,
    prevent_default2,
    stop_propagation,
    immediate2,
    limit
  );
}
var debounce_kind = 1;
var throttle_kind = 2;

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value) {
  return attribute(name, value);
}
function class$(name) {
  return attribute2("class", name);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint;
  }
};
var empty3 = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty3;
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty4() {
  return null;
}
function get2(map7, key) {
  const value = map7?.get(key);
  if (value != null) {
    return new Ok(value);
  } else {
    return new Error(void 0);
  }
}
function insert3(map7, key, value) {
  map7 ??= /* @__PURE__ */ new Map();
  map7.set(key, value);
  return map7;
}
function remove(map7, key) {
  map7?.delete(key);
  return map7;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index3, parent) {
    super();
    this.index = index3;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path = loop$path;
    let candidates = loop$candidates;
    if (candidates.hasLength(0)) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path, candidate);
      if ($) {
        return true;
      } else {
        loop$path = path;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index3, key) {
  if (key === "") {
    return new Index(index3, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_index = "\n";
var separator_key = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path = loop$path;
    let acc = loop$acc;
    if (path instanceof Root) {
      if (acc.hasLength(0)) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path instanceof Key) {
      let key = path.key;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(separator_key, prepend(key, acc));
    } else {
      let index3 = path.index;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_index,
        prepend(to_string(index3), acc)
      );
    }
  }
}
function to_string2(path) {
  return do_to_string(path, toList([]));
}
function matches(path, candidates) {
  if (candidates.hasLength(0)) {
    return false;
  } else {
    return do_matches(to_string2(path), candidates);
  }
}
var separator_event = "\f";
function event2(path, event4) {
  return do_to_string(path, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children, children_count) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
    this.children_count = children_count;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace) {
  if (namespace === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function advance(node) {
  if (node instanceof Fragment) {
    let children_count = node.children_count;
    return 1 + children_count;
  } else {
    return 1;
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children, children_count) {
  return new Fragment(
    fragment_kind,
    key,
    mapper,
    children,
    keyed_children,
    children_count
  );
}
var element_kind = 1;
function element(key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;
function set_fragment_key(loop$key, loop$children, loop$index, loop$new_children, loop$keyed_children) {
  while (true) {
    let key = loop$key;
    let children = loop$children;
    let index3 = loop$index;
    let new_children = loop$new_children;
    let keyed_children = loop$keyed_children;
    if (children.hasLength(0)) {
      return [reverse(new_children), keyed_children];
    } else if (children.atLeastLength(1) && children.head instanceof Fragment && children.head.key === "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + to_string(index3);
      let $ = set_fragment_key(
        child_key,
        node.children,
        0,
        empty_list,
        empty4()
      );
      let node_children = $[0];
      let node_keyed_children = $[1];
      let new_node = (() => {
        let _record = node;
        return new Fragment(
          _record.kind,
          _record.key,
          _record.mapper,
          node_children,
          node_keyed_children,
          _record.children_count
        );
      })();
      let new_children$1 = prepend(new_node, new_children);
      let index$1 = index3 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    } else if (children.atLeastLength(1) && children.head.key !== "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + node.key;
      let keyed_node = to_keyed(child_key, node);
      let new_children$1 = prepend(keyed_node, new_children);
      let keyed_children$1 = insert3(
        keyed_children,
        child_key,
        keyed_node
      );
      let index$1 = index3 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children$1;
    } else {
      let node = children.head;
      let children$1 = children.tail;
      let new_children$1 = prepend(node, new_children);
      let index$1 = index3 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    }
  }
}
function to_keyed(key, node) {
  if (node instanceof Element) {
    let _record = node;
    return new Element(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.children,
      _record.keyed_children,
      _record.self_closing,
      _record.void
    );
  } else if (node instanceof Text) {
    let _record = node;
    return new Text(_record.kind, key, _record.mapper, _record.content);
  } else if (node instanceof UnsafeInnerHtml) {
    let _record = node;
    return new UnsafeInnerHtml(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.inner_html
    );
  } else {
    let children = node.children;
    let $ = set_fragment_key(
      key,
      children,
      0,
      empty_list,
      empty4()
    );
    let children$1 = $[0];
    let keyed_children = $[1];
    let _record = node;
    return new Fragment(
      _record.kind,
      key,
      _record.mapper,
      children$1,
      keyed_children,
      _record.children_count
    );
  }
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index3, removed, changes, children) {
    super();
    this.index = index3;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
    this.count = count;
  }
};
var RemoveKey = class extends CustomType {
  constructor(kind, key, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.count = count;
  }
};
var Replace = class extends CustomType {
  constructor(kind, from, count, with$) {
    super();
    this.kind = kind;
    this.from = from;
    this.count = count;
    this.with = with$;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
var Remove = class extends CustomType {
  constructor(kind, from, count) {
    super();
    this.kind = kind;
    this.from = from;
    this.count = count;
  }
};
function new$6(index3, removed, changes, children) {
  return new Patch(index3, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update2(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before, count) {
  return new Move(move_kind, key, before, count);
}
var remove_key_kind = 4;
function remove_key(key, count) {
  return new RemoveKey(remove_key_kind, key, count);
}
var replace_kind = 5;
function replace2(from, count, with$) {
  return new Replace(replace_kind, from, count, with$);
}
var insert_kind = 6;
function insert4(children, before) {
  return new Insert(insert_kind, children, before);
}
var remove_kind = 7;
function remove2(from, count) {
  return new Remove(remove_kind, from, count);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace, tag, path) {
  if (tag === "input" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "select" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "textarea" && namespace === "") {
    return has_dispatched_events(events, path);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$10 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old.hasLength(0) && new$10.hasLength(0)) {
      return new AttributeChange(added, removed, events);
    } else if (old.atLeastLength(1) && old.head instanceof Event2 && new$10.hasLength(0)) {
      let prev = old.head;
      let name = old.head.name;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      let events$1 = remove_event(events, path, name);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old$1;
      loop$new = new$10;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.atLeastLength(1) && new$10.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old$1;
      loop$new = new$10;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.hasLength(0) && new$10.atLeastLength(1) && new$10.head instanceof Event2) {
      let next = new$10.head;
      let name = new$10.head.name;
      let handler = new$10.head.handler;
      let new$1 = new$10.tail;
      let added$1 = prepend(next, added);
      let events$1 = add_event(events, mapper, path, name, handler);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else if (old.hasLength(0) && new$10.atLeastLength(1)) {
      let next = new$10.head;
      let new$1 = new$10.tail;
      let added$1 = prepend(next, added);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next = new$10.head;
      let remaining_new = new$10.tail;
      let $ = compare3(prev, next);
      if (prev instanceof Attribute && $ instanceof Eq && next instanceof Attribute) {
        let has_changes = (() => {
          let $1 = next.name;
          if ($1 === "value") {
            return controlled || prev.value !== next.value;
          } else if ($1 === "checked") {
            return controlled || prev.value !== next.value;
          } else if ($1 === "selected") {
            return controlled || prev.value !== next.value;
          } else {
            return prev.value !== next.value;
          }
        })();
        let added$1 = (() => {
          if (has_changes) {
            return prepend(next, added);
          } else {
            return added;
          }
        })();
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Property && $ instanceof Eq && next instanceof Property) {
        let has_changes = (() => {
          let $1 = next.name;
          if ($1 === "scrollLeft") {
            return true;
          } else if ($1 === "scrollRight") {
            return true;
          } else if ($1 === "value") {
            return controlled || !isEqual(prev.value, next.value);
          } else if ($1 === "checked") {
            return controlled || !isEqual(prev.value, next.value);
          } else if ($1 === "selected") {
            return controlled || !isEqual(prev.value, next.value);
          } else {
            return !isEqual(prev.value, next.value);
          }
        })();
        let added$1 = (() => {
          if (has_changes) {
            return prepend(next, added);
          } else {
            return added;
          }
        })();
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let has_changes = prev.prevent_default !== next.prevent_default || prev.stop_propagation !== next.stop_propagation || prev.immediate !== next.immediate || !limit_equals(
          prev.limit,
          next.limit
        );
        let added$1 = (() => {
          if (has_changes) {
            return prepend(next, added);
          } else {
            return added;
          }
        })();
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq) {
        let name = prev.name;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq) {
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Gt && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if ($ instanceof Gt) {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Lt) {
        let name = prev.name;
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = new$10;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = new$10;
        loop$added = added;
        loop$removed = removed$1;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$10 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (old.hasLength(0) && new$10.hasLength(0)) {
      return new Diff(
        new Patch(patch_index, removed, changes, children),
        events
      );
    } else if (old.atLeastLength(1) && new$10.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let removed$1 = (() => {
        let $ = prev.key === "" || !contains(moved, prev.key);
        if ($) {
          return removed + advance(prev);
        } else {
          return removed;
        }
      })();
      let events$1 = remove_child(events, path, node_index, prev);
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$10;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed$1;
      loop$node_index = node_index;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    } else if (old.hasLength(0) && new$10.atLeastLength(1)) {
      let events$1 = add_children(
        events,
        mapper,
        path,
        node_index,
        new$10
      );
      let insert5 = insert4(new$10, node_index - moved_offset);
      let changes$1 = prepend(insert5, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else if (old.atLeastLength(1) && new$10.atLeastLength(1) && old.head.key !== new$10.head.key) {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$10.head;
      let new_remaining = new$10.tail;
      let next_did_exist = get2(old_keyed, next.key);
      let prev_does_exist = get2(new_keyed, prev.key);
      let prev_has_moved = contains(moved, prev.key);
      if (prev_does_exist.isOk() && next_did_exist.isOk() && prev_has_moved) {
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$10;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - advance(prev);
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (prev_does_exist.isOk() && next_did_exist.isOk()) {
        let match = next_did_exist[0];
        let count = advance(next);
        let before = node_index - moved_offset;
        let move2 = move(next.key, before, count);
        let changes$1 = prepend(move2, changes);
        let moved$1 = insert2(moved, next.key);
        let moved_offset$1 = moved_offset + count;
        loop$old = prepend(match, old);
        loop$old_keyed = old_keyed;
        loop$new = new$10;
        loop$new_keyed = new_keyed;
        loop$moved = moved$1;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (!prev_does_exist.isOk() && next_did_exist.isOk()) {
        let count = advance(prev);
        let moved_offset$1 = moved_offset - count;
        let events$1 = remove_child(events, path, node_index, prev);
        let remove3 = remove_key(prev.key, count);
        let changes$1 = prepend(remove3, changes);
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$10;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else if (prev_does_exist.isOk() && !next_did_exist.isOk()) {
        let before = node_index - moved_offset;
        let count = advance(next);
        let events$1 = add_child(events, mapper, path, node_index, next);
        let insert5 = insert4(toList([next]), before);
        let changes$1 = prepend(insert5, changes);
        loop$old = old;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset + count;
        loop$removed = removed;
        loop$node_index = node_index + count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else {
        let prev_count = advance(prev);
        let next_count = advance(next);
        let change = replace2(node_index - moved_offset, prev_count, next);
        let events$1 = (() => {
          let _pipe = events;
          let _pipe$1 = remove_child(_pipe, path, node_index, prev);
          return add_child(_pipe$1, mapper, path, node_index, next);
        })();
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - prev_count + next_count;
        loop$removed = removed;
        loop$node_index = node_index + next_count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = prepend(change, changes);
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old.atLeastLength(1) && old.head instanceof Fragment && new$10.atLeastLength(1) && new$10.head instanceof Fragment) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$10.head;
      let new$1 = new$10.tail;
      let node_index$1 = node_index + 1;
      let prev_count = prev.children_count;
      let next_count = next.children_count;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        moved_offset,
        0,
        node_index$1,
        -1,
        path,
        empty_list,
        children,
        composed_mapper,
        events
      );
      let changes$1 = (() => {
        let $ = child.patch.removed > 0;
        if ($) {
          let remove_from = node_index$1 + next_count - moved_offset;
          let patch = remove2(remove_from, child.patch.removed);
          return append(child.patch.changes, prepend(patch, changes));
        } else {
          return append(child.patch.changes, changes);
        }
      })();
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset + next_count - prev_count;
      loop$removed = removed;
      loop$node_index = node_index$1 + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes$1;
      loop$children = child.patch.children;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Element && new$10.atLeastLength(1) && new$10.head instanceof Element && (old.head.namespace === new$10.head.namespace && old.head.tag === new$10.head.tag)) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$10.head;
      let new$1 = new$10.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path, node_index, next.key);
      let controlled = is_controlled(
        events,
        next.namespace,
        next.tag,
        child_path
      );
      let $ = diff_attributes(
        controlled,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let initial_child_changes = (() => {
        if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
          return empty_list;
        } else {
          return toList([update2(added_attrs, removed_attrs)]);
        }
      })();
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        0,
        0,
        0,
        node_index,
        child_path,
        initial_child_changes,
        empty_list,
        composed_mapper,
        events$1
      );
      let children$1 = (() => {
        let $1 = child.patch;
        if ($1 instanceof Patch && $1.removed === 0 && $1.changes.hasLength(0) && $1.children.hasLength(0)) {
          return children;
        } else {
          return prepend(child.patch, children);
        }
      })();
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$10.atLeastLength(1) && new$10.head instanceof Text && old.head.content === new$10.head.content) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$10.head;
      let new$1 = new$10.tail;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$10.atLeastLength(1) && new$10.head instanceof Text) {
      let old$1 = old.tail;
      let next = new$10.head;
      let new$1 = new$10.tail;
      let child = new$6(
        node_index,
        0,
        toList([replace_text(next.content)]),
        empty_list
      );
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = prepend(child, children);
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof UnsafeInnerHtml && new$10.atLeastLength(1) && new$10.head instanceof UnsafeInnerHtml) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$10.head;
      let new$1 = new$10.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path, node_index, next.key);
      let $ = diff_attributes(
        false,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let child_changes = (() => {
        if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
          return empty_list;
        } else {
          return toList([update2(added_attrs, removed_attrs)]);
        }
      })();
      let child_changes$1 = (() => {
        let $1 = prev.inner_html === next.inner_html;
        if ($1) {
          return child_changes;
        } else {
          return prepend(
            replace_inner_html(next.inner_html),
            child_changes
          );
        }
      })();
      let children$1 = (() => {
        if (child_changes$1.hasLength(0)) {
          return children;
        } else {
          return prepend(
            new$6(node_index, 0, child_changes$1, toList([])),
            children
          );
        }
      })();
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = events$1;
    } else {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$10.head;
      let new_remaining = new$10.tail;
      let prev_count = advance(prev);
      let next_count = advance(next);
      let change = replace2(node_index - moved_offset, prev_count, next);
      let events$1 = (() => {
        let _pipe = events;
        let _pipe$1 = remove_child(_pipe, path, node_index, prev);
        return add_child(_pipe$1, mapper, path, node_index, next);
      })();
      loop$old = old_remaining;
      loop$old_keyed = old_keyed;
      loop$new = new_remaining;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset - prev_count + next_count;
      loop$removed = removed;
      loop$node_index = node_index + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = prepend(change, changes);
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    }
  }
}
function diff(events, old, new$10) {
  return do_diff(
    toList([old]),
    empty4(),
    toList([new$10]),
    empty4(),
    empty_set(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity2,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var Reconciler = class {
  offset = 0;
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  constructor(root3, dispatch, { useServerEvents = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
  }
  mount(vdom) {
    appendChild(this.#root, this.#createElement(vdom));
  }
  #stack = [];
  push(patch) {
    const offset = this.offset;
    if (offset) {
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
          case move_kind:
            change.before = (change.before | 0) + offset;
            break;
          case remove_kind:
          case replace_kind:
            change.from = (change.from | 0) + offset;
            break;
        }
      });
      iterate(patch.children, (child) => {
        child.index = (child.index | 0) + offset;
      });
    }
    this.#stack.push({ node: this.#root, patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #reconcile() {
    const self = this;
    while (self.#stack.length) {
      const { node, patch } = self.#stack.pop();
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
            self.#insert(node, change.children, change.before);
            break;
          case move_kind:
            self.#move(node, change.key, change.before, change.count);
            break;
          case remove_key_kind:
            self.#removeKey(node, change.key, change.count);
            break;
          case remove_kind:
            self.#remove(node, change.from, change.count);
            break;
          case replace_kind:
            self.#replace(node, change.from, change.count, change.with);
            break;
          case replace_text_kind:
            self.#replaceText(node, change.content);
            break;
          case replace_inner_html_kind:
            self.#replaceInnerHtml(node, change.inner_html);
            break;
          case update_kind:
            self.#update(node, change.added, change.removed);
            break;
        }
      });
      if (patch.removed) {
        self.#remove(
          node,
          node.childNodes.length - patch.removed,
          patch.removed
        );
      }
      iterate(patch.children, (child) => {
        self.#stack.push({ node: childAt(node, child.index), patch: child });
      });
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(node, children, before) {
    const fragment3 = createDocumentFragment();
    iterate(children, (child) => {
      const el = this.#createElement(child);
      addKeyedChild(node, el);
      appendChild(fragment3, el);
    });
    insertBefore(node, fragment3, childAt(node, before));
  }
  #move(node, key, before, count) {
    let el = getKeyedChild(node, key);
    const beforeEl = childAt(node, before);
    for (let i = 0; i < count && el !== null; ++i) {
      const next = el.nextSibling;
      if (SUPPORTS_MOVE_BEFORE) {
        node.moveBefore(el, beforeEl);
      } else {
        insertBefore(node, el, beforeEl);
      }
      el = next;
    }
  }
  #removeKey(node, key, count) {
    this.#removeFromChild(node, getKeyedChild(node, key), count);
  }
  #remove(node, from, count) {
    this.#removeFromChild(node, childAt(node, from), count);
  }
  #removeFromChild(parent, child, count) {
    while (count-- > 0 && child !== null) {
      const next = child.nextSibling;
      const key = child[meta].key;
      if (key) {
        parent[meta].keyedChildren.delete(key);
      }
      for (const [_, { timeout }] of child[meta].debouncers) {
        clearTimeout(timeout);
      }
      parent.removeChild(child);
      child = next;
    }
  }
  #replace(parent, from, count, child) {
    this.#remove(parent, from, count);
    const el = this.#createElement(child);
    addKeyedChild(parent, el);
    insertBefore(parent, el, childAt(parent, from));
  }
  #replaceText(node, content) {
    node.data = content ?? "";
  }
  #replaceInnerHtml(node, inner_html) {
    node.innerHTML = inner_html ?? "";
  }
  #update(node, added, removed) {
    iterate(removed, (attribute3) => {
      const name = attribute3.name;
      if (node[meta].handlers.has(name)) {
        node.removeEventListener(name, handleEvent);
        node[meta].handlers.delete(name);
        if (node[meta].throttles.has(name)) {
          node[meta].throttles.delete(name);
        }
        if (node[meta].debouncers.has(name)) {
          clearTimeout(node[meta].debouncers.get(name).timeout);
          node[meta].debouncers.delete(name);
        }
      } else {
        node.removeAttribute(name);
        ATTRIBUTE_HOOKS[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => {
      this.#createAttribute(node, attribute3);
    });
  }
  // CONSTRUCTORS --------------------------------------------------------------
  #createElement(vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = createElement(vnode);
        this.#createAttributes(node, vnode);
        this.#insert(node, vnode.children, 0);
        return node;
      }
      case text_kind: {
        const node = createTextNode(vnode.content);
        initialiseMetadata(node, vnode.key);
        return node;
      }
      case fragment_kind: {
        const node = createDocumentFragment();
        const head = createTextNode();
        initialiseMetadata(head, vnode.key);
        appendChild(node, head);
        iterate(vnode.children, (child) => {
          appendChild(node, this.#createElement(child));
        });
        return node;
      }
      case unsafe_inner_html_kind: {
        const node = createElement(vnode);
        this.#createAttributes(node, vnode);
        this.#replaceInnerHtml(node, vnode.inner_html);
        return node;
      }
    }
  }
  #createAttributes(node, { attributes }) {
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #createAttribute(node, attribute3) {
    const nodeMeta = node[meta];
    switch (attribute3.kind) {
      case attribute_kind: {
        const name = attribute3.name;
        const value = attribute3.value ?? "";
        if (value !== node.getAttribute(name)) {
          node.setAttribute(name, value);
        }
        ATTRIBUTE_HOOKS[name]?.added?.(node, value);
        break;
      }
      case property_kind:
        node[attribute3.name] = attribute3.value;
        break;
      case event_kind: {
        if (!nodeMeta.handlers.has(attribute3.name)) {
          node.addEventListener(attribute3.name, handleEvent, {
            passive: !attribute3.prevent_default
          });
        }
        const prevent = attribute3.prevent_default;
        const stop = attribute3.stop_propagation;
        const immediate2 = attribute3.immediate;
        const include = Array.isArray(attribute3.include) ? attribute3.include : [];
        if (attribute3.limit?.kind === throttle_kind) {
          const throttle = nodeMeta.throttles.get(attribute3.name) ?? {
            last: 0,
            delay: attribute3.limit.delay
          };
          nodeMeta.throttles.set(attribute3.name, throttle);
        }
        if (attribute3.limit?.kind === debounce_kind) {
          const debounce = nodeMeta.debouncers.get(attribute3.name) ?? {
            timeout: null,
            delay: attribute3.limit.delay
          };
          nodeMeta.debouncers.set(attribute3.name, debounce);
        }
        nodeMeta.handlers.set(attribute3.name, (event4) => {
          if (prevent) event4.preventDefault();
          if (stop) event4.stopPropagation();
          const type = event4.type;
          let path = "";
          let pathNode = event4.currentTarget;
          console.log({ event: event4 });
          console.log({ pathNode });
          while (pathNode !== this.#root) {
            const key = pathNode[meta].key;
            const parent = pathNode.parentNode;
            console.log({ parent });
            if (key) {
              path = `${separator_key}${key}${path}`;
            } else {
              const siblings = parent.childNodes;
              let index3 = [].indexOf.call(siblings, pathNode);
              if (parent === this.#root) {
                index3 -= this.offset;
              }
              path = `${separator_index}${index3}${path}`;
            }
            pathNode = parent;
          }
          path = path.slice(1);
          const data = this.#useServerEvents ? createServerEvent(event4, include) : event4;
          if (nodeMeta.throttles.has(type)) {
            const throttle = nodeMeta.throttles.get(type);
            const now = Date.now();
            const last = throttle.last || 0;
            if (now > last + throttle.delay) {
              throttle.last = now;
              this.#dispatch(data, path, type, immediate2);
            } else {
              event4.preventDefault();
            }
          } else if (nodeMeta.debouncers.has(type)) {
            const debounce = nodeMeta.debouncers.get(type);
            clearTimeout(debounce.timeout);
            debounce.timeout = setTimeout(() => {
              this.#dispatch(data, path, type, immediate2);
            }, debounce.delay);
          } else {
            this.#dispatch(data, path, type, immediate2);
          }
        });
        break;
      }
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.tail; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var appendChild = (node, child) => node.appendChild(child);
var insertBefore = (parent, node, referenceNode) => parent.insertBefore(node, referenceNode ?? null);
var createElement = ({ key, tag, namespace }) => {
  const node = document.createElementNS(namespace || NAMESPACE_HTML, tag);
  initialiseMetadata(node, key);
  return node;
};
var createTextNode = (text3) => document.createTextNode(text3 ?? "");
var createDocumentFragment = () => document.createDocumentFragment();
var childAt = (node, at) => node.childNodes[at | 0];
var meta = Symbol("lustre");
var initialiseMetadata = (node, key = "") => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node[meta] = {
        key,
        keyedChildren: /* @__PURE__ */ new Map(),
        handlers: /* @__PURE__ */ new Map(),
        throttles: /* @__PURE__ */ new Map(),
        debouncers: /* @__PURE__ */ new Map()
      };
      break;
    case TEXT_NODE:
      node[meta] = { key, debouncers: /* @__PURE__ */ new Map() };
      break;
  }
};
var addKeyedChild = (node, child) => {
  if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
    for (child = child.firstChild; child; child = child.nextSibling) {
      addKeyedChild(node, child);
    }
    return;
  }
  const key = child[meta].key;
  if (key) {
    node[meta].keyedChildren.set(key, new WeakRef(child));
  }
};
var getKeyedChild = (node, key) => node[meta].keyedChildren.get(key).deref();
var handleEvent = (event4) => {
  const target = event4.currentTarget;
  const handler = target[meta].handlers.get(event4.type);
  if (event4.type === "submit") {
    event4.detail ??= {};
    event4.detail.formData = [...new FormData(event4.target).entries()];
  }
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property2 of include) {
    const path = property2.split(".");
    for (let i = 0, input = event4, output = data; i < path.length; i++) {
      if (i === path.length - 1) {
        output[path[i]] = input[path[i]];
        break;
      }
      output = output[path[i]] ??= {};
      input = input[path[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = (name) => {
  return {
    added(node, value) {
      node[name] = value;
    }
  };
};
var ATTRIBUTE_HOOKS = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => node.focus?.());
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const vdom = virtualise_node(root3);
  if (vdom === null || vdom.children instanceof Empty) {
    const empty5 = empty_text_node();
    initialiseMetadata(empty5);
    root3.appendChild(empty5);
    return none2();
  } else if (vdom.children instanceof NonEmpty && vdom.children.tail instanceof Empty) {
    return vdom.children.head;
  } else {
    const head = empty_text_node();
    initialiseMetadata(head);
    root3.insertBefore(head, root3.firstChild);
    return fragment2(vdom.children);
  }
};
var empty_text_node = () => {
  return document.createTextNode("");
};
var virtualise_node = (node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const key = node.getAttribute("data-lustre-key");
      initialiseMetadata(node, key);
      if (key) {
        node.removeAttribute("data-lustre-key");
      }
      const tag = node.localName;
      const namespace = node.namespaceURI;
      const isHtmlElement = !namespace || namespace === NAMESPACE_HTML;
      if (isHtmlElement && input_elements.includes(tag)) {
        virtualise_input_events(tag, node);
      }
      const attributes = virtualise_attributes(node);
      const children = virtualise_child_nodes(node);
      const vnode = isHtmlElement ? element2(tag, attributes, children) : namespaced(namespace, tag, attributes, children);
      return key ? to_keyed(key, vnode) : vnode;
    }
    case TEXT_NODE:
      initialiseMetadata(node);
      return text2(node.data);
    case DOCUMENT_FRAGMENT_NODE:
      initialiseMetadata(node);
      return node.childNodes.length > 0 ? fragment2(virtualise_child_nodes(node)) : null;
    default:
      return null;
  }
};
var input_elements = ["input", "select", "textarea"];
var virtualise_input_events = (tag, node) => {
  const value = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value) return;
  queueMicrotask(() => {
    node.value = value;
    node.checked = checked;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualise_child_nodes = (node) => {
  let children = empty_list;
  let child = node.lastChild;
  while (child) {
    const vnode = virtualise_node(child);
    const next = child.previousSibling;
    if (vnode) {
      children = new NonEmpty(vnode, children);
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  return children;
};
var virtualise_attributes = (node) => {
  let index3 = node.attributes.length;
  let attributes = empty_list;
  while (index3-- > 0) {
    attributes = new NonEmpty(
      virtualise_attribute(node.attributes[index3]),
      attributes
    );
  }
  return attributes;
};
var virtualise_attribute = (attr) => {
  const name = attr.localName;
  const value = attr.value;
  return attribute2(name, value);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document;
var is_reference_equal = (a, b) => a === b;
var Runtime = class {
  constructor(root3, [model, effects], view2, update4) {
    this.root = root3;
    this.#model = model;
    this.#view = view2;
    this.#update = update4;
    this.#reconciler = new Reconciler(this.root, (event4, path, name) => {
      const [events, msg] = handle(this.#events, path, name, event4);
      this.#events = events;
      if (msg.isOk()) {
        this.dispatch(msg[0], false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$7();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  set offset(offset) {
    this.#reconciler.offset = offset;
  }
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a, b) {
  if (a instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a;
  } else {
    return append(a, b);
  }
}

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$7() {
  return new Events(
    empty4(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path, name) {
  return remove(handlers, event2(path, name));
}
function remove_event(events, path, name) {
  let handlers = do_remove_event(events.handlers, path, name);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function remove_attributes(handlers, path, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        return do_remove_event(events, path, name);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path, name, event4) {
  let next_dispatched_paths = prepend(path, events.next_dispatched_paths);
  let events$1 = (() => {
    let _record = events;
    return new Events(
      _record.handlers,
      _record.dispatched_paths,
      next_dispatched_paths
    );
  })();
  let $ = get2(
    events$1.handlers,
    path + separator_event + name
  );
  if ($.isOk()) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error(toList([]))];
  }
}
function has_dispatched_events(events, path) {
  return matches(path, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path, name, handler) {
  return insert3(
    handlers,
    event2(path, name),
    map3(handler, identity2(mapper))
  );
}
function add_event(events, mapper, path, name, handler) {
  let handlers = do_add_event(events.handlers, mapper, path, name, handler);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path, name, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = is_reference_equal(mapper, identity2);
  let $1 = is_reference_equal(child_mapper, identity2);
  if ($1) {
    return mapper;
  } else if ($ && !$1) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path, attributes);
    return do_remove_children(_pipe$1, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    return do_remove_children(handlers, parent, child_index + 1, children);
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path, attributes);
  } else {
    return handlers;
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path, attributes);
    return do_add_children(_pipe$1, composed_mapper, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let child_index$1 = child_index + 1;
    return do_add_children(
      handlers,
      composed_mapper,
      parent,
      child_index$1,
      children
    );
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path, attributes);
  } else {
    return handlers;
  }
}
function add_child(events, mapper, parent, index3, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index3, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_children(events, mapper, path, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path,
    child_index,
    children
  );
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children,
    empty4(),
    false,
    false
  );
}
function namespaced(namespace, tag, attributes, children) {
  return element(
    "",
    identity2,
    namespace,
    tag,
    attributes,
    children,
    empty4(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity2, content);
}
function none2() {
  return text("", identity2, "");
}
function count_fragment_children(loop$children, loop$count) {
  while (true) {
    let children = loop$children;
    let count = loop$count;
    if (children.hasLength(0)) {
      return count;
    } else if (children.atLeastLength(1) && children.head instanceof Fragment) {
      let children_count = children.head.children_count;
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + children_count;
    } else {
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + 1;
    }
  }
}
function fragment2(children) {
  return fragment(
    "",
    identity2,
    children,
    empty4(),
    count_fragment_children(children, 0)
  );
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function div(attrs, children) {
  return element2("div", attrs, children);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name, data) {
    super();
    this.name = name;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, attributes, properties, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.attributes = attributes;
    this.properties = properties;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$8(options) {
  let init2 = new Config2(
    false,
    true,
    empty_dict(),
    empty_dict(),
    false,
    option_none,
    option_none,
    option_none
  );
  return fold(
    options,
    init2,
    (config, option) => {
      return option.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class _Spa {
  static start({ init: init2, update: update4, view: view2 }, selector, flags) {
    if (!is_browser()) return new Error(new NotABrowser());
    const root3 = selector instanceof HTMLElement ? selector : document.querySelector(selector);
    if (!root3) return new Error(new ElementNotFound(selector));
    return new Ok(new _Spa(root3, init2(flags), update4, view2));
  }
  #runtime;
  constructor(root3, [init2, effects], update4, view2) {
    this.#runtime = new Runtime(root3, [init2, effects], view2, update4);
  }
  send(message) {
    switch (message.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message.name, message.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = Spa.start;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init2, update4, view2, config) {
    super();
    this.init = init2;
    this.update = update4;
    this.view = view2;
    this.config = config;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init2, update4, view2) {
  return new App(init2, update4, view2, new$8(empty_list));
}
function simple(init2, update4, view2) {
  let init$1 = (start_args) => {
    return [init2(start_args), none()];
  };
  let update$1 = (model, msg) => {
    return [update4(model, msg), none()];
  };
  return application(init$1, update$1, view2);
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function extract_keyed_children(children) {
  let init2 = [empty4(), empty_list, 0];
  let $ = fold(
    children,
    init2,
    (_use0, _use1) => {
      let keyed_children2 = _use0[0];
      let children$12 = _use0[1];
      let children_count2 = _use0[2];
      let key = _use1[0];
      let element$1 = _use1[1];
      let keyed_element = to_keyed(key, element$1);
      let keyed_children$1 = (() => {
        if (key === "") {
          return keyed_children2;
        } else {
          return insert3(keyed_children2, key, keyed_element);
        }
      })();
      return [
        keyed_children$1,
        prepend(keyed_element, children$12),
        children_count2 + 1
      ];
    }
  );
  let keyed_children = $[0];
  let children$1 = $[1];
  let children_count = $[2];
  return [keyed_children, reverse(children$1), children_count];
}
function element3(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children = $[0];
  let children$1 = $[1];
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children$1,
    keyed_children,
    false,
    false
  );
}
function div2(attributes, children) {
  return element3("div", attributes, children);
}

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name) {
  if (name === "input") {
    return true;
  } else if (name === "change") {
    return true;
  } else if (name === "focus") {
    return true;
  } else if (name === "focusin") {
    return true;
  } else if (name === "focusout") {
    return true;
  } else if (name === "blur") {
    return true;
  } else if (name === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name, handler) {
  return event(
    name,
    handler,
    empty_list,
    false,
    false,
    is_immediate_event(name),
    new NoLimit(0)
  );
}
function prevent_default(event4) {
  if (event4 instanceof Event2) {
    let _record = event4;
    return new Event2(
      _record.kind,
      _record.name,
      _record.handler,
      _record.include,
      true,
      _record.stop_propagation,
      _record.immediate,
      _record.limit
    );
  } else {
    return event4;
  }
}

// build/dev/javascript/lift_and_plop/lift_and_plop.mjs
var Element2 = class extends CustomType {
  constructor(id, content, is_placeholder) {
    super();
    this.id = id;
    this.content = content;
    this.is_placeholder = is_placeholder;
  }
};
var DragState = class extends CustomType {
  constructor(element_id, element_index, placeholder_index) {
    super();
    this.element_id = element_id;
    this.element_index = element_index;
    this.placeholder_index = placeholder_index;
  }
};
var Model = class extends CustomType {
  constructor(elements, drag_state) {
    super();
    this.elements = elements;
    this.drag_state = drag_state;
  }
};
var DragStart = class extends CustomType {
  constructor(draggable_id) {
    super();
    this.draggable_id = draggable_id;
  }
};
var DragOver = class extends CustomType {
  constructor(dragged_over_id) {
    super();
    this.dragged_over_id = dragged_over_id;
  }
};
var DropEnd = class extends CustomType {
  constructor(dropped_id) {
    super();
    this.dropped_id = dropped_id;
  }
};
function init(_) {
  return new Model(
    initialise(
      4,
      (i) => {
        let id = to_string(i);
        return new Element2("number-" + id, "Number " + id, false);
      }
    ),
    new None()
  );
}
function has_id(id) {
  return (element4) => {
    return element4.id === id;
  };
}
function update3(model, msg) {
  if (model instanceof Model && msg instanceof DragStart) {
    let elements = model.elements;
    let draggable_id = msg.draggable_id;
    let drag_state = (() => {
      let _pipe = find_index3(elements, has_id(draggable_id));
      let _pipe$1 = map2(
        _pipe,
        (placeholder_index) => {
          return new DragState(
            draggable_id,
            placeholder_index,
            placeholder_index
          );
        }
      );
      return from_result(_pipe$1);
    })();
    let elements$1 = map6(
      elements,
      (element4) => {
        let _record = element4;
        return new Element2(
          _record.id,
          _record.content,
          element4.id === draggable_id
        );
      }
    );
    return new Model(elements$1, drag_state);
  } else if (model instanceof Model && msg instanceof DropEnd) {
    let elements = model.elements;
    let dropped_id = msg.dropped_id;
    echo(
      "drop_end " + dropped_id + " or maybe nothing",
      "src/lift_and_plop.gleam",
      70
    );
    let elements$1 = map6(
      elements,
      (element4) => {
        let _record = element4;
        return new Element2(_record.id, _record.content, false);
      }
    );
    return new Model(elements$1, new None());
  } else if (model instanceof Model && model.drag_state instanceof Some && msg instanceof DragOver) {
    let elements = model.elements;
    let drag_state = model.drag_state[0];
    let dragged_over_id = msg.dragged_over_id;
    let dragged_over_index = find_index3(elements, has_id(dragged_over_id));
    let elements$1 = (() => {
      let _pipe = try$(
        find2(elements, has_id(drag_state.element_id)),
        (dragged_element) => {
          return map2(
            dragged_over_index,
            (dragged_over_index2) => {
              let _pipe2 = try_delete(elements, drag_state.placeholder_index);
              return insert_clamped(
                _pipe2,
                dragged_over_index2,
                dragged_element
              );
            }
          );
        }
      );
      return unwrap(_pipe, elements);
    })();
    let drag_state$1 = (() => {
      let _pipe = dragged_over_index;
      let _pipe$1 = map2(
        _pipe,
        (placeholder_index) => {
          let _record = drag_state;
          return new DragState(
            _record.element_id,
            _record.element_index,
            placeholder_index
          );
        }
      );
      return unwrap(_pipe$1, drag_state);
    })();
    return new Model(elements$1, new Some(drag_state$1));
  } else {
    return model;
  }
}
function droppable(id, drag_start_handler, drag_over_handler, drop_handler, is_placeholder, children) {
  let on_drag_start = on(
    "dragstart",
    success(drag_start_handler(id))
  );
  let on_drop = (() => {
    let _pipe = on("drop", success(drop_handler(id)));
    return prevent_default(_pipe);
  })();
  let on_drag_over = (() => {
    let _pipe = on("dragover", success(drag_over_handler(id)));
    return prevent_default(_pipe);
  })();
  let on_drag_end = on("dragend", success(drop_handler("")));
  let attributes = (() => {
    if (is_placeholder) {
      return toList([
        class$("draggable placeholder"),
        on_drop,
        on_drag_over,
        on_drag_end
      ]);
    } else {
      return toList([
        class$("draggable"),
        attribute2("draggable", "true"),
        on_drag_start,
        on_drag_over,
        on_drop,
        on_drag_end
      ]);
    }
  })();
  return div(attributes, children);
}
function view(model) {
  return div2(
    toList([]),
    (() => {
      let _pipe = model.elements;
      let _pipe$1 = to_list(_pipe);
      return map(
        _pipe$1,
        (element4) => {
          let $ = element4.is_placeholder;
          if ($) {
            return [
              "placeholder",
              droppable(
                "placeholder",
                (var0) => {
                  return new DragStart(var0);
                },
                (var0) => {
                  return new DragOver(var0);
                },
                (var0) => {
                  return new DropEnd(var0);
                },
                true,
                toList([text2(element4.content)])
              )
            ];
          } else {
            return [
              element4.id,
              droppable(
                element4.id,
                (var0) => {
                  return new DragStart(var0);
                },
                (var0) => {
                  return new DragOver(var0);
                },
                (var0) => {
                  return new DropEnd(var0);
                },
                false,
                toList([text2(element4.content)])
              )
            ];
          }
        }
      );
    })()
  );
}
function main() {
  let app = simple(init, update3, view);
  let $ = start3(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "lift_and_plop",
      16,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}
function echo(value, file, line) {
  const grey = "\x1B[90m";
  const reset_color = "\x1B[39m";
  const file_line = `${file}:${line}`;
  const string_value = echo$inspect(value);
  if (typeof process === "object" && process.stderr?.write) {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    process.stderr.write(string5);
  } else if (typeof Deno === "object") {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    Deno.stderr.writeSync(new TextEncoder().encode(string5));
  } else {
    const string5 = `${file_line}
${string_value}`;
    console.log(string5);
  }
  return value;
}
function echo$inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (char == "\n") new_str += "\\n";
    else if (char == "\r") new_str += "\\r";
    else if (char == "	") new_str += "\\t";
    else if (char == "\f") new_str += "\\f";
    else if (char == "\\") new_str += "\\\\";
    else if (char == '"') new_str += '\\"';
    else if (char < " " || char > "~" && char < "\xA0") {
      new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
    } else {
      new_str += char;
    }
  }
  new_str += '"';
  return new_str;
}
function echo$inspectDict(map7) {
  let body = "dict.from_list([";
  let first = true;
  let key_value_pairs = [];
  map7.forEach((value, key) => {
    key_value_pairs.push([key, value]);
  });
  key_value_pairs.sort();
  key_value_pairs.forEach(([key, value]) => {
    if (!first) body = body + ", ";
    body = body + "#(" + echo$inspect(key) + ", " + echo$inspect(value) + ")";
    first = false;
  });
  return body + "])";
}
function echo$inspectCustomType(record) {
  const props = Object.keys(record).map((label) => {
    const value = echo$inspect(record[label]);
    return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function echo$inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${echo$inspect(k)}: ${echo$inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function echo$inspect(v) {
  const t = typeof v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "//js(null)";
  if (v === void 0) return "Nil";
  if (t === "string") return echo$inspectString(v);
  if (t === "bigint" || t === "number") return v.toString();
  if (Array.isArray(v)) return `#(${v.map(echo$inspect).join(", ")})`;
  if (v instanceof List) return `[${v.toArray().map(echo$inspect).join(", ")}]`;
  if (v instanceof UtfCodepoint) return `//utfcodepoint(${String.fromCodePoint(v.value)})`;
  if (v instanceof BitArray) return echo$inspectBitArray(v);
  if (v instanceof CustomType) return echo$inspectCustomType(v);
  if (echo$isDict(v)) return echo$inspectDict(v);
  if (v instanceof Set) return `//js(Set(${[...v].map(echo$inspect).join(", ")}))`;
  if (v instanceof RegExp) return `//js(${v})`;
  if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys()) args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return echo$inspectObject(v);
}
function echo$inspectBitArray(bitArray) {
  let endOfAlignedBytes = bitArray.bitOffset + 8 * Math.trunc(bitArray.bitSize / 8);
  let alignedBytes = bitArraySlice(bitArray, bitArray.bitOffset, endOfAlignedBytes);
  let remainingUnalignedBits = bitArray.bitSize % 8;
  if (remainingUnalignedBits > 0) {
    let remainingBits = bitArraySliceToInt(bitArray, endOfAlignedBytes, bitArray.bitSize, false, false);
    let alignedBytesArray = Array.from(alignedBytes.rawBuffer);
    let suffix = `${remainingBits}:size(${remainingUnalignedBits})`;
    if (alignedBytesArray.length === 0) {
      return `<<${suffix}>>`;
    } else {
      return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}, ${suffix}>>`;
    }
  } else {
    return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}>>`;
  }
}
function echo$isDict(value) {
  try {
    return value instanceof Dict;
  } catch {
    return false;
  }
}

// build/.lustre/entry.mjs
main();
