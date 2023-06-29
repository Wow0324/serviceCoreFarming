const bs58 = require("bs58")
const splToken = require('@solana/spl-token');
const Addresses = require('../../core_scripts/config/addresses.json');
const ethers = require("ethers");
const lo = require('@solana/buffer-layout');
var fs = require('fs');
var data = fs.readFileSync(__dirname + "/abi/RaydiumCLMMPools.json", 'utf-8');
const apiPoolInfo = JSON.parse(data).data;

const {
    getTickArrayStartIndexByTick
} = require("./raydium/TickUtils");

const {
    u128, u64
} = require("./raydium/util");

const {
    getPdaMetadataKey, 
    getPdaPersonalPositionAddress,
    getPdaProtocolPositionAddress, 
    getPdaTickArrayAddress,
    getATAAddress
} = require("./raydium/Pda");

const {
    SystemProgram,
    Keypair,
    PublicKey,
    Transaction,
    Connection,
    TransactionInstruction,
    clusterApiUrl,
    sendAndConfirmTransaction
} = require("@solana/web3.js");

const {
    RaydiumGetAddressFromPairName,
    RaydiumGetFeeFromPairName
} = require("./utils/getAddressFn");

const { 
    AccountLayout, 
    SPL_ACCOUNT_LAYOUT, 
    PositionInfoLayout, 
    PoolInfoLayout 
} = require("./raydium/Layout");

const { Spl } = require("./raydium/SPL");
const Decimal = require("decimal.js");
const BN = require("bn.js");
const { 
    SqrtPriceMath, 
    LiquidityMath, 
    TickMath 
} = require("./raydium/math");

const SYSTEM_PROGRAM_ID = SystemProgram.programId;
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111')
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const TokenWSol = new PublicKey(Addresses.RaydiumWSOL);

