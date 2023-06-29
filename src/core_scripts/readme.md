calling.js = methods call function

platform/xxxxx.js = your method functions file
otherfile/....

https://farms-api.pancakeswap.com/price/cake

uniswap v3 liquidity pool calculator
https://app.uniswap.org/#/pools/641076

tradejoe v2.1 liquidity
https://traderjoexyz.com/avalanche/pool/v21/AVAX/0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7/20

Raydium Solana

const pancakeswap = require('@pancakeswap/sdk');

const factory = pancakeswap.factory('BNB/USDC');
const pair = factory.getPair();

const minPrice = pair.minPrice();
const tickSize = pair.tickSize();

const lowerTick = minPrice - tickSize;

console.log(lowerTick);

priceToClosestTick
