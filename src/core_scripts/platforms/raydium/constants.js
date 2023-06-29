const BN = require("bn.js");
const ONE = new BN(1);

const NEGATIVE_ONE = new BN(-1);
exports.NEGATIVE_ONE = NEGATIVE_ONE;

const Q64 = new BN(1).shln(64);
exports.Q64 = Q64;

const Q128 = new BN(1).shln(128);
exports.Q128 = Q128;

const MaxU64 = Q64.sub(ONE);
exports.MaxU64 = MaxU64;

const U64Resolution = 64;
exports.U64Resolution = U64Resolution;

const MaxUint128 = Q128.subn(1);
exports.MaxUint128 = MaxUint128;

const MIN_TICK = -307200;
const MAX_TICK = -MIN_TICK;
exports.MIN_TICK = MIN_TICK;
exports.MAX_TICK = MAX_TICK;

const MIN_SQRT_PRICE_X64 = new BN("3939943522091");
const MAX_SQRT_PRICE_X64 = new BN("86367321006760116002434269");
exports.MIN_SQRT_PRICE_X64 = MIN_SQRT_PRICE_X64;
exports.MAX_SQRT_PRICE_X64 = MAX_SQRT_PRICE_X64;

const MIN_TICK_ARRAY_START_INDEX = -307200;
const MAX_TICK_ARRAY_START_INDEX = 306600;
exports.MIN_TICK_ARRAY_START_INDEX = MIN_TICK_ARRAY_START_INDEX;
exports.MAX_TICK_ARRAY_START_INDEX = MAX_TICK_ARRAY_START_INDEX;

const BIT_PRECISION = 14;
const LOG_B_2_X32 = "59543866431248";
const LOG_B_P_ERR_MARGIN_LOWER_X64 = "184467440737095516";
const LOG_B_P_ERR_MARGIN_UPPER_X64 = "15793534762490258745";
exports.BIT_PRECISION = BIT_PRECISION;
exports.LOG_B_2_X32 = LOG_B_2_X32;
exports.LOG_B_P_ERR_MARGIN_LOWER_X64 = LOG_B_P_ERR_MARGIN_LOWER_X64;
exports.LOG_B_P_ERR_MARGIN_UPPER_X64 = LOG_B_P_ERR_MARGIN_UPPER_X64;

const FEE_RATE_DENOMINATOR = new BN(10).pow(new BN(6));
exports.FEE_RATE_DENOMINATOR = FEE_RATE_DENOMINATOR;

// const Fee =  {
//   rate_500 : 500, //  500 / 10e6 = 0.0005
//   rate_3000 : 3000, // 3000/ 10e6 = 0.003
//   rate_10000 : 10000, // 10000 /10e6 = 0.01
// }
// // export const TICK_SPACINGS: { [amount in Fee]: number } = {
// //   [Fee.rate_500]: 10,
// //   [Fee.rate_3000]: 60,
// //   [Fee.rate_10000]: 200,
// // };