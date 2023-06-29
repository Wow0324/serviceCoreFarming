const ethers = require("ethers");
var fs = require('fs');
const Addresses = require('../../core_scripts/config/addresses.json');
var data = fs.readFileSync(__dirname + "/abi/PcnVault.json", 'utf-8');
const pcnVaultabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/NeondexRouter.json", 'utf-8');
const Routerabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/NeondexFactory.json", 'utf-8');
const ExchangeFactoryabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/BEP20Token.json", 'utf-8');
const busdabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/MasterChef.json", 'utf-8');
const MasterChefabi = JSON.parse(data).abi;
data = fs.readFileSync(__dirname + "/abi/NeondexPair.json", 'utf-8');
const LPPairabi = JSON.parse(data).abi;
//=========================================================

const ExchangeFactoryAddr = Addresses.ExchangeFactory;
const ExchangeRouterAddr = Addresses.ExchangeRouter;
const cakeVaultAddr = Addresses.cakeVault;
const masterchefAddr = Addresses.masterchef;
const UsdtAddr = Addresses.Usdt;

//=========================================================
// testnet.ftmscan
const {
    readLPInformation,
    writeLPInformation,
    TestnetFtmscanGetpIdFromPairName,
    TestnetFtmscanGetAddressFromPairName
} = require("./utils/getAddressFn");
async function findPid(exchangeFactory, MasterChef, tokenLp) {
    console.log("tokenLp token", tokenLp);
    var index = 0;
    try {
        const poolLength = await MasterChef.poolLength();
        console.log(ethers.utils.formatEther(String(poolLength)))
        while (1) {

            const poolInfo = await MasterChef.poolInfo(String(index));
            //console.log("poolInfo.lpToken", poolInfo.lpToken);
            console.log(index);
            if (poolInfo.lpToken == tokenLp) {
                console.log("pid:" + String(index));
                break;
            }
            index++;
        }
    } catch (err) {
        //console.log(err);
        console.log("Add ", tokenLp);
        console.log("pid: ", String(index));
        tx = await MasterChef.add(1000, tokenLp, false);
        await tx.wait();
    }
}
//=========================================================
exports.statusGet = async (req) => {
    console.log("calling statusGet");
    const { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
    const provider = new ethers.providers.JsonRpcProvider(rpc_url);
    const owner = new ethers.Wallet(private_key, provider);
    var addre1 = addr1, addre2 = addr2;
    if (addre1 == "") addre1 = address1;
    if (addre2 == "") addre2 = address2;
    console.log("addresses:", addre1, addre2)
    var path = platform + "_" + pair;
    let poolFarmRes = await readLPInformation(path);
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
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        var LpAddress = await exchangeFactory.getPair(addre1, addre2);
        //tx = await findPid(exchangeFactory, MasterChef, LpAddress);
        const LPPair = new ethers.Contract(LpAddress, LPPairabi, owner);

        res["responseData"] = {
            wallet_balance: balanceETH,
            pairAddr: LpAddress,
            address1: addre1,
            address2: addre2,
            pool: {
                pair: req.pair, // CAKE-USDT
                liquidity: "", // pool liquidity
                volume: "", // pool volume
                liquidity_value: "" // my liquidity value
            },
            farm: {
                pair: req.pair, // CAKE-USDT
                APR: "", // pool liquidity
                LTV: "", // volume 
                deposit_value: "", // my deposit value
                reward_value: "" // my reward value
            }
        }

        if (pool == "1") {
            try {
                //const name = await LPPair.name();
                //const symbol = await LPPair.symbol();
                const decimals = await LPPair.decimals();
                //const totalSupply = await LPPair.totalSupply();
                const balance = await LPPair.balanceOf(owner.address);
                const Token1LP = new ethers.Contract(addre1, busdabi, owner);
                const Token2LP = new ethers.Contract(addre2, busdabi, owner);
                const liquidity1Bg = await Token1LP.balanceOf(LpAddress);
                const liquidity2Bg = await Token2LP.balanceOf(LpAddress);
                var liquidity1 = parseFloat(ethers.utils.formatEther(String(liquidity1Bg)));
                var liquidity2 = parseFloat(ethers.utils.formatEther(String(liquidity2Bg)));

                var price1 = 1;
                var price2 = 1;
                var isprice1 = 0;
                var isprice2 = 0;
                try {
                    if (UsdtAddr != addre1) {
                        price1 = await exchangeRouter.getAmountsIn(ethers.utils.parseUnits(String("1"), decimals), [UsdtAddr, addre1]);
                        var price = ethers.utils.formatEther(String(price1[0]));
                        price1 = parseFloat(price);
                        console.log(price1);
                        isprice1 = 1;
                    }
                }
                catch (err) {
                    isprice1 = 0;
                }

                try {
                    if (UsdtAddr != addre2) {
                        price2 = await exchangeRouter.getAmountsIn(ethers.utils.parseUnits(String("1"), decimals), [UsdtAddr, addre2]);
                        console.log(ethers.utils.formatEther(String(price2[0])));
                        var price = ethers.utils.formatEther(String(price2[0]));
                        price2 = parseFloat(price);
                        isprice2 = 1;
                    }
                }
                catch (err) {
                    isprice2 = 0;
                }
                if (isprice1 == 0) { price1 = 0; price2 = price2 * 2; }
                if (isprice2 == 0) { price2 = 0; price1 = price1 * 2; }
                console.log("liquidity1=" + String(liquidity1) + ", liquidity2=" + String(liquidity2));
                console.log("price1=" + String(price1) + ", price2=" + String(price2));
                var liquidity = liquidity1 * price1 + liquidity2 * price2;
                console.log("liquidity=" + String(liquidity));
                res["responseData"]["pool"]["liquidity"] = liquidity;
                res["responseData"]["pool"]["volume"] = "";//ethers.utils.formatEther(String(balance));
                res["responseData"]["pool"]["liquidity_value"] = ethers.utils.formatEther(String(balance));

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

                //const rewards = await pcnVault.calculateHarvestCakeRewards();
                var pid = TestnetFtmscanGetpIdFromPairName(pair);
                console.log("pid:" + String(pid));
                if (pid > 0) {
                    const userInfo = await MasterChef.userInfo(pid, owner.address);
                    //console.log(userInfo)
                    res["responseData"]["farm"]["deposit_value"] = ethers.utils.formatEther(String(userInfo.amount));
                    res["responseData"]["farm"]["reward_value"] = ethers.utils.formatEther(String(userInfo.rewardDebt));
                }

                res["responseData"]["farm"]["APR"] = "";
                res["responseData"]["farm"]["LTV"] = "";

                poolFarmRes["deposit_value"] = res["responseData"]["farm"]["deposit_value"];
                poolFarmRes["reward_value"] = res["responseData"]["farm"]["reward_value"];
                poolFarmRes["APR"] = res["responseData"]["farm"]["APR"];
                poolFarmRes["LTV"] = res["responseData"]["farm"]["LTV"];

            }
            catch (err) {
                console.log(err)
            }
        }

        writeLPInformation(path, poolFarmRes);
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};
exports.liquidityAdd = async (req) => {
    const { platform, pair, method, pool, farm, address1, address2, amount1, amount2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
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
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);
        const token1 = new ethers.Contract(addre1, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //Cake
        tx = await token1.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount1) * 2), 18));
        await tx.wait();
        console.log("approve token1")
        const token2 = new ethers.Contract(addre2, ["function approve(address spender, uint256 amount) public returns (bool)"], owner); //SYRUP
        tx = await token2.approve(exchangeRouter.address, ethers.utils.parseUnits(String(parseFloat(amount2) * 2), 18));
        await tx.wait();
        console.log("approve token2")
        //const balanceold = await LPPair.balanceOf(owner.address);
        var decimal1 = 18;
        var decimal2 = 18;
        if (addre1 == UsdtAddr) decimal1 = 6;
        if (addre2 == UsdtAddr) decimal2 = 6;
        tx = await exchangeRouter.addLiquidity(
            addre1,
            addre2,
            ethers.utils.parseUnits(String(amount1), decimal1),
            ethers.utils.parseUnits(String(amount2), decimal2),
            0,
            0,
            owner.address,
            "111111111111111111111"
        );
        await tx.wait();
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    //const balance = await LPPair.balanceOf(owner.address);
    return res;
};
exports.liquidityRemove = async (req) => {
    console.log("calling liquidityRemove");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
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
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const exchangeRouter = new ethers.Contract(ExchangeRouterAddr, Routerabi, owner);

        var LpAddress = await exchangeFactory.getPair(addre1, addre2);
        const LPPair = new ethers.Contract(LpAddress, ["function approve(address spender, uint256 amount) public returns (bool)"], owner);
        tx = await LPPair.approve(exchangeRouter.address, ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();

        tx = await exchangeRouter.removeLiquidity(
            addre1,
            addre2,
            ethers.utils.parseUnits(String(liquidity), 18),
            0,
            0,
            owner.address,
            "111111111111111111111"
        );
        await tx.wait();
        // poolFarmRes["liquidity_value"] = parseFloat(poolFarmRes["liquidity_value"]) - parseFloat(liquidity);
        // res["responseData"]["pool"]["liquidity_value"] = poolFarmRes["liquidity_value"];
        // writeLPInformation(path, poolFarmRes);
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};
exports.farmingDeposit = async (req) => {
    console.log("calling farmingDeposit");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
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
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        var tokenLp = await exchangeFactory.getPair(addre1, addre2);
        console.log("tokenLp token", tokenLp);
        var pid = TestnetFtmscanGetpIdFromPairName(pair);
        console.log("pid:" + String(pid));
        if (pid < 1) {
            console.log("Add ", tokenLp);
            tx = await MasterChef.add(100, tokenLp, false);
            await tx.wait();
            pid = 1;
        }
        const LPPair = new ethers.Contract(tokenLp, ["function approve(address spender, uint256 amount) public returns (bool)"], owner);
        tx = await LPPair.approve(MasterChef.address, ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();
        tx = await MasterChef.deposit(String(pid), ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();

        poolFarmRes["deposit_value"] = parseFloat(poolFarmRes["deposit_value"]) + parseFloat(liquidity);
        res["responseData"]["farm"]["deposit_value"] = poolFarmRes["deposit_value"];
        writeLPInformation(path, poolFarmRes);
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};
exports.farmingHarvest = async (req) => {
    console.log("calling farmingHarvest");
    const { platform, pair, method, pool, farm, address1, address2, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
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
        pcnVault = new ethers.Contract(cakeVaultAddr, pcnVaultabi, owner);
        tx = await pcnVault.harvest();
        await tx.wait();
        //tx['value'] = ethers.utils.parseUnits(String(tx['value']), 18);
        res["responseData"]['result'] = tx;
        res["responseData"]['harvest_value'] = tx['value'].toNumber();//ethers.utils.parseUnits(String(tx['value']), 18);
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};

exports.farmingWithdraw = async (req) => {
    console.log("calling farmingWithdraw");
    const { platform, pair, method, pool, farm, address1, address2, liquidity, private_key, rpc_url } = req;
    const { addr1, addr2 } = TestnetFtmscanGetAddressFromPairName(pair);
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
        const exchangeFactory = new ethers.Contract(ExchangeFactoryAddr, ExchangeFactoryabi, owner);
        const MasterChef = new ethers.Contract(masterchefAddr, MasterChefabi, owner); //
        var tokenLp = await exchangeFactory.getPair(addre1, addre2);

        console.log("tokenLp token", tokenLp);
        var pid = TestnetFtmscanGetpIdFromPairName(pair);
        console.log("pid:" + String(pid));
        if (pid < 1) {
            console.log("Add ", tokenLp);
            tx = await MasterChef.add(100, tokenLp, false);
            await tx.wait();
            pid = 1;
        }

        tx = await MasterChef.withdraw(String(pid), ethers.utils.parseUnits(String(liquidity), 18));
        await tx.wait();
        poolFarmRes["deposit_value"] = parseFloat(poolFarmRes["deposit_value"]) - parseFloat(liquidity);
        res["responseData"]["farm"]["deposit_value"] = poolFarmRes["deposit_value"];
        writeLPInformation(path, poolFarmRes);
        res["responseData"]['result'] = tx;
    }
    catch (err) {
        res["statusCode"] = 400;
        console.log(err)
    }
    return res;
};