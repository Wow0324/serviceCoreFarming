exports.u16ToBytes = function (num) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

exports.i16ToBytes = function (num) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setInt16(0, num, false);
  return new Uint8Array(arr);
}

exports.u32ToBytes = function (num) {
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setUint32(0, num, false);
  return new Uint8Array(arr);
}

exports.i32ToBytes = function (num) {
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setInt32(0, num, false);
  return new Uint8Array(arr);
}

const { Layout } = require('@solana/buffer-layout');
const buffer_1 = require("buffer");
/* Check if a value is a Uint8Array.
 *
 * @ignore */
function checkUint8Array(b) {
  if (!(b instanceof Uint8Array)) {
    throw new TypeError('b must be a Uint8Array');
  }
}
exports.checkUint8Array = checkUint8Array;
/* Create a Buffer instance from a Uint8Array.
 *
 * @ignore */
function uint8ArrayToBuffer(b) {
  checkUint8Array(b);
  return buffer_1.Buffer.from(b.buffer, b.byteOffset, b.length);
}
exports.uint8ArrayToBuffer = uint8ArrayToBuffer;

var V2E32 = Math.pow(2, 32);
function divmodInt64(src) {
  const hi32 = Math.floor(src / V2E32);
  const lo32 = src - (hi32 * V2E32);
  return { hi32, lo32 };
}
/* Reconstruct Number from quotient and non-negative remainder */
function roundedInt64(hi32, lo32) {
  return hi32 * V2E32 + lo32;
}
var g_span = 0;
class BNLayout extends Layout {

  constructor(span, signed, property) {
    super(span, property);
    g_span = span;
  }
  /** @override */
  decode(b, offset = 0) {
    const buffer = uint8ArrayToBuffer(b);
    const lo32 = buffer.readUInt32LE(offset);
    const hi32 = buffer.readInt32LE(offset + 4);
    return roundedInt64(hi32, lo32);
  }
  /** @override */
  encode(src, b, offset = 0) {
    const split = divmodInt64(src);
    const buffer = uint8ArrayToBuffer(b);
    buffer.writeUInt32LE(split.lo32, offset);
    buffer.writeInt32LE(split.hi32, offset + 4);
    return g_span;
  }
}
exports.BNLayout = BNLayout;
exports.u128 = function (property) {
  return new BNLayout(16, false, property);
}
exports.u64 = function (property) {
  return new BNLayout(8, false, property);
}