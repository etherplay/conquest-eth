const {loadEnv} = require('ldenv');
loadEnv();

const miningInterval = (() => {
  if (process.env.MINING_INTERVAL) {
    const array = process.env.MINING_INTERVAL.split(',').map((v) => parseInt(v) * 1000);
    if (array.length === 1) {
      return array[0];
    }
    return array;
  } else {
    return undefined;
  }
})();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.28',
  networks: {
    hardhat: {
      mining: miningInterval
        ? {
            auto: false,
            interval: miningInterval,
          }
        : undefined,
    },
  },
};
