const { PublicKey } = require('@solana/web3.js');

exports.findProgramAddress = function(seeds, programId) {
  const [publicKey, nonce] = PublicKey.findProgramAddressSync(seeds, programId);
  return { publicKey, nonce };
}

exports.AccountMeta = function(publicKey, isSigner) {
  return {
    pubkey: publicKey,
    isWritable: true,
    isSigner,
  };
}

exports.AccountMetaReadonly = function(publicKey, isSigner) {
  return {
    pubkey: publicKey,
    isWritable: false,
    isSigner,
  };
}