//=========================================================
exports.statusGet = async (req) => {
    console.log("calling statusGet");

    const { pair, private_key, pool, farm } = req;

    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    //set owner
    let secretKey = bs58.decode(private_key);
    let owner = Keypair.fromSecretKey(secretKey);

    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    //get pair token address
    const { addr1, addr2 } = RaydiumGetAddressFromPairName(pair);
    const { poolIdPublicKey } = RaydiumGetPoolInfoFromPairName(pair);
    //get Balance
    let balance1 = await connection.getBalance(owner.publicKey);

    res["responseData"] = {
        wallet_balance: balance1,
        pairAddr: poolIdPublicKey.toString(),
        address1: addr1,
        address2: addr2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: "", // pool liquidity
            sqrtPriceX64: "",
            tickCurrent: "",
            volume: "", // pool volume
            LPTokens: "" // LP tokens
        },
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: "", // 
            LTV: "", //  
            deposit_value: "", // my deposit value
            reward_value: "" // my reward value
        }
    }

    if (pool == "1") {
        //get pool account information
        var poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);
        //get tocken accounts
        const { tokenAccounts } = await getWalletTokenAccounts(connection, owner);
        //get position information
        var positionInfos = await getOwnerPositions(connection, poolInfo, tokenAccounts, pair);
   
        //set response
        res["responseData"]["pool"]["liquidity"] = poolInfo.liquidity;
        res["responseData"]["pool"]["sqrtPriceX64"] = poolInfo.sqrtPriceX64;
        res["responseData"]["pool"]["tickCurrent"] = poolInfo.tickCurrent;
        res["responseData"]["pool"]["LPTokens"] = positionInfos;
    }

    return res;
};
exports.liquidityAdd = async (req) => {
    console.log("calling liquidityAdd CLMM");
    const { platform, pair, method, pool, farm, amount1, amount2, private_key, positionId, priceLower, priceUpper } = req;
    
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    let secretKey = bs58.decode(private_key);
    let owner = Keypair.fromSecretKey(secretKey);

    const { addr1, addr2 } = RaydiumGetAddressFromPairName(pair);
    const { poolIdPublicKey, useSOLBalance } = RaydiumGetPoolInfoFromPairName(pair);
    var poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);

    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    res["responseData"] = {
        address1: addr1,
        address2: addr2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolInfo.liquidity, // pool liquidity
            volume: "", // pool volume
            liquidity_value: 0 // my liquidity value
        },
        farm: null
    }

    if (positionId == "") {
        //create position and add liquidity
        console.log("create position and add liquidity");

        try{
            //create Token account and init account
            const { allTokenAccounts : tokenAccounts } = await getWalletTokenAccounts(connection, owner);
                    
            var slippage = 0.015;
            const { innerTransactions, address } = await makeOpenPositionInstructionSimple(connection, poolInfo, owner.publicKey, owner.publicKey, tokenAccounts, useSOLBalance, priceLower, priceUpper, amount1, amount2, slippage)

            let tx = new Transaction();
            for (const transaction of innerTransactions.instructions) {
                tx.add(transaction);
            } 

            // console.log('nft mint address : ', address.nftMint);
            var signers = innerTransactions.signers;

            console.log(
                `create random token account txhash: ${await sendAndConfirmTransaction(connection, tx, [owner, ...signers])}`
            );

            var price1 = await getPrictToUsdt(connection, addr1);
            var price2 = await getPrictToUsdt(connection, addr2);

            var liquidity1 = amount1 * parseFloat(price1);
            var liquidity2 = amount2 * parseFloat(price2);

            res["responseData"]['result'] = { 
                positionId: address.nftMint, 
                liquidity: liquidity1 + liquidity2, 
                amount0: liquidity1, 
                amount1: liquidity2 
            };
        }
        catch (err) {
            console.log(err);
            res["statusCode"] = 400;
            res["error_reason"] = "Failed to send transaction";
        }
        return res;
    }
    else {
        //increase liquidity
        console.log("increase liquidity");
        try{
            //get owner position information
            const { tokenAccounts } = await getWalletTokenAccounts(connection, owner);
            var positionInfos = await getOwnerPositions(connection, poolInfo, tokenAccounts, pair);

            var ownerPosition = positionInfos.filter((pos) => pos.positionId == positionId);
            if(ownerPosition == undefined || ownerPosition.length == 0){
                res["statusCode"] = 400;
                res["error_reason"] = "Position does not exist.";
                console.log(res);
                return res;
            }
            
            console.log("owner position : ", ownerPosition[0].tickLower);
            //calculate origianl amount and re-calculate liquidity
            const priceLower = getTickPrice(
                poolInfo.mintDecimalsA,
                poolInfo.mintDecimalsB,
                ownerPosition[0].tickLower,
                true
            )

            const priceUpper = getTickPrice(
                poolInfo.mintDecimalsA,
                poolInfo.mintDecimalsB,
                ownerPosition[0].tickUpper,
                true
            )

            var liquidity = new BN(ownerPosition[0].liquidity1);
            var tickSqrtPriceX64Lower = new BN(priceLower.tickSqrtPriceX64);
            var tickSqrtPriceX64Upper = new BN(priceUpper.tickSqrtPriceX64);            
            var sqrtPriceX64 = new BN(String(poolInfo.sqrtPriceX64));
            
            var { amountA : originalAmountA, amountB:originalAmountB } = LiquidityMath.getAmountsFromLiquidity(sqrtPriceX64, tickSqrtPriceX64Lower, tickSqrtPriceX64Upper, liquidity, false)
            
            originalAmountA = parseFloat(ethers.utils.formatUnits(String(originalAmountA), poolInfo.mintDecimalsA))
            originalAmountB = parseFloat(ethers.utils.formatUnits(String(originalAmountB), poolInfo.mintDecimalsB))
            
            var newAmountA = parseFloat(amount1) + originalAmountA;
            var newAmountB = parseFloat(amount2) + originalAmountB;
          
            //make increaseLiquidity instructions
            var slippage = 0.015;
            const { innerTransactions, address } = await makeIncreaseLiquidityInstructionSimple(connection, poolInfo, ownerPosition[0], owner.publicKey, owner.publicKey, tokenAccounts, useSOLBalance, newAmountA, newAmountB, slippage)

            let tx = new Transaction();
            for (const transaction of innerTransactions.instructions) {
                tx.add(transaction);
            } 

            var signers = innerTransactions.signers;
            console.log(
                `create random token account txhash: ${await sendAndConfirmTransaction(connection, tx, [owner, ...signers])}`
            );
         
            var price1 = await getPrictToUsdt(connection, addr1);
            var price2 = await getPrictToUsdt(connection, addr2);

            var liquidity1 = newAmountA * parseFloat(price1);
            var liquidity2 = newAmountB * parseFloat(price2);

            res["responseData"]['result'] = { 
                positionId: positionId, 
                liquidity: liquidity1 + liquidity2, 
                amount0: liquidity1, 
                amount1: liquidity2 
            };
        }
        catch (err) {
            console.log(err);
            res["statusCode"] = 400;
            // res["error_reason"] = "Failed to send transaction";
        }
        return res;
    }
};
exports.liquidityRemove = async (req) => {
    console.log("calling liquidityRemove");
    const { platform, pair, method, pool, farm, private_key, positionId } = req;

    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    let secretKey = bs58.decode(private_key);
    let owner = Keypair.fromSecretKey(secretKey);

    const { addr1, addr2 } = RaydiumGetAddressFromPairName(pair);
    const { poolIdPublicKey, useSOLBalance } = RaydiumGetPoolInfoFromPairName(pair);
    var poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);
    
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    res["responseData"] = {
        address1: addr1,
        address2: addr2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolInfo.liquidity, // pool liquidity
            volume: "", // pool volume
            liquidity_value: 0 // my liquidity value
        },
        farm: null
    }

    try {
        //get owner position information
        const { tokenAccounts } = await getWalletTokenAccounts(connection, owner);
        var positionInfos = await getOwnerPositions(connection, poolInfo, tokenAccounts, pair);

        var ownerPosition = positionInfos.filter((pos) => pos.positionId == positionId);
        if(ownerPosition == undefined || ownerPosition.length == 0){
            res["statusCode"] = 400;
            res["error_reason"] = "Position does not exist.";
            console.log(res);
            return res;
        }

        //make increaseLiquidity instructions
        var slippage = 0.015;
        const { innerTransactions, address } = await makeDecreaseLiquidityInstructionSimple(
            {
                connection, 
                poolInfo, 
                ownerPosition : ownerPosition[0], 
                feePayer : owner.publicKey, 
                wallet : owner.publicKey,
                tokenAccounts, 
                useSOLBalance, 
                closePosition : true, 
                liquidity : ownerPosition[0].liquidity1, 
                amountMinA : 0, 
                amountMinB : 0, 
                slippage, 
                checkCreateATAOwner : true
            }
        )

        let tx = new Transaction();
        for (const transaction of innerTransactions.instructions) {
            tx.add(transaction);
           console.log(transaction)
        } 

        console.log(
            `create random token account txhash: ${await sendAndConfirmTransaction(connection, tx, [owner, ...innerTransactions.signers])}`
        );
        res["responseData"]['result'] = { 
            positionId: positionId, 
            liquidity: 0, 
            amount0: 0, 
            amount1: 0 };
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
};
exports.farmingDeposit = async (req) => {
    console.log("calling farmingDeposit");
};
exports.farmingHarvest = async (req) => {
    console.log("calling farmingHarvest");
    const { platform, pair, method, pool, farm, private_key, positionId } = req;

    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    let secretKey = bs58.decode(private_key);
    let owner = Keypair.fromSecretKey(secretKey);

    const { addr1, addr2 } = RaydiumGetAddressFromPairName(pair);
    const { poolIdPublicKey, useSOLBalance } = RaydiumGetPoolInfoFromPairName(pair);
    var poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);
    
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    res["responseData"] = {
        address1: addr1,
        address2: addr2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolInfo.liquidity, // pool liquidity
            volume: "", // pool volume
            liquidity_value: 0 // my liquidity value
        },
        farm: null
    }

    try {
        //get owner position information
        const { tokenAccounts } = await getWalletTokenAccounts(connection, owner);
        var positionInfos = await getOwnerPositions(connection, poolInfo, tokenAccounts, pair);

        var ownerPosition = positionInfos.filter((pos) => pos.positionId == positionId);
        if(ownerPosition == undefined || ownerPosition.length == 0){
            res["statusCode"] = 400;
            res["error_reason"] = "Position does not exist.";
            console.log(res);
            return res;
        }

        //make increaseLiquidity instructions
        var slippage = 0.015;
        const { innerTransactions, address } = await makeDecreaseLiquidityInstructionSimple(
            {
                connection, 
                poolInfo, 
                ownerPosition:ownerPosition[0], 
                feePayer : owner.publicKey,
                wallet : owner.publicKey,
                tokenAccounts, 
                useSOLBalance, 
                closePosition : false, 
                liquidity : 0, 
                slippage, 
                checkCreateATAOwner :true
            }
        )

        let tx = new Transaction();
        for (const transaction of innerTransactions.instructions) {
            tx.add(transaction);
           console.log(transaction)
        } 

        console.log(
            `create random token account txhash: ${await sendAndConfirmTransaction(connection, tx, [owner, ...innerTransactions.signers])}`
        );
        res["responseData"]['result'] = { 
            positionId: positionId, 
            liquidity: ownerPosition[0].liquidity1, 
            amount0: 0, 
            amount1: 0 };
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
};

