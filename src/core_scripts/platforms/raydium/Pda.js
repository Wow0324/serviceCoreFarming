const Addresses = require('../../../core_scripts/config/addresses.json');

const { PublicKey } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { findProgramAddress} = require("./Pubkey");
const { i32ToBytes, u16ToBytes } = require("./util");

const AMM_CONFIG_SEED = Buffer.from("amm_config", "utf8");
const POOL_SEED = Buffer.from("pool", "utf8");
const POOL_VAULT_SEED = Buffer.from("pool_vault", "utf8");
const POOL_REWARD_VAULT_SEED = Buffer.from("pool_reward_vault", "utf8");
const POSITION_SEED = Buffer.from("position", "utf8");
const TICK_ARRAY_SEED = Buffer.from("tick_array", "utf8");
const OPERATION_SEED = Buffer.from("operation", "utf8");

const METADATA_PROGRAM_ID = new PublicKey(Addresses.RaydiumMETA);

exports.getPdaAmmConfigId = function(programId, index) {
    return findProgramAddress(
        [AMM_CONFIG_SEED, u16ToBytes(index)],
        programId
    )
}

exports.getPdaPoolId = function(
    programId,
    ammConfigId,
    mintA,
    mintB
) {
    return findProgramAddress(
        [POOL_SEED, ammConfigId.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
        programId
    );
}

exports.getPdaPoolVaultId = function(
    programId,
    poolId,
    vaultMint
) {
    return findProgramAddress(
        [POOL_VAULT_SEED, poolId.toBuffer(), vaultMint.toBuffer()],
        programId
    );
}

exports.getPdaPoolRewardVaulId = function(
    programId,
    poolId,
    rewardMint
) {
    return findProgramAddress(
        [POOL_REWARD_VAULT_SEED, poolId.toBuffer(), rewardMint.toBuffer()],
        programId
    );
}

exports.getPdaTickArrayAddress = function(
    programId,
    poolId,
    startIndex
) {
    return findProgramAddress(
        [TICK_ARRAY_SEED, poolId.toBuffer(), i32ToBytes(startIndex)],
        programId
    );
};

exports.getPdaProtocolPositionAddress = function(
    programId,
    poolId,
    tickLower,
    tickUpper
) {
    return findProgramAddress(
        [
            POSITION_SEED,
            poolId.toBuffer(),
            i32ToBytes(tickLower),
            i32ToBytes(tickUpper),
        ],
        programId
    );
}

exports.getPdaPersonalPositionAddress = function(
    programId,
    nftMint
) {
    return findProgramAddress(
        [POSITION_SEED, nftMint.toBuffer()],
        programId
    );
}

exports.getPdaMetadataKey = function (mint) {
    return findProgramAddress(
        [
            Buffer.from('metadata', 'utf8'),
            METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
    )
}

exports.getPdaOperationAccount = function(
    programId,
) {
    return findProgramAddress(
        [OPERATION_SEED],
        programId
    );
}

exports.getATAAddress = function(owner, mint) {
    return findProgramAddress(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
  }