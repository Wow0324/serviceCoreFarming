const lo = require('@solana/buffer-layout');
const loutil = require('@solana/buffer-layout-utils');
const {
    u128, u64
} = require("./util");

const AccountLayout = lo.struct([
    loutil.publicKey('mint'),
    loutil.publicKey('owner'),
    u64('amount'),
    lo.u32('delegateOption'),
    loutil.publicKey('delegate'),
    lo.u8('state'),
    lo.u32('isNativeOption'),
    u64('isNative'),
    u64('delegatedAmount'),
    lo.u32('closeAuthorityOption'),
    loutil.publicKey('closeAuthority'),
]);
exports.AccountLayout = AccountLayout;

const RewardInfo = lo.struct([
    lo.u8("rewardState"),
    u64("openTime"),
    u64("endTime"),
    u64("lastUpdateTime"),
    u128("emissionsPerSecondX64"),
    u64("rewardTotalEmissioned"),
    u64("rewardClaimed"),
    loutil.publicKey("tokenMint"),
    loutil.publicKey("tokenVault"),
    loutil.publicKey("creator"),
    u128("rewardGrowthGlobalX64"),
]);
exports.RewardInfo = RewardInfo;

const PoolInfoLayout = lo.struct([
    lo.blob(8),
    lo.u8("bump"),
    loutil.publicKey("ammConfig"),
    loutil.publicKey("creator"),
    loutil.publicKey("mintA"),
    loutil.publicKey("mintB"),
    loutil.publicKey("vaultA"),
    loutil.publicKey("vaultB"),
    loutil.publicKey("observationId"),
    lo.u8("mintDecimalsA"),
    lo.u8("mintDecimalsB"),
    lo.u16("tickSpacing"),
    u128("liquidity"),
    u128("sqrtPriceX64"),
    lo.s32("tickCurrent"),
    lo.u16("observationIndex"),
    lo.u16("observationUpdateDuration"),
    u128("feeGrowthGlobalX64A"),
    u128("feeGrowthGlobalX64B"),
    u64("protocolFeesTokenA"),
    u64("protocolFeesTokenB"),

    u128("swapInAmountTokenA"),
    u128("swapOutAmountTokenB"),
    u128("swapInAmountTokenB"),
    u128("swapOutAmountTokenA"),

    lo.u8("status"),

    lo.seq(lo.u8(), 7, ""),

    lo.seq(RewardInfo, 3, "rewardInfos"),
    lo.seq(u64(), 16, 'tickArrayBitmap'),

    u64("totalFeesTokenA"),
    u64("totalFeesClaimedTokenA"),
    u64("totalFeesTokenB"),
    u64("totalFeesClaimedTokenB"),

    u64("fundFeesTokenA"),
    u64("fundFeesTokenB"),

    u64("startTime"),

    lo.seq(u64(), 15 * 4 - 3, "padding"),
]);
exports.PoolInfoLayout = PoolInfoLayout

exports.SPL_ACCOUNT_LAYOUT = lo.struct([
    loutil.publicKey("mint"),
    loutil.publicKey("owner"),
    u64("amount"),
    lo.u32("delegateOption"),
    loutil.publicKey("delegate"),
    lo.u8("state"),
    lo.u32("isNativeOption"),
    u64("isNative"),
    u64("delegatedAmount"),
    lo.u32("closeAuthorityOption"),
    loutil.publicKey("closeAuthority"),
  ]);

  const PositionRewardInfoLayout = lo.struct([
    u128("growthInsideLastX64"),
    u64("rewardAmountOwed"),
  ]);
  exports.PositionRewardInfoLayout = PositionRewardInfoLayout;
  exports.PositionInfoLayout = lo.struct([
    lo.blob(8),
    lo.u8("bump"),
    loutil.publicKey("nftMint"),
    loutil.publicKey("poolId"),
  
    lo.s32("tickLower"),
    lo.s32("tickUpper"),
    u128("liquidity"),
    u128("feeGrowthInsideLastX64A"),
    u128("feeGrowthInsideLastX64B"),
    u64("tokenFeesOwedA"),
    u64("tokenFeesOwedB"),
  
    lo.seq(PositionRewardInfoLayout, 3, "rewardInfos"),
  
    lo.seq(u64(), 8, ""),
  ]);