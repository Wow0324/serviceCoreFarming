
require('dotenv').config();
const express = require('express')
  , bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;

const { callPlatformMethods } = require("./core_scripts/index");
async function main(req) {


  let platform_res = {
    statusCode: 200,
    requestData: req,
    responseData: null
  }
  var req_access_token = req.access_token;
  let Access_Token = process.env.Access_Token;
  if (req_access_token != Access_Token) {
    platform_res["status"] = 400;
    platform_res["responseData"] = "Invalid access token";
    return platform_res;
  }
  var method = req.method;
  var platform = req.platform;
  var version = req.version;
  var address1, address2;
  var pair = req.pair;
  var pool = req.pool;
  var farm = req.farm;
  var tokenId = req.tokenId;
  var amount1 = 0;
  var amount2 = 0;
  var liquidity = 0;
  var rpc_url = "";
  var private_key = process.env.PRIVATEKEY;

  switch (platform) {
    case "testnetftmscan":
      rpc_url = process.env.FantomTestUrl;
      //https://testnet.ftmscan.com/address/0xfb1ea3760c69b7be86422a4661f47796d52ceb1b
      break;
    // PancakeSwap
    case "PancakeSwap":
      rpc_url = process.env.BscRpcUrl;
      //https://bscscan.com/address/0xfb1EA3760C69B7bE86422a4661f47796d52Ceb1B
      break;

    // UniSwap
    case "UniSwap":
      rpc_url = "https://arb1.croswap.com/rpc";
      //https://arbiscan.io/address/0xfb1EA3760C69B7bE86422a4661f47796d52Ceb1B
      break;

    // TradeJoe
    case "TradeJoe":
      rpc_url = process.env.AvalancheRpcUrl;

      //https://snowtrace.io/address/0xfb1EA3760C69B7bE86422a4661f47796d52Ceb1B
      break;
    // SushiSwap
    case "SushiSwap":
      rpc_url = process.env.EthereumRpcUrl;
      //https://etherscan.io/address/0xfb1EA3760C69B7bE86422a4661f47796d52Ceb1B
      break;
    // Raydium
    case "Raydium":
      rpc_url = process.env.SolonaDevnetRpcUrl;
      //https://solscan.io/account/FmpW4uaeZcLS6DYCgb6aXGjA9gr5TLLtBYwBBxeBpbNU
      break;
    // ORCA
    case "ORCA":
      rpc_url = "";
      break;
    // SUN.io
    case "SUN.io":
      rpc_url = process.env.TronscanRpcUrl;
      private_key = process.env.TronPRIVATEKEY;
      //https://tronscan.org/#/address/TW9P7KrpNGW1fRfMBm4MxGpCZNuNYMZaJb
      break;

    // SpookySwap
    case "SpookySwap":
      rpc_url = process.env.FantomRpcUrl;
      //https://ftmscan.com/address/0xfb1EA3760C69B7bE86422a4661f47796d52Ceb1B
      break;
    default:
      rpc_url = "";
      break;
  }
  let request = {};
  switch (method) {
    case "statusGet":
      address1 = req.address1;
      address2 = req.address2;
      request = { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url, version, tokenId };
      break;
    case "liquidityAdd":
      address1 = req.address1;
      address2 = req.address2;
      amount1 = req.amount1;
      amount2 = req.amount2;
      request = { platform, pair, method, pool, farm, address1, address2, amount1, amount2, private_key, rpc_url, version, tokenId };
      break;
    case "liquidityRemove":
      address1 = req.address1;
      address2 = req.address2;
      liquidity = req.liquidity;
      request = { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url, version, tokenId };
      break;
    case "farmingDeposit":
      address1 = req.address1;
      address2 = req.address2;
      liquidity = req.liquidity;
      request = { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url, version, tokenId };
      break;
    case "farmingHarvest":
      request = { platform, pair, method, pool, farm, private_key, rpc_url, version, tokenId };
      break;
    case "farmingWithdraw":
      address1 = req.address1;
      address2 = req.address2;
      liquidity = req.liquidity;
      request = { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url, version, tokenId };
      break;
    default:
      break;
  }
  platform_res = await callPlatformMethods(request);

  try {
    platform_res["requestData"]["private_key"] = "";
    delete platform_res["requestData"]["private_key"];
  }
  catch (err) { }
  return platform_res;
}