exports.farmingWithdraw = async (req) => {
    console.log("calling farmingWithdraw");
};

//get pool id and useSolBalance from Pair name
function RaydiumGetPoolInfoFromPairName(pair) {
    console.log(`calling get pool info from pair name ${pair}`);

    var id = "";
    var useSOLBalance = true;

    switch (pair) {
        case "SOL-USDC":
            id = apiPoolInfo[0].id;
            break;
        case "USDC-USDT":
            id = apiPoolInfo[1].id;
            useSOLBalance = false;
            break;
        case "RAY-USDC":
            id = apiPoolInfo[2].id;
            useSOLBalance = false;
            break;
        case "SOL-RAY":
            id = apiPoolInfo[3].id;
            break;
        default:
            break;
    }
    var poolIdPublicKey = new PublicKey(id);
    res = { poolIdPublicKey, useSOLBalance };
    return res;
}

//get pool information from pool id
async function getPoolInfoFromPoolId(connection, poolIdPublicKey) {

    var poolAccountInfo = await connection.getAccountInfo(poolIdPublicKey);
    var poolInfo = "";
    if (poolAccountInfo === null) {
        console.log(`Account does not exist`);
    } else {
        poolInfo = PoolInfoLayout.decode(poolAccountInfo.data);
    }
    poolInfo.id = poolIdPublicKey;
    poolInfo.accountOwner = poolAccountInfo.owner;
    
    var price = SqrtPriceMath.sqrtPriceX64ToPrice(new BN(String(poolInfo.sqrtPriceX64)), poolInfo.mintDecimalsA, poolInfo.mintDecimalsB);
    poolInfo.price = price;

    var programId = new PublicKey(Addresses.RaydiumCLMM);
    poolInfo.programId = programId;
    return poolInfo;
}

//get price per usdt
async function getPrictToUsdt(connection, tokenAddress){
    var price = 1;
    var poolInfo;

    switch(tokenAddress){
        case Addresses.RaydiumWSOL:
            var { poolIdPublicKey } = RaydiumGetPoolInfoFromPairName("SOL-USDC");
            poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);
            price = poolInfo.price;
            break;
        case Addresses.RaydiumRay:
            var { poolIdPublicKey } = RaydiumGetPoolInfoFromPairName("RAY-USDC");
            poolInfo = await getPoolInfoFromPoolId(connection, poolIdPublicKey);
            price = poolInfo.price;
            break;
        default:
            break;
    }
    return price;
}

//get owner token accounts
async function getWalletTokenAccounts(connection, owner){
    //get token account information
    const solReq = connection.getAccountInfo(owner.publicKey);
    const tokenReq = connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID });
    const [solResp, tokenResp] = await Promise.all([solReq, tokenReq]);

    const rawInfos = []
    var accounts = []

    for (const { pubkey, account } of tokenResp.value) {
        // double check layout length
        if (account.data.length !== SPL_ACCOUNT_LAYOUT.span) {
            console.log('invalid token account layout length', 'publicKey', pubkey.toBase58());
            return;
        }

        const rawResult = SPL_ACCOUNT_LAYOUT.decode(account.data)
        const { mint, amount } = rawResult

        const associatedTokenAddress = await getATAAddress(owner.publicKey, mint).publicKey;

        accounts.push({
            publicKey: pubkey,
            mint,
            isAssociated: associatedTokenAddress.equals(pubkey),
            amount,
            isNative: false
          })
          rawInfos.push({ pubkey, accountInfo: rawResult })
    }
    // accounts.push({
    //     amount: toBN(solResp ? String(solResp.lamports) : 0),
    //     isNative: true
    //   })
    return {
        tokenAccountRawInfos: rawInfos,
        nativeTokenAccount: accounts.find((ta) => ta.isNative),
        tokenAccounts: accounts.filter((ta) => ta.isAssociated),
        allTokenAccounts: accounts
      }
}

