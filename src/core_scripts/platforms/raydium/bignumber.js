const BN = require("bn.js");
const MAX_SAFE = 0x1fffffffffffff;
const TEN = new BN(10);
function parseBigNumberish(value) {
  // BN
  if (value instanceof BN) {
    return value;
  }

  // string
  if (typeof value === "string") {
    if (value.match(/^-?[0-9]+$/)) {
      return new BN(value);
    }
    console.log("invalid BigNumberish string", "value", value);
  }

  // number
  if (typeof value === "number") {
    if (value % 1) {
      console.log("BigNumberish number underflow", "value", value);
    }

    if (value >= MAX_SAFE || value <= -MAX_SAFE) {
      console.log("BigNumberish number overflow", "value", value);
    }

    return new BN(String(value));
  }
 

  // bigint
  if (typeof value === "bigint") {
    return new BN(value.toString());
  }

  console.log("invalid BigNumberish value", "value", value);
}
exports.parseBigNumberish = parseBigNumberish;

exports.tenExponentiate = function(shift) {
  return TEN.pow(parseBigNumberish(shift));
}

// round up
exports.divCeil = function(a, b) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const dm = a.divmod(b);

  // Fast case - exact division
  if (dm.mod.isZero()) return dm.div;

  // Round up
  return dm.div.isNeg() ? dm.div.isubn(1) : dm.div.iaddn(1);
}
