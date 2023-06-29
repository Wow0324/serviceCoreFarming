const ethers = require("ethers");
var fs = require('fs');
const Addresses = require('../../core_scripts/config/addresses.json');
var data = fs.readFileSync(__dirname + "/abi/PcnVault.json", 'utf-8');
const pcnVaultabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/UniSwapRouterV3.json", 'utf-8');
const Routerabi = JSON.parse(data);
data = fs.readFileSync(__dirname + "/abi/UniSwapFactoryV3.json", 'utf-8');
const ExchangeFactoryabi = JSON.parse(data);
data = fs.readFileSync(__dirname + "/abi/BEP20Token.json", 'utf-8');
const busdabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/PancakeswapMasterchefV3.json", 'utf-8');
const MasterChefabi = JSON.parse(data);
data = fs.readFileSync(__dirname + "/abi/PancakeswapPoolPairToken.json", 'utf-8');
const LPPairabi = JSON.parse(data);

data = fs.readFileSync(__dirname + "/abi/NeondexRouter.json", 'utf-8');
const V2Routerabi = JSON.parse(data).abi;

const fee_decimal = 4;
const {
    UniSwapGetFeeFromPairName,
    readLPInformation,
    writeLPInformation,
    UniSwapGetpIdFromPairName,
    UniSwapGetAddressFromPairName
} = require("./utils/getAddressFn");

const {
    getMinTick,
    getMaxTick
} = require("./utils/utils");
//=========================================================
const ExchangeFactoryAddr = Addresses.UniSwapFactoryV3;
const ExchangeRouterAddr = Addresses.UniSwapRouterV3;
const ExchangeRouterAddrV2 = Addresses.UniSwapRouter;

const masterchefAddr = Addresses.UniSwapmasterchefV3;
const UsdtAddr = Addresses.UniSwapUsdt;
const UsdcAddr = Addresses.UniSwapUsdc;
async function findPid(exchangeFactory, MasterChef, tokenLp) {
    console.log("tokenLp token", tokenLp);
    var index = 0;
    try {
        while (1) {
            index++;
            const poolInfo = await MasterChef.poolInfo(String(index));
            if (poolInfo.lpToken == tokenLp) {
                console.log("pid:" + String(index));
            }
        }
    } catch (err) {
        //console.log(err)
    }
}