//get my position spl tokens
async function getOwnerPositions(connection, poolInfo, tokenAccounts, pair){
    var positionInfos = []
    for (const { pubkey, mint, amount } of tokenAccounts) {
        if (amount == 1) {
            const positionPublicKey = getPdaPersonalPositionAddress(poolInfo.accountOwner, mint).publicKey;
            const positionAccountInfo = await connection.getAccountInfo(positionPublicKey)
            const positionInfo = PositionInfoLayout.decode(positionAccountInfo.data)
            if (positionInfo.poolId.equals(poolInfo.id)) {

                const priceLower = getTickPrice(
                    poolInfo.mintDecimalsA,
                    poolInfo.mintDecimalsB,
                    positionInfo.tickLower,
                    true
                )

                const priceUpper = getTickPrice(
                    poolInfo.mintDecimalsA,
                    poolInfo.mintDecimalsB,
                    positionInfo.tickUpper,
                    true
                )

                var liquidity = new BN(positionInfo.liquidity);
                var tickSqrtPriceX64Lower = new BN(priceLower.tickSqrtPriceX64);
                var tickSqrtPriceX64Upper = new BN(priceUpper.tickSqrtPriceX64);
                var sqrtPriceX64 = new BN(String(poolInfo.sqrtPriceX64));
                

                var { amountA, amountB } = LiquidityMath.getAmountsFromLiquidity(sqrtPriceX64, tickSqrtPriceX64Lower, tickSqrtPriceX64Upper, liquidity, false)
                amountA = parseFloat(ethers.utils.formatUnits(String(amountA), poolInfo.mintDecimalsA))
                amountB = parseFloat(ethers.utils.formatUnits(String(amountB), poolInfo.mintDecimalsB))
                const leverage = 1 / (1 - Math.sqrt(Math.sqrt(priceLower.price.div(priceUpper.price).toNumber())))

                if (pair == "USDC-USDT") {
                    liquidity = amountA + amountB;
                }
                else if (pair == "SOL-RAY") {
                    var price = await getPrictToUsdt(connection, Addresses.RaydiumRay);
                    //set liquidity
                    liquidity = (parseFloat(poolInfo.price) * amountA + amountB) * parseFloat(price);
                }
                else {
                    liquidity = parseFloat(poolInfo.price) * amountA + amountB;
                }
                // console.log(positionInfo);
                positionInfos.push({
                    positionId: positionInfo.nftMint,
                    priceLower: priceLower.price,
                    priceUpper: priceUpper.price,
                    tickLower: parseInt(positionInfo.tickLower),
                    tickUpper: parseInt(positionInfo.tickUpper),
                    liquidity1: positionInfo.liquidity,
                    rewardInfos: positionInfo.rewardInfos,
                    liquidity: liquidity,
                    leverage: leverage,
                    amountA: amountA,
                    amountB: amountB,
                })
            }
        }
    }
    return positionInfos;
}
//make openPosition instructions
async function makeOpenPositionInstructionSimple(connection, poolInfo, feePayer, wallet, tokenAccounts, useSOLBalance, priceLower, priceUpper, amount1, amount2, slippage) {
    const instructions =  [];
    const endInstructions =  [];
    const signers = [];

    //calculate tickLower and tickUpper
    const { tick: priceLowerTick } = getPriceAndTick(poolInfo, new Decimal(priceLower), true);
    const { tick: priceUpperTick } = getPriceAndTick(poolInfo, new Decimal(priceUpper), true);

    //calculate liquidity and amountSlippage
    var amount1BN = new BN(amount1 * Math.pow(10, poolInfo.mintDecimalsA))
    var amount2BN = new BN(amount2 * Math.pow(10, poolInfo.mintDecimalsB))

    const {liquidity, amountSlippageA, amountSlippageB} = getLiquidityFromAmounts(poolInfo, priceLowerTick, priceUpperTick, amount1BN, amount2BN, slippage, true);

    //create or select token account
    const mintAUseSOLBalance = useSOLBalance && poolInfo.mintA.equals(TokenWSol)
    const mintBUseSOLBalance = useSOLBalance && poolInfo.mintB.equals(TokenWSol)

    const ownerTokenAccountA = await selectOrCreateTokenAccount({
        mint: poolInfo.mintA,
        tokenAccounts: mintAUseSOLBalance ? [] : tokenAccounts,
        owner: wallet,
  
        createInfo: mintAUseSOLBalance ? {
          connection,
          payer: feePayer,
          amount: amountSlippageA,
  
          instructions,
          endInstructions,
          signers
        } : undefined,
  
        associatedOnly: mintAUseSOLBalance ? false : true
      })
      
     const ownerTokenAccountB = await selectOrCreateTokenAccount({
        mint: poolInfo.mintB,
        tokenAccounts: mintBUseSOLBalance ? [] : tokenAccounts,
        owner: wallet,
  
        createInfo: mintBUseSOLBalance ? {
          connection,
          payer: feePayer,
          amount: amountSlippageB,
  
          instructions,
          endInstructions,
          signers
        } : undefined,
  
        associatedOnly: mintBUseSOLBalance ? false : true
      })

      if(ownerTokenAccountA == undefined || ownerTokenAccountA == undefined){
        console.log("cannot found target token accounts");
        return;
      }
      
    const makeOpenPositionInstructions = await makeOpenPositionInstruction({
        poolInfo,
        feePayer,
        wallet,
        tokenAccountA: ownerTokenAccountA,
        tokenAccountB: ownerTokenAccountB,
        tickLower : priceLowerTick,
        tickUpper : priceUpperTick,
        liquidity,
        amountSlippageA,
        amountSlippageB,
      });

      return {
        address: makeOpenPositionInstructions.address,
        innerTransactions: 
          {
            instructions: [...instructions, ...makeOpenPositionInstructions.innerTransaction.instructions, ...endInstructions],
            signers: [...signers, ...makeOpenPositionInstructions.innerTransaction.signers]
          }
      }
}

async function makeIncreaseLiquidityInstructionSimple(
    connection, poolInfo, ownerPosition, feePayer, wallet, tokenAccounts, useSOLBalance, amount1, amount2, slippage, associatedOnly = true
  ) 
  {
    const instructions = [];
    const endInstructions = [];
    const signers = []

    //calculate liquidity and amountSlippage
    var amount1BN = new BN(amount1 * Math.pow(10, poolInfo.mintDecimalsA))
    var amount2BN = new BN(amount2 * Math.pow(10, poolInfo.mintDecimalsB))

    const {liquidity, amountSlippageA, amountSlippageB} = getLiquidityFromAmounts(poolInfo, ownerPosition.tickLower, ownerPosition.tickUpper, amount1BN, amount2BN, slippage, true);

    const mintAUseSOLBalance = useSOLBalance && poolInfo.mintA.equals(TokenWSol)
    const mintBUseSOLBalance = useSOLBalance && poolInfo.mintB.equals(TokenWSol)
    const ownerTokenAccountA = await selectOrCreateTokenAccount({
      mint: poolInfo.mintA,
      tokenAccounts: mintAUseSOLBalance ? [] : tokenAccounts,
      owner: wallet,

      createInfo: mintAUseSOLBalance ? {
        connection,
        payer: feePayer,
        amount: amountSlippageA,

        instructions,
        endInstructions,
        signers
      } : undefined,

      associatedOnly: mintAUseSOLBalance ? false : true,
      checkCreateATAOwner : false
    })

    const ownerTokenAccountB = await selectOrCreateTokenAccount({
      mint: poolInfo.mintB,
      tokenAccounts: mintBUseSOLBalance ? [] : tokenAccounts,
      owner: wallet,

      createInfo: mintBUseSOLBalance ? {
        connection,
        payer: feePayer,
        amount: amountSlippageB,

        instructions,
        endInstructions,
        signers
      } : undefined,

      associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
      checkCreateATAOwner : false
    })

    if(ownerTokenAccountA == undefined || ownerTokenAccountB == undefined){
        console.log("cannot found target token accounts");
        return;
      }

    const makeIncreaseLiquidityInstructions = await makeIncreaseLiquidityInstruction({
      poolInfo,
      ownerPosition,
      wallet: wallet,
      tokenAccountA: ownerTokenAccountA,
      tokenAccountB: ownerTokenAccountB,
      liquidity,
      amountSlippageA,
      amountSlippageB
    });

    return {
      address: makeIncreaseLiquidityInstructions.address,
      innerTransactions:
        {
          instructions: [...instructions, ...makeIncreaseLiquidityInstructions.innerTransaction.instructions, ...endInstructions],
          signers: [...signers, ...makeIncreaseLiquidityInstructions.innerTransaction.signers]
        }
    }
  }