var app = express();

app.use(bodyParser.json());

app.post('/operate_platform', function (request, response) {
  var req = request.body;

  //platform_res = operate_platform(req).then();
  main(req)
    .then((res) => {
      console.error(res);
      response.send(res);
    })
    .catch((error) => {
      console.error(error);
      response.send(error);
    });
  //console.log(platform_res);
  //response.send(request.body);    // echo the result back
});

// Handle GET requests to /api http://localhost:3001/api
app.get("/api", (req, res) => {
  res.json({ "req": req.data, message: "Hello from server!  qqq" });
});

//================================solana test======================
/* ================= global public keys ================= */

// const SYSTEM_PROGRAM_ID = SystemProgram.programId;
// const MEMO_PROGRAM_ID = new PublicKey("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo");
// const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111')
// const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
// const INSTRUCTION_PROGRAM_ID = new PublicKey('Sysvar1nstructions1111111111111111111111111')

const web3 = require("@solana/web3.js");
const { SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const bs58 = require("bs58")
const splToken = require('@solana/spl-token');

const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

const Addresses = require('./core_scripts/config/addresses.json');
const MY_WALLET_ADDRESS = "EQK2EvtYdC3BG39oJkfDjtf8tr347PUaF1azYHqp73YC";

//================================stake======================
// async function GetTokenAccount(connection) {
//   const pubkey = new web3.PublicKey(MY_WALLET_ADDRESS);
//   // Get all validators, categorized by current (i.e. active) and deliquent (i.e. inactive)
//   const filters = [
//     {
//       dataSize: 165,    //size of account (bytes)
//     },
//     {
//       memcmp: {
//         offset: 32,     //location of our query in the account (bytes)
//         bytes: pubkey,  //our search criteria, a base58 encoded string
//       }
//     }
//   ];
//   // const accounts = await connection.getParsedProgramAccounts(
//   //   TOKEN_PROGRAM_ID,   //SPL Token Program, new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
//   //   { filters: filters }
//   // );
//   // console.log(accounts)


//   const owner = new web3.PublicKey(MY_WALLET_ADDRESS);
//   let response = await connection.getParsedTokenAccountsByOwner(owner, {
//     programId: TOKEN_PROGRAM_ID,
//   });
//   console.log(response)
//   response.value.forEach((accountInfo) => {
//     console.log(`pubkey: ${accountInfo.pubkey.toBase58()}`);
//     console.log(`mint: ${accountInfo.account.data["parsed"]["info"]["mint"]}`);
//     console.log(
//       `owner: ${accountInfo.account.data["parsed"]["info"]["owner"]}`
//     );
//     console.log(
//       `decimals: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["decimals"]}`
//     );
//     console.log(
//       `amount: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["amount"]}`
//     );
//     console.log("====================");
//   });
// }
// async function GetCurrentValidators(connection) {

//   // Get all validators, categorized by current (i.e. active) and deliquent (i.e. inactive)
//   const { current, delinquent } = await connection.getVoteAccounts();
//   console.log("current validators: ", current);
//   console.log("all validators: ", current.concat(delinquent));
// }

// async function GetTokenAccount1(connection) {

//   const tokenAccount1Pubkey = new web3.PublicKey("37sAdhEFiYxKnQAm7CPd5GLK1ZxWovqn3p87kKjfD44c");

//   const tokenAccount2Pubkey = new web3.PublicKey("CFEPU5Jd6DNj8gpjPLJ1d9i4xSJDGYNV7n6qw53zE3n1");
//   let tokenAccount = await splToken.getAccount(connection, tokenAccount1Pubkey);
//   console.log(tokenAccount);
// }

// async function CreateStakeAccount(connection) {

//   const wallet = firstWinWallet;//web3.Keypair.generate();

//   // // Fund our wallet with 1 SOL
//   // const airdropSignature = await connection.requestAirdrop(
//   //     wallet.publicKey,
//   //     web3.LAMPORTS_PER_SOL
//   // );
//   // await connection.confirmTransaction(airdropSignature);

//   // Create a keypair for our stake account
//   const stakeAccount = web3.Keypair.generate();

//   // Calculate how much we want to stake
//   const minimumRent = await connection.getMinimumBalanceForRentExemption(
//     web3.StakeProgram.space
//   );
//   console.log("minimumRent", minimumRent)
//   const amountUserWantsToStake = web3.LAMPORTS_PER_SOL / 2; // This is can be user input. For now, we'll hardcode to 0.5 SOL
//   const amountToStake = minimumRent + amountUserWantsToStake;
//   console.log("amountToStake", amountToStake)
//   // Setup a transaction to create our stake account
//   // Note: `StakeProgram.createAccount` returns a `Transaction` preconfigured with the necessary `TransactionInstruction`s
//   const createStakeAccountTx = web3.StakeProgram.createAccount({
//     authorized: new web3.Authorized(wallet.publicKey, wallet.publicKey), // Here we set two authorities: Stake Authority and Withdrawal Authority. Both are set to our wallet.
//     fromPubkey: wallet.publicKey,
//     lamports: amountToStake,
//     lockup: new web3.Lockup(0, 0, wallet.publicKey), // Optional. We'll set this to 0 for demonstration purposes.
//     stakePubkey: stakeAccount.publicKey,
//   });

//   const createStakeAccountTxId = await web3.sendAndConfirmTransaction(
//     connection,
//     createStakeAccountTx,
//     [
//       wallet,
//       stakeAccount, // Since we're creating a new stake account, we have that account sign as well
//     ]
//   );
//   console.log(`Stake account created. Tx Id: ${createStakeAccountTxId}`);

//   // Check our newly created stake account balance. This should be 0.5 SOL.
//   let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
//   console.log(`Stake account balance: ${stakeBalance / web3.LAMPORTS_PER_SOL} SOL`);

//   // Verify the status of our stake account. This will start as inactive and will take some time to activate.
//   let stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
//   console.log(`Stake account status: ${stakeStatus.state}`);

//   await DelegateStake(connection, stakeAccount);
// }
// async function DelegateStake(connection, stakeAccount) {

//   const wallet = firstWinWallet;//web3.Keypair.generate();
//   // Setup a transaction to create our stake account
//   // Note: `StakeProgram.createAccount` returns a `Transaction` preconfigured with the necessary `TransactionInstruction`s
//   // Check our newly created stake account balance. This should be 0.5 SOL.
//   let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
//   console.log(`Stake account balance: ${stakeBalance / web3.LAMPORTS_PER_SOL} SOL`);
//   // Verify the status of our stake account. This will start as inactive and will take some time to activate.
//   let stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
//   console.log(`Stake account status: ${stakeStatus.state}`);
//   // To delegate our stake, we first have to select a validator. Here we get all validators and select the first active one.
//   const validators = await connection.getVoteAccounts();
//   const selectedValidator = validators.current[0];
//   const selectedValidatorPubkey = new web3.PublicKey(selectedValidator.votePubkey);
//   // With a validator selected, we can now setup a transaction that delegates our stake to their vote account.
//   const delegateTx = web3.StakeProgram.delegate({
//     stakePubkey: stakeAccount.publicKey,
//     authorizedPubkey: wallet.publicKey,
//     votePubkey: selectedValidatorPubkey,
//   });

//   const delegateTxId = await web3.sendAndConfirmTransaction(connection, delegateTx, [
//     wallet,
//   ]);
//   console.log(
//     `Stake account delegated to ${selectedValidatorPubkey}. Tx Id: ${delegateTxId}`
//   );

//   // Check in on our stake account. It should now be activating.
//   stakeStatus = await connection.getStakeActivation(stakeAccount.publicKey);
//   console.log(`Stake account status: ${stakeStatus.state}`);
// }

// async function getProgramAccounts(connection) {
//   const STAKE_PROGRAM_ID = new web3.PublicKey(
//     "Stake11111111111111111111111111111111111111"
//   );
//   const wallet = firstWinWallet;
//   let accounts = await connection.getParsedProgramAccounts(STAKE_PROGRAM_ID, {
//     filters: [
//       {
//         dataSize: 200, // number of bytes
//       },
//       {
//         memcmp: {
//           offset: 124, // number of bytes
//           bytes: wallet.publicKey, // base58 encoded string
//         },
//       },
//     ],
//   });

//   console.log(`Accounts for program ${STAKE_PROGRAM_ID}: `);
//   console.log(
//     `Total number of delegators found for ${wallet.publicKey} is: ${accounts.length}`
//   );
//   if (accounts.length)
//     console.log(`Sample delegator:`, JSON.stringify(accounts[0]));


//   accounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
//     filters: [
//       {
//         dataSize: 200, // number of bytes
//       },
//       {
//         memcmp: {
//           offset: 124, // number of bytes
//           bytes: wallet.publicKey, // base58 encoded string
//         },
//       },
//     ],
//   });
//   console.log(`Accounts for program ${STAKE_PROGRAM_ID}: `);
//   console.log(accounts);


// }

// async function createTokenAccount(connection) {
//   // 5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8
//   var feePayer = web3.Keypair.fromSecretKey(
//     bs58.decode(
//       "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
//     )
//   );

//   // G2FAbFQPFa5qKXCetoFZQEvF9BVvCKbvUZvodpVidnoY
//   const alice = web3.Keypair.fromSecretKey(
//     bs58.decode(
//       "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
//     )
//   );
//   //const alice = firstWinWallet;
//   feePayer = firstWinWallet;
//   const mintPubkey = new web3.PublicKey(
//     "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
//   );

//   // 1) use build-in function
//   {
//     let ata = await splToken.createAssociatedTokenAccount(
//       connection, // connection
//       feePayer, // fee payer
//       mintPubkey, // mint
//       alice.publicKey // owner,
//     );
//     console.log(`ATA: ${ata.toBase58()}`);
//   }

//   // or

//   // 2) composed by yourself
//   {
//     // calculate ATA
//     let ata = await splToken.getAssociatedTokenAddress(
//       mintPubkey, // mint
//       alice.publicKey // owner
//     );
//     console.log(`ATA: ${ata.toBase58()}`);

//     // if your wallet is off-curve, you should use
//     // let ata = await getAssociatedTokenAddress(
//     //   mintPubkey, // mint
//     //   alice.publicKey // owner
//     //   true, // allowOwnerOffCurve
//     // );

//     let tx = new web3.Transaction().add(
//       splToken.createAssociatedTokenAccountInstruction(
//         feePayer.publicKey, // payer
//         ata, // ata
//         alice.publicKey, // owner
//         mintPubkey // mint
//       )
//     );
//     console.log(`txhash: ${await connection.sendTransaction(tx, [feePayer])}`);
//   }
// }

async function createNewToken(connection) {
  // 5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8
  const feePayer = web3.Keypair.fromSecretKey(
    bs58.decode(
      "RbAya5bV7VhwPmh3LGtDkVCaDnQRggRbRL4tXoWF6P5gapjVpsmv7dt3aKXkZuZnEJUxhKmHVLntASxndipKxAL"
    )
  );

  // G2FAbFQPFa5qKXCetoFZQEvF9BVvCKbvUZvodpVidnoY
  const alice = web3.Keypair.fromSecretKey(
    bs58.decode(
      "RbAya5bV7VhwPmh3LGtDkVCaDnQRggRbRL4tXoWF6P5gapjVpsmv7dt3aKXkZuZnEJUxhKmHVLntASxndipKxAL"
    )
  );

  // 1) use build-in function
  let mintPubkey = await splToken.createMint(
    connection, // connection
    feePayer, // fee payer
    alice.publicKey, // mint authority
    alice.publicKey, // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
    8 // decimals
  );
  console.log(`mint: ${mintPubkey.toBase58()}`);

  // or

  // 2) compose by yourself
  const mint = web3.Keypair.generate();
  console.log(`mint: ${mint.publicKey.toBase58()}`);

  let tx = new web3.Transaction().add(
    // create mint account
    web3.SystemProgram.createAccount({
      fromPubkey: feePayer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: await splToken.getMinimumBalanceForRentExemptMint(connection),
      programId: splToken.TOKEN_PROGRAM_ID,
    }),
    // init mint account
    splToken.createInitializeMintInstruction(
      mint.publicKey, // mint pubkey
      8, // decimals
      alice.publicKey, // mint authority
      alice.publicKey // freeze authority (you can use `null` to disable it. when you disable it, you can't turn it on again)
    )
  );
  console.log(
    `txhash: ${await connection.sendTransaction(tx, [feePayer, mint])}`
  );

}

// async function getTokenAccountOwner(connection) {
//   const tokenAccount = new web3.PublicKey(firstWinWallet.publicKey);

//   let response = await connection.getParsedTokenAccountsByOwner(tokenAccount, {
//     programId: TOKEN_PROGRAM_ID,
//   });
//   console.log("==========owner==========");
//   console.log("owner : ", response);
//   response.value.forEach((accountInfo) => {
//     console.log(`pubkey: ${accountInfo.pubkey.toBase58()}`);
//     console.log(`mint: ${accountInfo.account.data["parsed"]["info"]["mint"]}`);
//     console.log(
//       `owner: ${accountInfo.account.data["parsed"]["info"]["owner"]}`
//     );
//     console.log(
//       `decimals: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["decimals"]}`
//     );
//     console.log(
//       `amount: ${accountInfo.account.data["parsed"]["info"]["tokenAmount"]["amount"]}`
//     );
//     console.log("====================");
//   });
// }

//=========================================================



async function GetAccountInfo(connection) {
  const pubkey = new web3.PublicKey(MY_WALLET_ADDRESS);
  let account = await connection.getAccountInfo(pubkey);
  console.log(account);
}
const raydiumProgramId = new web3.PublicKey('7LmQWvXaR6j8h8AwhAS1eTfQrktgXXPN2NzsoGcFpXYN');
// async function getPoolAddresses(connection) {
//   // Get the account info for the program
//   const accountInfo = await connection.getAccountInfo(raydiumProgramId);

//   // Parse the data for the program
//   const data = accountInfo.data;
//   const poolsOffset = 22; // The offset in the data where the pool addresses start
//   const numPools = Math.floor((data.length - poolsOffset) / 32); // Each pool address is 32 bytes

//   // Extract the pool addresses from the data
//   const poolAddresses = [];
//   for (let i = 0; i < numPools; i++) {
//     const addressBytes = data.slice(poolsOffset + i * 32, poolsOffset + (i + 1) * 32);
//     const address = new PublicKey(addressBytes);
//     poolAddresses.push(address.toBase58());
//   }

//   console.log('Raydium AMM V3 pool addresses:', poolAddresses);
// }

async function getPoolAddresses(connection) {
  const serumDexPid = new web3.PublicKey('9QbVXgbzi1zmnS8uft1nDDKU6W4RgW45iGpLjNfZC4Hv');
  const programAccounts = await connection.getProgramAccounts(serumDexPid);
  // Find Raydium program account
  let raydiumProgramAccount = programAccounts.find(a => a.account.data[0] == 6);
  const raydiumProgramId = raydiumProgramAccount.pubkey;
  console.log("raydium program id:", raydiumProgramId);

  const raydiumProgram = new Program(raydiumProgramId.toBuffer(), RAYDIUM_PROGRAM_LAYOUT);
  const pools = await raydiumProgram.account.pool.all();
  console.log(pools.map(pool => pool.pubkeys.account.toString()));
}

const rayTokenSymbol = 'RAY';
const rayTokenName = 'Ray Token';
const rayTokenSupply = 1000000; // Initial supply of Ray tokens
const rayTokenMintable = true; // Set to false if the token is non-mintable

// async function createTokenAccount() {
//   // Create a random public key to associate with the new token account
//   const newAccount = Keypair.generate();

//   // Calculate the required space for the new token account (based on the size of the token state)
//   const balanceNeeded = await web3.getTokenMinimumBalanceForRentExemption(82);

//   // Build a transaction to create the new token account
//   const transaction = new web3.Transaction().add(
//     web3.SystemProgram.createAccount({
//       fromPubkey: account.publicKey,
//       newAccountPubkey: newAccount.publicKey,
//       lamports: balanceNeeded,
//       space: 82,
//       programId: TOKEN_PROGRAM_ID,
//     })
//   );

//   // Sign and send the transaction
//   const signature = await web3.sendTransaction(transaction, [account, newAccount]);
//   await web3.confirmTransaction(signature);

//   console.log(`New token account created: ${newAccount.publicKey.toBase58()}`);

//   return newAccount.publicKey;
// }

async function createRayToken(connection) {
  //Generate a new keypair for the token mint:
  // const keypair = web3.Keypair.fromSecretKey(
  //   bs58.decode(
  //     "RbAya5bV7VhwPmh3LGtDkVCaDnQRggRbRL4tXoWF6P5gapjVpsmv7dt3aKXkZuZnEJUxhKmHVLntASxndipKxAL"
  //   )
  // );

  const keypair = web3.Keypair.generate();
  console.log(`Keypair generated: ${JSON.stringify(keypair)}`);
  console.log(`public key: ${keypair.publicKey.toString()}`);

  //Create a new token mint account:
  try {
    const mint = await splToken.createMint(
      connection,
      keypair,
      keypair.publicKey,
      null,
      9,
      TOKEN_PROGRAM_ID
    );
  } catch (err) {
    console.log(`err::`, err)
  }
  console.log(`New mint account created: ${mint.publicKey.toBase58()}`);

  //To make sure that your wallet contains SOL token, check the balance:
  const solBalance = await connection.getBalance(keypair.publicKey);
  console.log(`Wallet balance: ${web3.LAMPORTS_PER_SOL * solBalance} SOL`);

  //Mint some Ray tokens:
  //const recipientPublicKey = web3.PublicKey.generate();
  const recipientPublicKey = Addresses.RaydiumRay;
  const rayAmount = 1000000000; // 1 Ray

  await mint.mintTo(
    keypair.publicKey, // Mint authority
    recipientPublicKey, // Recipient public key
    [], // Multi-signature signers
    rayAmount // Amount of Ray tokens to mint
  );

  console.log(`Minted ${rayAmount} Ray tokens to ${recipientPublicKey.toBase58()}`);

  //Finally, check the balance of the recipient:
  const tokenAccount = await mint.getAccountInfo(recipientPublicKey);
  console.log(`Recipient's balance: ${tokenAccount.amount.toNumber()} Ray`);
}

async function testAirDrop(connection) {
  const pubkey = new web3.PublicKey(MY_WALLET_ADDRESS);
  const signature = await connection.requestAirdrop(
    pubkey,
    LAMPORTS_PER_SOL
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature
  });
}
var private_key = process.env.SolanaPRIVATEKEY;
let secretKey = bs58.decode(private_key);
let firstWinWallet = web3.Keypair.fromSecretKey(secretKey);
async function test() {
  var private_key = process.env.SolanaPRIVATEKEY;
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"), "confirmed");

  //airdrop
  // await testAirDrop(connection);

  //get owner
  // await GetAccountInfo(connection);

  //create token
  await createRayToken(connection);
  //get pool addresses
  //await getPoolAddresses(connection);
  //await createNewToken(connection);

  // let balance1 = await connection.getBalance(firstWinWallet.publicKey);
  // console.log(` balanace : ${balance1 / web3.LAMPORTS_PER_SOL} SOL`);
  return "---------end----------";
}
app.listen(PORT, () => {
  test()
    .then((res) => {
      console.error(res);

    })
    .catch((error) => {
      console.error(error);

    });
});
//node index.js