//=========================================================
exports.statusGet = async (req) => {
    console.log("calling statusGet");
    const { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url } = req;
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;

    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    try {
        console.log("owner address", owner.address);
        const balance0ETH = await provider.getBalance(owner.address);
        const balanceETH = ethers.utils.formatUnits(balance0ETH, 18);
        console.log("balance0ETH", balanceETH);
        // dex
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const exchangeRouterV2 = new ethers.Contract(ExchangeRouterAddrV2, V2Routerabi, owner);
        var fee = UniSwapGetFeeFromPairName(pair);
        var LpAddress = await exchangeFactory.getPool(addre1, addre2, ethers.utils.parseUnits(String(fee), fee_decimal));
        console.log("LP address", LpAddress)
        //tx = await findPid(exchangeFactory, MasterChef, LpAddress); return "";
        const LPPair = new ethers.Contract(LpAddress, LPPairabi, owner);
        var path = platform + "_" + pair;
        let poolFarmRes = await readLPInformation(path);
        res["responseData"] = {
            wallet_balance: balanceETH,
            pairAddr: LpAddress,
            address1: addre1,
            address2: addre2,
            pool: {
                pair: req.pair, // CAKE-USDT
                liquidity: "", // pool liquidity
                volume: "", // pool volume
                liquidity_value: "", // my liquidity value
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

        var liquidity_token = [];
        var deposit_value_token = [];
        var reward_value_token = [];
        if (pool == "1") {
            var Index = 0;
            while (1) {
                var tokenId = await TokenOfOwnerByIndex(owner, Index);
                console.log("index : tokenId", Index, tokenId);
                if (tokenId < 0) break;
                try {
                    tx = await PositionInformationOfTokenId(owner, tokenId);
                    if ((tx["token0"].toUpperCase() == addre1.toUpperCase() && tx["token1"].toUpperCase() == addre2.toUpperCase()) | (tx["token0"].toUpperCase() == addre2.toUpperCase() && tx["token1"].toUpperCase() == addre1.toUpperCase())) {
                        LP_Token = ethers.utils.formatUnits(String(tx["liquidity"]), 18);
                        let LP = { tokenId: tokenId, liquidity: LP_Token };
                        liquidity_token.push(LP);
                    }

                }
                catch (err) {
                    //console.log(err)
                }
                Index++;
            }
            try {
                const decimals = 6;
                const decimal1 = (addre1 == UsdtAddr | addre1 == UsdcAddr) ? 6 : 18;
                const decimal2 = (addre2 == UsdtAddr | addre2 == UsdcAddr) ? 6 : 18;
                //========
                const Token1LP = new ethers.Contract(addre1, busdabi, owner);
                const Token2LP = new ethers.Contract(addre2, busdabi, owner);
                const liquidity1Bg = await Token1LP.balanceOf(LpAddress);
                const liquidity2Bg = await Token2LP.balanceOf(LpAddress);
                const liquidity1Bg_value = await Token1LP.balanceOf(owner.address);
                const liquidity2Bg_value = await Token2LP.balanceOf(owner.address);
                var liquidity1 = parseFloat(ethers.utils.formatUnits(String(liquidity1Bg), decimal1));
                var liquidity2 = parseFloat(ethers.utils.formatUnits(String(liquidity2Bg), decimal2));
                var liquidity1_value = parseFloat(ethers.utils.formatUnits(String(liquidity1Bg_value), decimal1));
                var liquidity2_value = parseFloat(ethers.utils.formatUnits(String(liquidity2Bg_value), decimal2));
                console.log("liquidity1_value=" + String(liquidity1_value) + ", liquidity2_value=" + String(liquidity2_value));
                console.log("liquidity1=" + String(liquidity1) + ", liquidity2=" + String(liquidity2));
                var price1 = 1;
                var price2 = 1;
                var isprice1 = 0;
                var isprice2 = 0;
                var deciaml_add = 1;
                try {
                    if (UsdtAddr != addre1 & UsdcAddr != addre1) {
                        price1 = await exchangeRouterV2.getAmountsIn(ethers.utils.parseUnits(String("1"), 18), [UsdtAddr, addre1]);
                        var price = ethers.utils.formatUnits(String(price1[0]), decimals);
                        price1 = parseFloat(price) * deciaml_add;
                        console.log(price1);
                        isprice1 = 1;
                    }
                    else {
                        isprice1 = 1; price1 = 1;
                        liquidity1_value = liquidity1_value * deciaml_add;
                        liquidity1 = liquidity1 * deciaml_add;
                    }
                }
                catch (err) {
                    isprice1 = 0;
                }

                try {
                    if (UsdtAddr != addre2 & UsdcAddr != addre2) {
                        price2 = await exchangeRouterV2.getAmountsIn(ethers.utils.parseUnits(String("1"), decimals), [UsdtAddr, addre2]);
                        console.log(ethers.utils.formatUnits(String(price2[0])));
                        var price = ethers.utils.formatUnits(String(price2[0]), decimals);
                        price2 = parseFloat(price) * deciaml_add;
                        console.log(price2);
                        isprice2 = 1;
                    }
                    else {
                        isprice2 = 1; price2 = 1;
                        liquidity2_value = liquidity2_value * deciaml_add;
                        liquidity2 = liquidity2 * deciaml_add;
                    }
                }
                catch (err) {
                    isprice2 = 0;
                }
                if (isprice1 == 0) { price1 = 0; price2 = price2 * 2; }
                if (isprice2 == 0) { price2 = 0; price1 = price1 * 2; }
                //console.log("liquidity1_value=" + String(liquidity1_value) + ", liquidity2_value=" + String(liquidity2_value));
                //console.log("liquidity1=" + String(liquidity1) + ", liquidity2=" + String(liquidity2));
                console.log("price1=" + String(price1) + ", price2=" + String(price2));
                var liquidity = liquidity1 * price1 + liquidity2 * price2;
                var liquidity_value = liquidity1_value * price1 + liquidity2_value * price2;
                console.log("liquidity=" + String(liquidity) + ",liquidity_value =" + String(liquidity_value));
                res["responseData"]["pool"]["liquidity"] = liquidity;
                res["responseData"]["pool"]["volume"] = "";
                res["responseData"]["pool"]["liquidity_value"] = liquidity_value;
                res["responseData"]["pool"]["LPTokens"] = liquidity_token;

                poolFarmRes["liquidity"] = res["responseData"]["pool"]["liquidity"];
                poolFarmRes["volume"] = res["responseData"]["pool"]["volume"];
                poolFarmRes["liquidity_value"] = res["responseData"]["pool"]["liquidity_value"];
            }
            catch (err) {
                console.log(err)
            }
        }
        if (farm == "1") {
            try {
                const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
                var Index = 0;
                var pid = await MasterChef.v3PoolAddressPid(LpAddress);
                pid = pid.toNumber();
                console.log("pid", pid);
                while (1) {
                    var tokenId = await TokenOfOwnerByIndexFarm(owner, Index);
                    Index++;
                    console.log("index : tokenId", Index, tokenId);
                    if (tokenId < 0) break;
                    try {
                        tx = await UserInformationOfTokenId(owner, tokenId);
                        tx["pid"] = tx["pid"].toNumber();
                        console.log("tx[pid]", tx["pid"]);
                        if (pid != tx["pid"]) continue;
                        deposit_value = ethers.utils.formatEther(String(tx["liquidity"]));
                        reward_value = ethers.utils.formatEther(String(tx["reward"]));
                        let DV = { tokenId: tokenId, deposit_value: deposit_value };
                        let RV = { tokenId: tokenId, reward_value: reward_value };
                        deposit_value_token.push(DV);
                        reward_value_token.push(RV);

                    }
                    catch (err) {
                        console.log(err)
                    }

                }
                res["responseData"]["farm"]["deposit_value"] = deposit_value_token;
                res["responseData"]["farm"]["reward_value"] = reward_value_token;
                res["responseData"]["farm"]["APR"] = "";
                res["responseData"]["farm"]["LTV"] = "";
                poolFarmRes["APR"] = res["responseData"]["farm"]["APR"];
                poolFarmRes["LTV"] = res["responseData"]["farm"]["LTV"];
            }
            catch (err) {
                console.log(err)
            }
        }
        //writeLPInformation(path, poolFarmRes);
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};
exports.liquidityAdd = async (req) => {
    console.log("calling liquidityAdd V3");
    const { platform, pair, method, pool, farm, address1, address2, amount1, amount2, tokenId, private_key, rpc_url,tickLower,tickUpper  } = req;
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    try {
        if (parseInt(tokenId) > 0) {
            let res = await increaseLiquidity(provider, owner, req);
            return res;
        }
    }
    catch (err) {
        console.log(err)
    }

    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolFarmRes["liquidity"], // pool liquidity
            volume: poolFarmRes["volume"], // pool volume
            liquidity_value: poolFarmRes["liquidity_value"] // my liquidity value
        },
        farm: null
    }
    try {
        var decimal1 = 18;
        var decimal2 = 18;
        if (addre1 == UsdtAddr | addre1 == UsdcAddr) decimal1 = 6;
        if (addre2 == UsdtAddr | addre1 == UsdcAddr) decimal2 = 6;
        var fee = UniSwapGetFeeFromPairName(pair);
        console.log("Fee", fee);
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        var ticketspace = await exchangeFactory.feeAmountTickSpacing(ethers.utils.parseUnits(String(fee), fee_decimal));
        console.log(ticketspace);
        tickSpacing = parseFloat(ticketspace);
        var tickLower1 = getMinTick(ticketspace) + tickSpacing;
        var tickUpper1 = getMaxTick(ticketspace) - tickSpacing;

        //const tickLower = -400;
        //const tickUpper = 10500;
        if(tickLower != undefined & tickLower!="")
            tickLower1 = tickLower;
         if(tickUpper != undefined & tickUpper!="")
            tickUpper1 = tickUpper;
        console.log("tick lower", tickLower1)
        console.log("tickUpper", tickUpper1)

        const token1 = new ethers.Contract(addre1, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //Cake
        tx = await token1.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount1) * 2), 18));
        await tx.wait();
        console.log("approve token1")
        const token2 = new ethers.Contract(addre2, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //SYRUP
        tx = await token2.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount2) * 2), 18));
        await tx.wait();
        console.log("approve token2")

        var params = {
            token0: addre1,
            token1: addre2,
            fee: ethers.utils.parseUnits(String(fee), fee_decimal),
            tickLower: tickLower1,
            tickUpper: tickUpper1,
            amount0Desired: ethers.utils.parseUnits(String(amount1), decimal1),
            amount1Desired: ethers.utils.parseUnits(String(amount2), decimal2),
            amount0Min: 0,
            amount1Min: 0,
            recipient: owner.address,
            deadline: "111111111111111111111"
        }
        tx = await exchangeRouter.mint(params);
        response = await tx.wait();
        // get interface data
        try {
            let exchangeRouterIface = new ethers.utils.Interface(["event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"])
            let topicHash = exchangeRouterIface.getEventTopic("IncreaseLiquidity");
            console.log("topic", topicHash);
            let args = {};
            response.logs.forEach(log => {
                console.log(log.topics[0])
                if (log.topics[0] == topicHash) {
                    args = exchangeRouterIface.parseLog(log).args;
                    console.log("log", args)
                }
            });
            res["responseData"]['result'] = {
                tokenId: args.tokenId.toNumber(),
                liquidity: ethers.utils.formatEther(String(args.liquidity)),
                amount0: parseFloat(ethers.utils.formatUnits(String(args.amount0), decimal1)),
                amount1: parseFloat(ethers.utils.formatUnits(String(args.amount1), decimal2))
            };
        }
        catch (err) {

        }
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
};
exports.liquidityRemove = async (req) => {
    console.log("calling liquidityRemove");
    const { platform, pair, method, pool, farm, address1, address2, tokenId, private_key, rpc_url } = req;
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolFarmRes["liquidity"], // pool liquidity
            volume: poolFarmRes["volume"], // pool volume
            liquidity_value: poolFarmRes["liquidity_value"] // my liquidity value
        },
        farm: null
    }
    try {
        var decimal1 = 18;
        var decimal2 = 18;
        if (addre1 == UsdtAddr | addre1 == UsdcAddr) decimal1 = 6;
        if (addre2 == UsdtAddr | addre1 == UsdcAddr) decimal2 = 6;
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        let tx = await PositionInformationOfTokenId(owner, tokenId);
        LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
        var params = {
            tokenId: tokenId,
            liquidity: tx["liquidity"],
            amount0Min: 0,
            amount1Min: 0,
            deadline: "111111111111111111111"
        }
        tx = await exchangeRouter.decreaseLiquidity(params);
        response = await tx.wait();
        try {
            // get interface data
            let exchangeRouterIface = new ethers.utils.Interface(["event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"])
            let topicHash = exchangeRouterIface.getEventTopic("DecreaseLiquidity");
            console.log("topic", topicHash);
            let args = {};
            response.logs.forEach(log => {
                console.log(log.topics[0])
                if (log.topics[0] == topicHash) {
                    args = exchangeRouterIface.parseLog(log).args;
                    //console.log("log", args)
                }
            });
            res["responseData"]['result'] = {
                tokenId: args.tokenId.toNumber(),
                liquidity: ethers.utils.formatEther(String(args.liquidity)),
                amount0: parseFloat(ethers.utils.formatUnits(String(args.amount0), decimal1)),
                amount1: parseFloat(ethers.utils.formatUnits(String(args.amount1), decimal2))
            };
        }
        catch (err) { }

        params = {
            tokenId: tokenId,
            recipient: owner.address,
            amount0Max: ethers.utils.parseUnits(String("340282366920938463463"), 18),
            amount1Max: ethers.utils.parseUnits(String("340282366920938463463"), 18)
        }
        tx = await exchangeRouter.collect(params);
        response = await tx.wait();
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};
exports.farmingDeposit = async (req) => {
    console.log("calling farmingDeposit");
    const { platform, pair, method, pool, farm, address1, address2, tokenId, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // 
            LTV: poolFarmRes["LTV"], //  
            deposit_value: poolFarmRes["deposit_value"],
            reward_value: poolFarmRes["reward_value"] //
        }
    }

    try {
        tx = await PositionInformationOfTokenId(owner, tokenId);
        LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
        if (parseFloat(LP_Token) > 0) {
            tx = await UserInformationOfTokenId(owner, tokenId);
            LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
            if (parseFloat(LP_Token) > 0) {
                res["statusCode"] = 400;
                res["error_reason"] = "There is LP Token that already deposited";
            }
            else {
                const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
                tx = await exchangeRouter.safeTransferFrom(owner.address, masterchefAddr, tokenId);
                await tx.wait();
                tx = await UserInformationOfTokenId(owner, tokenId);
                LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
                res["responseData"]["farm"]['deposit_value'] = LP_Token;
            }
        }
        else {
            res["statusCode"] = 400;
            res["error_reason"] = "There is no LP Token for Deposit";
        }

        //poolFarmRes["deposit_value"] = parseFloat(poolFarmRes["deposit_value"]) + parseFloat(liquidity);
        //res["responseData"]["farm"]["deposit_value"] = poolFarmRes["deposit_value"];
        // writeLPInformation(path, poolFarmRes);
    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};