async function makeDecreaseLiquidityInstructionSimple(
    {connection, poolInfo, ownerPosition, feePayer, wallet, tokenAccounts, useSOLBalance, closePosition, liquidity, amountMinA, amountMinB, slippage, associatedOnly = true, checkCreateATAOwner = false}
  ) {
    
    const instructions = [];
    const endInstructions = [];
    const signers = []

    let _amountMinA
    let _amountMinB
    if (amountMinA !== undefined && amountMinB !== undefined) {
      _amountMinA = amountMinA
      _amountMinB = amountMinB
    } else {
    //   const { amountSlippageA, amountSlippageB } =
    //     LiquidityMath.getAmountsFromLiquidityWithSlippage(
    //       poolInfo.sqrtPriceX64,
    //       SqrtPriceMath.getSqrtPriceX64FromTick(ownerPosition.tickLower),
    //       SqrtPriceMath.getSqrtPriceX64FromTick(ownerPosition.tickUpper),
    //       liquidity,
    //       false,
    //       true,
    //       slippage ?? 0
    //     );
      _amountMinA = 0
      _amountMinB = 0
    }
    
    const mintAUseSOLBalance = useSOLBalance && poolInfo.mintA.equals(TokenWSol)
    const mintBUseSOLBalance = useSOLBalance && poolInfo.mintB.equals(TokenWSol)

    const ownerTokenAccountA = await selectOrCreateTokenAccount({
      mint: poolInfo.mintA,
      tokenAccounts: mintAUseSOLBalance ? [] : tokenAccounts,
      owner: wallet,

      createInfo: {
        connection,
        payer: feePayer,
        amount: 0,

        instructions,
        endInstructions: mintAUseSOLBalance ? endInstructions : [],
        signers
      },

      associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
      checkCreateATAOwner,
    })

    const ownerTokenAccountB = await selectOrCreateTokenAccount({
      mint: poolInfo.mintB,
      tokenAccounts: mintBUseSOLBalance ? [] : tokenAccounts,
      owner: wallet,

      createInfo: {
        connection,
        payer: feePayer,
        amount: 0,

        instructions,
        endInstructions: mintBUseSOLBalance ? endInstructions : [],
        signers
      },

      associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
      checkCreateATAOwner,
    })
    
    const rewardAccounts = []
    
    for (const itemReward of poolInfo.rewardInfos) {
      const rewardUseSOLBalance = useSOLBalance && itemReward.tokenMint.equals(TokenWSol)
        if(!itemReward.tokenMint.equals(new PublicKey("11111111111111111111111111111111"))){
            const ownerRewardAccount = await selectOrCreateTokenAccount({
                mint: itemReward.tokenMint,
                tokenAccounts: rewardUseSOLBalance ? [] : tokenAccounts,
                owner: wallet,
        
                createInfo: {
                  connection,
                  payer: feePayer,
                  amount: 0,
        
                  instructions,
                  endInstructions: rewardUseSOLBalance ? endInstructions : [],
                  signers
                },
        
                associatedOnly: rewardUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
              })
              rewardAccounts.push(ownerRewardAccount)
        }
      
    }
    
    if(ownerTokenAccountA == undefined || ownerTokenAccountB == undefined){
        console.log("cannot found target token accounts");
        return;
      }

    const makeDecreaseLiquidityInstructions = await makeDecreaseLiquidityInstruction({
      poolInfo,
      ownerPosition,
      wallet,
      tokenAccountA: ownerTokenAccountA,
      tokenAccountB: ownerTokenAccountB,
      ownerRewardAccounts : rewardAccounts,
      liquidity,
      amountMinA: _amountMinA,
      amountMinB: _amountMinB
    })

    const makeClosePositionInstructions = closePosition ? await makeClosePositionInstruction({
      poolInfo, wallet, closePosition, ownerPosition
    }) : { address: {}, innerTransaction: { instructions: [], signers: []} }
    
    return {
      address: makeDecreaseLiquidityInstructions.address,
      innerTransactions: 
        {
          instructions: [...instructions, ...makeDecreaseLiquidityInstructions.innerTransaction.instructions, ...endInstructions, ...makeClosePositionInstructions.innerTransaction.instructions],
          signers: [...signers, ...makeDecreaseLiquidityInstructions.innerTransaction.signers]
        }
    }
  }


//select or create token account
async function selectOrCreateTokenAccount(params){
    console.log("select or create token account");

    const { mint, tokenAccounts, createInfo, associatedOnly, owner, checkCreateATAOwner } = params
    const ata = Spl.getAssociatedTokenAccount({ mint, owner });
    const accounts = tokenAccounts.filter((i) => i.mint.equals(mint) && (!associatedOnly || i.publicKey.equals(ata))).sort((a, b) => (a.amount.lt(b.amount) ? 1 : -1))
    // find token or don't need create
    if (createInfo === undefined || accounts.length > 0) {
      return accounts.length > 0 ? accounts[0].publicKey : undefined
    }

    if (associatedOnly) {
      const _createATAIns = Spl.makeCreateAssociatedTokenAccountInstruction({
        mint,
        associatedAccount: ata,
        owner,
        payer: createInfo.payer
      })

      if (checkCreateATAOwner) {
        const ataInfo = await createInfo.connection.getAccountInfo(ata)
        if (ataInfo === null) {
          createInfo.instructions.push(_createATAIns);
        } else if (ataInfo.owner.equals(TOKEN_PROGRAM_ID) && AccountLayout.decode(ataInfo.data).mint.equals(mint) && AccountLayout.decode(ataInfo.data).owner.equals(owner)) { 
          /* empty */ 
        } else {
          throw Error(`create ata check error -> mint: ${mint.toString()}, ata: ${ata.toString()}`)
        }
      } else {
        createInfo.instructions.push(_createATAIns);
      }

      if (mint.equals(TokenWSol) && createInfo.amount) {
        const newTokenAccount = await Spl.insertCreateWrappedNativeAccount({
          connection: createInfo.connection,
          owner,
          payer: createInfo.payer,
          instructions: createInfo.instructions,
          signers: createInfo.signers,
          amount: createInfo.amount ?? 0,
        });

        (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({ tokenAccount: newTokenAccount, owner, payer: createInfo.payer}));

        if (createInfo.amount) {
          createInfo.instructions.push(
            Spl.makeTransferInstruction({
              source: newTokenAccount,
              destination: ata,
              owner,
              amount: createInfo.amount
            })
          )
        }
      }

      (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({ tokenAccount: ata, owner, payer: createInfo.payer}));

      return ata
    } else {
      if (mint.equals(TokenWSol)) {
        const newTokenAccount = await Spl.insertCreateWrappedNativeAccount({
          connection: createInfo.connection,
          owner,
          payer: createInfo.payer,
          instructions: createInfo.instructions,
          signers: createInfo.signers,
          amount: createInfo.amount ?? 0,
        });
        (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({ tokenAccount: newTokenAccount, owner, payer: createInfo.payer}));
        return newTokenAccount
      } else {
        const newTokenAccount = Keypair.generate()
        const balanceNeeded = await createInfo.connection.getMinimumBalanceForRentExemption(AccountLayout.span)

        const createAccountIns = SystemProgram.createAccount({
          fromPubkey: owner,
          newAccountPubkey: newTokenAccount.publicKey,
          lamports: balanceNeeded,
          space: AccountLayout.span,
          programId: TOKEN_PROGRAM_ID,
        })

        const initAccountIns = Spl.createInitAccountInstruction(
          TOKEN_PROGRAM_ID,
          mint,
          newTokenAccount.publicKey,
          owner,
        )
        createInfo.instructions.push(createAccountIns, initAccountIns)
        createInfo.signers.push(newTokenAccount);
        (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({ tokenAccount: newTokenAccount.publicKey, owner, payer: createInfo.payer}));
        return newTokenAccount.publicKey
      }
    }
  }

