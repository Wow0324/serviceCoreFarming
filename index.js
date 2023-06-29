/* Amplify Params - DO NOT EDIT
    ENV
    REGION
Amplify Params - DO NOT EDIT */

// ----- You will know which network to use in "ENV" -----
// dev: testnet
// demo: testnet
// stg: mainnet
// prod: mainnet

const ENV = process.env.ENV; // dev, demo, stg, prod

// ----- Region is only Tokyo region (ap-northeast-1) -----
const REGION = process.env.REGION; // ap-northeast-1

const {
    call_PancakeSwap,
    call_UniSwap,
    call_TradeJoe,
    call_SushiSwap,
    call_Raydium,
    call_ORCA,
    call_SUNio,
    call_SpookySwap
} = require("./core_scripts/calling");

const { testfile } = require("./test_assets/testfile");

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

// Call Platform Operate Function
const callPlatformMethods = async ({ request_data }) => {

    const { platform_name } = request_data["platform"];

    // platformの取得
    let platform_response;
    switch (platform_name) {

        // PancakeSwap
        case "PancakeSwap":
            platform_response = await call_PancakeSwap(request_data);
            break;

        // UniSwap
        case "UniSwap":
            platform_response = await call_UniSwap(request_data);
            break;

        // TradeJoe
        case "TradeJoe":
            platform_response = await call_TradeJoe(request_data);
            break;

        // SushiSwap
        case "SushiSwap":
            platform_response = await call_SushiSwap(request_data);
            break;

        // Raydium
        case "Raydium":
            platform_response = await call_Raydium(request_data);
            break;

        // ORCA
        case "ORCA":
            platform_response = await call_ORCA(request_data);
            break;

        // SUN.io
        case "SUN.io":
            platform_response = await call_SUNio(request_data);
            break;

        // SpookySwap
        case "SpookySwap":
            platform_response = await call_SpookySwap(request_data);
            break;

        default:
            new Error("Not Platform Select!")
            break;
    }
}

// const generateTestFile = (event) => {
//     const methods = [
//         "statusGet",
//         "liquidityAdd",
//         "liquidityRemove",
//         "farmingDeposit",
//         "farmingHarvest",
//         "farmingWithdraw"
//     ];

//     let result = {};
//     event.map((platform) => {
//         const pair = platform["tokens"]["items"];
//         const new_platform = platform;

//         let methodsObj = {};

//         methods.map((method) => {
//             const detail = {
//                 platform: new_platform,
//                 pair: pair,
//                 method: method
//             };
//             methodsObj[method] = detail;
//         });

//         result[new_platform["platform_name"]] = methodsObj;
//     });
//     console.log(JSON.stringify(result));
// }

exports.handler = async (event) => {

    console.log("Service Core Partaking Farming");
    console.log(`${ENV} - ${REGION}`);
    console.log(event);
    // console.log(JSON.stringify(event));

    // Originally it will be obtained from the secret manager, but it is temporarily placed
    const PRIVATEKEY = "0xd094758b9ee14eb5781835359297f1b9cbf102c8a4a499e650d28ff27d2d94d8"
    const WALLET = "0xfb1ea3760c69b7be86422a4661f47796d52ceb1b"

    let myProvider;

    switch (ENV) {
        case "dev":
            // testnet
            myProvider = {
                privateKey: PRIVATEKEY,
                walletAddress: WALLET,
                rpcUrls: {
                    PancakeswapUrl: "",
                    UniswapUrl: "",
                    TradeJoeUrl: "",
                    SushiSwapUrl: "",
                    RaydiumUrl: "",
                    ORCAUrl: "",
                    SunIoUrl: "",
                    SpookyswapUrl: ""
                }
            }
            break;

        case "demo":
            // testnet
            myProvider = {
                privateKey: PRIVATEKEY,
                walletAddress: WALLET,
                rpcUrls: {
                    PancakeswapUrl: "",
                    UniswapUrl: "",
                    TradeJoeUrl: "",
                    SushiSwapUrl: "",
                    RaydiumUrl: "",
                    ORCAUrl: "",
                    SunIoUrl: "",
                    SpookyswapUrl: ""
                }
            }
            break;

        case "stg":
            // mainnet
            myProvider = {
                privateKey: PRIVATEKEY,
                walletAddress: WALLET,
                rpcUrls: {
                    PancakeswapUrl: "https://bsc-dataseed1.ninicoin.io/",
                    UniswapUrl: "",
                    TradeJoeUrl: "",
                    SushiSwapUrl: "https://eth-rpc.gateway.pokt.network/",
                    RaydiumUrl: "",
                    ORCAUrl: "",
                    SunIoUrl: "",
                    SpookyswapUrl: ""
                }
            }
            break;

        case "prod":
            // mainnet
            myProvider = {
                privateKey: PRIVATEKEY,
                walletAddress: WALLET,
                rpcUrls: {
                    PancakeswapUrl: "https://bsc-dataseed1.ninicoin.io/",
                    UniswapUrl: "",
                    TradeJoeUrl: "",
                    SushiSwapUrl: "https://eth-rpc.gateway.pokt.network/",
                    RaydiumUrl: "",
                    ORCAUrl: "",
                    SunIoUrl: "",
                    SpookyswapUrl: ""
                }
            }
            break;

        default:
            break;
    }

    // requst data
    let request_data = testfile[event["platform_name"]][event["method"]];
    request_data["MYPROVIDER"] = myProvider;
    request_data["pool"] = null;
    request_data["farm"] = null;

    // main function
    const platform_response = await callPlatformMethods({ request_data });
    return platform_response;
};