exports.farmingHarvest = async (req) => {
    console.log("calling farmingHarvest");
    const { platform, pair, method, pool, farm, address1, address2, tokenId, private_key, rpc_url } = req;
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // pool liquidity
            LTV: poolFarmRes["LTV"], // volume 
            deposit_value: poolFarmRes["deposit_value"], // my deposit value
            reward_value: poolFarmRes["reward_value"] // my reward value
        }
    }
    try {

        tx = await UserInformationOfTokenId(owner, tokenId);
        LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
        if (parseFloat(LP_Token) > 0) {
            const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
            tx = await MasterChef.harvest(tokenId, owner.address);
            await tx.wait();
            tx = await UserInformationOfTokenId(owner, tokenId);
            LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
            let reward_value = ethers.utils.formatEther(String(tx["reward"]));
            res["responseData"]["farm"]['deposit_value'] = LP_Token;
            res["responseData"]["farm"]['reward_value'] = reward_value;
        }
        else {
            res["statusCode"] = 400;
            res["error_reason"] = "There is no LP Token for Harvest";
        }

    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
    }
    return res;
};

exports.farmingWithdraw = async (req) => {
    console.log("calling farmingWithdraw");
    const { platform, pair, method, pool, farm, address1, address2, tokenId, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("owner address", owner.address);
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: null,
        farm: {
            pair: req.pair, // CAKE-USDT
            APR: poolFarmRes["APR"], // pool liquidity
            LTV: poolFarmRes["LTV"], // volume 
            deposit_value: poolFarmRes["deposit_value"], // my deposit value
            reward_value: poolFarmRes["reward_value"] // my reward value
        }
    }
    try {
        tx = await UserInformationOfTokenId(owner, tokenId);
        LP_Token = ethers.utils.formatEther(String(tx["liquidity"]));
        if (parseFloat(LP_Token) > 0) {
            const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
            tx = await MasterChef.withdraw(tokenId, owner.address);
            await tx.wait();
            res["responseData"]["farm"]['deposit_value'] = 0;
            res["responseData"]["farm"]['reward_value'] = 0;
        }
        else {
            res["statusCode"] = 400;
            res["error_reason"] = "There is no LP Token for Withdraw";
        }


    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
};


async function TokenOfOwnerByIndex(owner, Index) {
    const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
    var tokenId = -1;
    try {
        tx = await exchangeRouter.tokenOfOwnerByIndex(owner.address, Index);
        tokenId = tx.toNumber();

    } catch (err) {
        //console.log(err)
    }
    return tokenId;
}
async function TokenOfOwnerByIndexFarm(owner, Index) {
    const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
    var tokenId = -1;
    try {
        tx = await MasterChef.tokenOfOwnerByIndex(owner.address, Index);
        tokenId = tx.toNumber();

    } catch (err) {
        //console.log(err)
    }
    return tokenId;
}
async function PositionInformationOfTokenId(owner, tokenId) {
    const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
    var postionInfo = {
        nonce: 0,
        operator: 0,
        token0: 0,
        token1: 0,
        fee: 0,
        tickLower: 0,
        tickUpper: 0,
        liquidity: 0,
        feeGrowthInside0LastX128: 0,
        feeGrowthInside1LastX128: 0,
        tokensOwed0: 0,
        tokensOwed1: 0
    };
    try {
        postionInfo = await exchangeRouter.positions(tokenId);
    }
    catch (err) {

    }
    return postionInfo;
}
async function UserInformationOfTokenId(owner, tokenId) {
    const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
    var UserPositionInfo = {
        liquidity: 0,
        boostLiquidity: 0,
        tickLower: 0,
        tickUpper: 0,
        rewardGrowthInside: 0,
        reward: 0,
        user: 0,
        pid: 0
    }
    try {
        UserPositionInfo = await MasterChef.userPositionInfos(tokenId);

    }
    catch (err) {
        console.log(err)
    }
    return UserPositionInfo;
}


async function increaseLiquidity(provider, owner, req) {
    const { platform, pair, method, pool, farm, address1, address2, amount1, amount2, tokenId, private_key, rpc_url } = req;
    const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
    const { addr1, addr2 } = UniSwapGetAddressFromPairName(pair);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    let res = {
        statusCode: 200,
        requestData: req,
        responseData: null
    }
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
    res["responseData"] = {
        address1: addre1,
        address2: addre2,
        pool: {
            pair: req.pair, // CAKE-USDT
            liquidity: poolFarmRes["liquidity"], // pool liquidity
            volume: poolFarmRes["volume"], // pool volume
            liquidity_value: poolFarmRes["liquidity_value"] // my liquidity value
        },
        farm: null
    }


    // let transactionHash = "0x65b46b28aa0e6e1298138ce3123ddc67c5e261b7d217613542c1ed9baa18d7cc";
    // const txReceipt = await provider.getTransaction(transactionHash);
    // let response = await txReceipt.wait();


    try {
        var decimal1 = 18;
        var decimal2 = 18;
        if (addre1 == UsdtAddr | addre1 == UsdcAddr) decimal1 = 6;
        if (addre2 == UsdtAddr | addre1 == UsdcAddr) decimal2 = 6;
        const token1 = new ethers.Contract(addre1, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //Cake
        tx = await token1.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount1) * 2), decimal1));
        await tx.wait();
        console.log("increase approve token1")
        const token2 = new ethers.Contract(addre2, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //SYRUP
        tx = await token2.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount2) * 2), decimal2));
        await tx.wait();
        console.log("increase approve token2")


        var params = {
            tokenId: tokenId,
            amount0Desired: ethers.utils.parseUnits(String(amount1), decimal1),
            amount1Desired: ethers.utils.parseUnits(String(amount2), decimal2),
            amount0Min: 0,
            amount1Min: 0,
            deadline: "111111111111111111111"
        }
        tx = await exchangeRouter.increaseLiquidity(params);
        await exchangeRouter.refundETH();
        let response = await tx.wait();
        try {
            // get interface data
            let exchangeRouterIface = new ethers.utils.Interface(["event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"])
            let topicHash = exchangeRouterIface.getEventTopic("IncreaseLiquidity");
            console.log("topic", topicHash);
            let args = {};
            response.logs.forEach(log => {
                console.log(log.topics[0])
                if (log.topics[0] == topicHash) {
                    args = exchangeRouterIface.parseLog(log).args;
                    //console.log("log", args)
                }
            });
            res["responseData"]['result'] = {
                tokenId: args.tokenId.toNumber(),
                liquidity: ethers.utils.formatEther(String(args.liquidity)),
                amount0: parseFloat(ethers.utils.formatUnits(String(args.amount0), decimal1)),
                amount1: parseFloat(ethers.utils.formatUnits(String(args.amount1), decimal2))
            };

        }
        catch (err) {

        }

    }
    catch (err) {
        res["statusCode"] = 400;
        res["error_reason"] = err["reason"];
        console.log(err)
    }
    return res;
}