//make open position instruction
async function makeOpenPositionInstruction({poolInfo, feePayer, wallet, tokenAccountA, tokenAccountB, 
    tickLower, tickUpper, liquidity, amountSlippageA, amountSlippageB}) {
    console.log('calling open position instructions');
    
    const nftMintAKeypair = new Keypair();

    const tickArrayLowerStartIndex = getTickArrayStartIndexByTick(tickLower, poolInfo.tickSpacing);
    const tickArrayUpperStartIndex = getTickArrayStartIndexByTick(tickUpper, poolInfo.tickSpacing);
    
    const { publicKey: tickArrayLower } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
    const { publicKey: tickArrayUpper } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);

    const { publicKey: positionNftAccount } = getATAAddress(wallet, nftMintAKeypair.publicKey);
    const { publicKey: metadataAccount } = getPdaMetadataKey(nftMintAKeypair.publicKey);
    const { publicKey: personalPosition } = getPdaPersonalPositionAddress(poolInfo.programId, nftMintAKeypair.publicKey)
    const { publicKey: protocolPosition } = getPdaProtocolPositionAddress(poolInfo.programId, poolInfo.id, tickLower, tickUpper)

    const ins =  await openPositionInstruction(poolInfo.programId, feePayer, poolInfo.id, wallet, nftMintAKeypair.publicKey, positionNftAccount, metadataAccount,
        protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, tokenAccountA, tokenAccountB, poolInfo.vaultA, poolInfo.vaultB,
        tickLower, tickUpper, tickArrayLowerStartIndex, tickArrayUpperStartIndex,
        liquidity, amountSlippageA, amountSlippageB);

    return {
        address: {
            nftMint: nftMintAKeypair.publicKey,
            tickArrayLower,
            tickArrayUpper,
            positionNftAccount,
            metadataAccount,
            personalPosition,
            protocolPosition,
        },
        innerTransaction: {
            instructions: [ins],
            signers: [nftMintAKeypair]
        }
    };
}

async function makeIncreaseLiquidityInstruction({
    poolInfo,
    ownerPosition,
    wallet,
    tokenAccountA,
    tokenAccountB,
    liquidity,
    amountSlippageA,
    amountSlippageB
  }) {
    const tickArrayLowerStartIndex = getTickArrayStartIndexByTick(ownerPosition.tickLower, poolInfo.tickSpacing);
    const tickArrayUpperStartIndex = getTickArrayStartIndexByTick(ownerPosition.tickUpper, poolInfo.tickSpacing);

    const { publicKey: tickArrayLower } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
    const { publicKey: tickArrayUpper } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
    
    const { publicKey: positionNftAccount } = getATAAddress(wallet, ownerPosition.positionId);

    const { publicKey: personalPosition } = getPdaPersonalPositionAddress(poolInfo.programId, ownerPosition.positionId);
    const { publicKey: protocolPosition } = getPdaProtocolPositionAddress(poolInfo.programId, poolInfo.id, ownerPosition.tickLower, ownerPosition.tickUpper);

    const ins = await increaseLiquidityInstruction(
        poolInfo.programId,
        wallet,
        positionNftAccount,
        personalPosition,
        poolInfo.id,
        protocolPosition,
        tickArrayLower,
        tickArrayUpper,
        tokenAccountA,
        tokenAccountB,
        poolInfo.vaultA,
        poolInfo.vaultB,

        liquidity,
        amountSlippageA,
        amountSlippageB
      );

    return {
      address: {
        tickArrayLower,
        tickArrayUpper,
        positionNftAccount,
        personalPosition,
        protocolPosition,
      },
      innerTransaction: {
        instructions: [ins],
        signers: []
      }
    }
}

async function makeDecreaseLiquidityInstruction({
    poolInfo,
    ownerPosition,
    wallet,
    tokenAccountA,
    tokenAccountB,
    ownerRewardAccounts,
    liquidity,
    amountMinA,
    amountMinB
}) {
    const tickArrayLowerStartIndex = getTickArrayStartIndexByTick(ownerPosition.tickLower, poolInfo.tickSpacing);
    const tickArrayUpperStartIndex = getTickArrayStartIndexByTick(ownerPosition.tickUpper, poolInfo.tickSpacing);

    const { publicKey: tickArrayLower } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
    const { publicKey: tickArrayUpper } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
    
    const { publicKey: positionNftAccount } = getATAAddress(wallet, ownerPosition.positionId);

    const { publicKey: personalPosition } = getPdaPersonalPositionAddress(poolInfo.programId, ownerPosition.positionId);
    const { publicKey: protocolPosition } = getPdaProtocolPositionAddress(poolInfo.programId, poolInfo.id, ownerPosition.tickLower, ownerPosition.tickUpper);

    const rewardAccounts = []
    for (let i = 0; i < poolInfo.rewardInfos.length; i++) {
        if(!poolInfo.rewardInfos[i].tokenMint.equals(new PublicKey("11111111111111111111111111111111"))){
            rewardAccounts.push({
                poolRewardVault: poolInfo.rewardInfos[i].tokenVault,
                ownerRewardVault: ownerRewardAccounts[i]
              })
        }
      
    }

    const decreaseLiquidityInstructions = await decreaseLiquidityInstruction(
        poolInfo.programId,
        wallet,
        positionNftAccount,
        personalPosition,
        poolInfo.id,
        protocolPosition,
        tickArrayLower,
        tickArrayUpper,
        tokenAccountA,
        tokenAccountB,
        poolInfo.vaultA,
        poolInfo.vaultB,
        rewardAccounts,

        liquidity,
        amountMinA,
        amountMinB
      )

    return {
      address: {
        tickArrayLower,
        tickArrayUpper,
        positionNftAccount,
        personalPosition,
        protocolPosition,
      },
      innerTransaction: {
        instructions: [decreaseLiquidityInstructions],
        signers: []
      }
    }
  }

  async function makeClosePositionInstruction({poolInfo, wallet, ownerPosition}) 
  {
    const { publicKey: positionNftAccount } = getATAAddress(wallet, ownerPosition.positionId);
    const { publicKey: personalPosition } = getPdaPersonalPositionAddress(poolInfo.programId, ownerPosition.positionId)

    const closePositionInstructions = await closePositionInstruction(
        poolInfo.programId,

        wallet,
        ownerPosition.positionId,
        positionNftAccount,
        personalPosition
      )

    return {
      address: {
        positionNftAccount,
        personalPosition,
      },
      innerTransaction: {
        instructions: [closePositionInstructions],
        signers: []
      }
    }
  }

const anchorDataBuf = {
    createPool: [233, 146, 209, 142, 207, 104, 64, 188],
    initReward: [95, 135, 192, 196, 242, 129, 230, 68],
    setRewardEmissions: [112, 52, 167, 75, 32, 201, 211, 137],
    openPosition: [135, 128, 47, 77, 15, 152, 240, 49],
    closePosition: [123, 134, 81, 0, 49, 68, 98, 98],
    increaseLiquidity: [46, 156, 243, 118, 13, 205, 251, 178],
    decreaseLiquidity: [160, 38, 208, 111, 104, 91, 44, 1],
    swap: [248, 198, 158, 145, 225, 117, 135, 200],
    collectReward: [18, 237, 166, 197, 34, 16, 213, 144],
};

async function openPositionInstruction(
    programId,
    payer,
    poolId,
    positionNftOwner,
    positionNftMint,
    positionNftAccount,
    metadataAccount,
    protocolPosition,
    tickArrayLower,
    tickArrayUpper,
    personalPosition,
    ownerTokenAccountA,
    ownerTokenAccountB,
    tokenVaultA,
    tokenVaultB,

    tickLowerIndex,
    tickUpperIndex,
    tickArrayLowerStartIndex,
    tickArrayUpperStartIndex,
    liquidity,
    amountMinA,
    amountMinB
) {

    const dataLayout = lo.struct([
        lo.s32("tickLowerIndex"),
        lo.s32("tickUpperIndex"),
        lo.s32("tickArrayLowerStartIndex"),
        lo.s32("tickArrayUpperStartIndex"),
        u128("liquidity"),
        u64("amountMinA"),
        u64("amountMinB"),
    ]);

    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: positionNftOwner, isSigner: true, isWritable: false },
        { pubkey: positionNftMint, isSigner: true, isWritable: true },
        { pubkey: positionNftAccount, isSigner: false, isWritable: true },
        { pubkey: metadataAccount, isSigner: false, isWritable: true },
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: protocolPosition, isSigner: false, isWritable: true },
        { pubkey: tickArrayLower, isSigner: false, isWritable: true },
        { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
        { pubkey: personalPosition, isSigner: false, isWritable: true },
        { pubkey: ownerTokenAccountA, isSigner: true, isWritable: true },
        { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
        { pubkey: tokenVaultA, isSigner: false, isWritable: true },
        { pubkey: tokenVaultB, isSigner: false, isWritable: true },

        { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // console.log("payer : ", payer);
    // console.log("programId : ", programId);
    // console.log("positionNftOwner : ", positionNftOwner);
    // console.log("positionNftMint : ", positionNftMint);
    // console.log("positionNftAccount : ", positionNftAccount);
    // console.log("metadataAccount : ", metadataAccount);
    // console.log("poolId : ", poolId);
    // console.log("protocolPosition : ", protocolPosition);
    // console.log("tickArrayLower : ", tickArrayLower);
    // console.log("tickArrayUpper : ", tickArrayUpper);
    // console.log("personalPosition : ", personalPosition);
    // console.log("ownerTokenAccountA : ", ownerTokenAccountA);
    // console.log("ownerTokenAccountB : ", ownerTokenAccountB);
    // console.log("tokenVaultA : ", tokenVaultA);
    // console.log("tokenVaultB : ", tokenVaultB);
    // console.log("tickLowerIndex : ", tickLowerIndex);
    // console.log("tickUpperIndex : ", tickUpperIndex);
    // console.log("tickArrayLowerStartIndex : ", tickArrayLowerStartIndex);
    // console.log("tickArrayUpperStartIndex : ", tickArrayUpperStartIndex);
    // console.log("liquidity : ", liquidity);
    // console.log("amountMinA : ", amountMinA);
    // console.log("amountMinB : ", amountMinB);

    const data = Buffer.alloc(dataLayout.span); 
    dataLayout.encode(
        {
            tickLowerIndex,
            tickUpperIndex,
            tickArrayLowerStartIndex,
            tickArrayUpperStartIndex,
            liquidity,
            amountMinA,
            amountMinB
        },
        data
    );

    const aData = Buffer.from([...anchorDataBuf.openPosition, ...data]);
    return new TransactionInstruction({
        keys,
        programId,
        data: aData,
    });
}

async function increaseLiquidityInstruction(
    programId,
    positionNftOwner,
    positionNftAccount,
    personalPosition,
  
    poolId,
    protocolPosition,
    tickArrayLower,
    tickArrayUpper,
    ownerTokenAccountA,
    ownerTokenAccountB,
    mintVaultA,
    mintVaultB,
  
    liquidity,
    amountMaxA,
    amountMaxB
  ) {
    const dataLayout = lo.struct([
      u128("liquidity"),
      u64("amountMaxA"),
      u64("amountMaxB"),
    ]);
  
    const keys = [
      { pubkey: positionNftOwner, isSigner: true, isWritable: false },
      { pubkey: positionNftAccount, isSigner: false, isWritable: false },
      { pubkey: poolId, isSigner: false, isWritable: true },
      { pubkey: protocolPosition, isSigner: false, isWritable: true },
      { pubkey: personalPosition, isSigner: false, isWritable: true },
      { pubkey: tickArrayLower, isSigner: false, isWritable: true },
      { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
      { pubkey: ownerTokenAccountA, isSigner: true, isWritable: true },
      { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
      { pubkey: mintVaultA, isSigner: false, isWritable: true },
      { pubkey: mintVaultB, isSigner: false, isWritable: true },
  
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  
    // console.log("programId : ", programId);
    // console.log("positionNftOwner : ", positionNftOwner);
    // console.log("positionNftAccount : ", positionNftAccount);
    // console.log("poolId : ", poolId);
    // console.log("protocolPosition : ", protocolPosition);
    // console.log("tickArrayLower : ", tickArrayLower);
    // console.log("tickArrayUpper : ", tickArrayUpper);
    // console.log("personalPosition : ", personalPosition);
    // console.log("ownerTokenAccountA : ", ownerTokenAccountA);
    // console.log("ownerTokenAccountB : ", ownerTokenAccountB);
    // console.log("tokenVaultA : ", mintVaultA);
    // console.log("tokenVaultB : ", mintVaultB);
    
    
    // console.log("liquidity : ", liquidity);
    // console.log("amountMinA : ", amountMaxA);
    // console.log("amountMinB : ", amountMaxB);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        liquidity,
        amountMaxA,
        amountMaxB,
      },
      data
    );
  
    const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data]);
  
    return new TransactionInstruction({
      keys,
      programId,
      data: aData,
    });
  }
  
  async function decreaseLiquidityInstruction(
    programId,
    positionNftOwner,
    positionNftAccount,
    personalPosition,
  
    poolId,
    protocolPosition,
    tickArrayLower,
    tickArrayUpper,
    ownerTokenAccountA,
    ownerTokenAccountB,
    mintVaultA,
    mintVaultB,
    rewardAccounts,
  
    liquidity,
    amountMinA,
    amountMinB
    ) {
    const dataLayout = lo.struct([
      u128("liquidity"),
      u64("amountMinA"),
      u64("amountMinB"),
    ]);
    console.log(rewardAccounts)
    const keys = [
      { pubkey: positionNftOwner, isSigner: true, isWritable: true },
      { pubkey: positionNftAccount, isSigner: false, isWritable: true },
      { pubkey: personalPosition, isSigner: false, isWritable: true },
      { pubkey: poolId, isSigner: false, isWritable: true },
      { pubkey: protocolPosition, isSigner: false, isWritable: true },
      { pubkey: mintVaultA, isSigner: false, isWritable: true },
      { pubkey: mintVaultB, isSigner: false, isWritable: true },
      { pubkey: tickArrayLower, isSigner: false, isWritable: true },
      { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
  
      { pubkey: ownerTokenAccountA, isSigner: true, isWritable: true },
      { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
  
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  
      ...rewardAccounts.map(i => ([
        { pubkey: i.poolRewardVault, isSigner: false, isWritable: true },
        { pubkey: i.ownerRewardVault, isSigner: false, isWritable: true }
      ])).flat()
    ];
  
    // console.log("positionNftOwner : ", positionNftOwner);
    // console.log("positionNftAccount : ", positionNftAccount);
    // console.log("poolId : ", poolId);
    // console.log("protocolPosition : ", protocolPosition);
    // console.log("tickArrayLower : ", tickArrayLower);
    // console.log("tickArrayUpper : ", tickArrayUpper);
    // console.log("personalPosition : ", personalPosition);
    // console.log("ownerTokenAccountA : ", ownerTokenAccountA);
    // console.log("ownerTokenAccountB : ", ownerTokenAccountB);
    // console.log("tokenVaultA : ", mintVaultA);
    // console.log("tokenVaultB : ", mintVaultB);
    
    
    // console.log("liquidity : ", liquidity);
    // console.log("amountMinA : ", amountMinA);
    // console.log("amountMinB : ", amountMinB);

    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode(
      {
        liquidity,
        amountMinA,
        amountMinB,
      },
      data
    );
  
    const aData = Buffer.from([...anchorDataBuf.decreaseLiquidity, ...data]);
  
    return new TransactionInstruction({
      keys,
      programId,
      data: aData,
    });
  }

  async function closePositionInstruction(
    programId,
    positionNftOwner,
    positionNftMint,
    positionNftAccount,
    personalPosition
  ) {
    const dataLayout = lo.struct([]);
  
    const keys = [
      { pubkey: positionNftOwner, isSigner: true, isWritable: true },
      { pubkey: positionNftMint, isSigner: false, isWritable: true },
      { pubkey: positionNftAccount, isSigner: false, isWritable: true },
      { pubkey: personalPosition, isSigner: false, isWritable: true },
  
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({}, data);
  
    const aData = Buffer.from([...anchorDataBuf.closePosition, ...data]);
  
    return new TransactionInstruction({
      keys,
      programId,
      data: aData,
    });
  }

//get tick price from tick
function getTickPrice(mintDecimalsA, mintDecimalsB, tick, baseIn) {
    const tickSqrtPriceX64 = SqrtPriceMath.getSqrtPriceX64FromTick(tick)
    const tickPrice = SqrtPriceMath.sqrtPriceX64ToPrice(tickSqrtPriceX64, mintDecimalsA, mintDecimalsB)

    return baseIn ? { tick, price: tickPrice, tickSqrtPriceX64 } : { tick, price: new Decimal(1).div(tickPrice), tickSqrtPriceX64 }
}
//get price and tick from pool info
function getPriceAndTick(poolInfo, price, baseIn) {
    const _price = baseIn ? price : new Decimal(1).div(price)
    // console.log(poolInfo)
    const tick = TickMath.getTickWithPriceAndTickspacing(_price, poolInfo.tickSpacing, poolInfo.mintDecimalsA, poolInfo.mintDecimalsB)
    const tickSqrtPriceX64 = SqrtPriceMath.getSqrtPriceX64FromTick(tick)
    const tickPrice = SqrtPriceMath.sqrtPriceX64ToPrice(tickSqrtPriceX64, poolInfo.mintDecimalsA, poolInfo.mintDecimalsB)

    return baseIn ? { tick, price: tickPrice } : { tick, price: new Decimal(1).div(tickPrice) }
}

//get liquidity from amounts and slippage
function getLiquidityFromAmounts(poolInfo, tickLower, tickUpper, amountA, amountB, slippage, add ) {
    const [_tickLower, _tickUpper, _amountA, _amountB] = tickLower < tickUpper ? [tickLower, tickUpper, amountA, amountB] : [tickUpper, tickLower, amountB, amountA]
    const sqrtPriceX64 = new BN(String(poolInfo.sqrtPriceX64))
    const sqrtPriceX64A = SqrtPriceMath.getSqrtPriceX64FromTick(_tickLower)
    const sqrtPriceX64B = SqrtPriceMath.getSqrtPriceX64FromTick(_tickUpper)

    const liquidity =  LiquidityMath.getLiquidityFromTokenAmounts(sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, _amountA, _amountB)
    const amountsSlippage = LiquidityMath.getAmountsFromLiquidityWithSlippage(sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, add, !add, slippage)
    const amounts = LiquidityMath.getAmountsFromLiquidity(sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, !add)
    
    return { liquidity, ...amountsSlippage, ...amounts }
  }