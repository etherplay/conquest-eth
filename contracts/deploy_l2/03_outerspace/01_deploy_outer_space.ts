import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers, network} from 'hardhat';
import {xyToLocation} from 'conquest-eth-common';

function hours(num: number): number {
  return num * 3600;
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {diamond, read} = hre.deployments;

  // const chainId = await hre.getChainId();
  const networkName = await hre.deployments.getNetworkName();
  // TODO use network tags ?
  const localTesting = networkName === 'hardhat' || networkName === 'localhost'; // chainId === '1337' || chainId === '31337';

  // console.log({networkName, localTesting});

  const PlayToken = await hre.deployments.get('PlayToken');
  const FreePlayToken = await hre.deployments.get('FreePlayToken');

  const allianceRegistry = await hre.deployments.get('AllianceRegistry');

  let chainGenesisHash = '';
  if (localTesting) {
    const earliestBlock = await ethers.provider.getBlock('earliest');
    chainGenesisHash = earliestBlock.hash;
  }
  let genesisHash = '0xcce77b122615b6093c0df0c7392bec6f537eb7a0595c337a573ee6d96d1107c8';
  let resolveWindow = hours(12);
  let timePerDistance = hours(2);
  let exitDuration = hours(3 * 24);
  const acquireNumSpaceships = 100000;
  let productionSpeedUp = 1;
  let frontrunningDelay = 30 * 60;
  const productionCapAsDuration = 3 * 24 * 3600; // 3 days
  const upkeepProductionDecreaseRatePer10000th = 5000;
  const fleetSizeFactor6 = 500000;
  const initialSpaceExpansion = 12;
  const expansionDelta = 6;
  const giftTaxPer10000 = 2000;
  const stakeRange = '0x00060008000A000C000E00100012001400140016001800200028003000380048';
  let stakeMultiplier10000th = 10;

  // use a command to increase time in 1337
  if (localTesting) {
    timePerDistance /= 180;
    exitDuration /= 180;
    productionSpeedUp = 180;
    frontrunningDelay /= 180;
    resolveWindow /= 30; // 180;
    stakeMultiplier10000th = 1666;
  }

  if (networkName === 'quick') {
    // TODO remove when updating quick to a new contract
    genesisHash = '0xe0c3fa9ae97fc9b60baae605896b5e3e7cecb6baaaa4708162d1ec51e8d65111';
    timePerDistance /= 180;
    exitDuration /= 180;
    productionSpeedUp = 180;
    frontrunningDelay /= 180;
    resolveWindow /= 180;
    // productionCapAsDuration /= 180;
  }

  if (networkName === 'defcon') {
    // TODO remove when updating quick to a new contract
    genesisHash = '0xdefd8666ec077c932b62f77bcfea4badcb3c296fc1f8a8792c9b7ca2ee6c8c4c';
    // timePerDistance = Math.floor(timePerDistance / 5);
    // exitDuration = Math.floor(exitDuration / 5);
    // productionSpeedUp = 5;
    // frontrunningDelay = Math.floor(frontrunningDelay / 5);
    // resolveWindow = Math.floor(resolveWindow / 5);
    stakeMultiplier10000th = 1666;
    // productionCapAsDuration /= 180;
  }

  // if (networkName === 'coinfest') {
  //   genesisHash =
  //     '0xe0c3fa9ae97fc9b60baae605896b5e3e7cecb6baaaa4708162d1ec51e8d65111';
  //   timePerDistance /= 5;
  //   exitDuration /= 5;
  //   productionSpeedUp = 5;
  //   productionCapAsDuration /= 5;
  //   frontrunningDelay /= 5;
  // }

  if (networkName === 'dev') {
    timePerDistance /= 100;
    exitDuration /= 100;
    productionSpeedUp = 100;
    frontrunningDelay /= 100;
    resolveWindow /= 25;
    // productionCapAsDuration /= 180;
    genesisHash = '0xee563ebbe85edccc120c5082a5066539b0e9b7958b5fbac114523a95a8162672';
  }

  if (networkName === 'alpha') {
    genesisHash = '0x015e3b02f1bb647546a9856205a64f1c2263856de7acb3fe65aa303c9c8ce7fc';
  }

  if (networkName === 'beta') {
    genesisHash = '0xf69ea25ce5e4aa509188e7ece284702358d8df5e656a9a3c8509506343f9faa8';
  }

  console.log({
    PlayToken: PlayToken.address,
    FreePlayToken: FreePlayToken.address,
    allianceRegistry: allianceRegistry.address,
    genesisHash,
    resolveWindow,
    timePerDistance,
    exitDuration,
    acquireNumSpaceships,
    productionSpeedUp,
    frontrunningDelay,
    productionCapAsDuration,
    upkeepProductionDecreaseRatePer10000th,
    fleetSizeFactor6,
    initialSpaceExpansion,
    expansionDelta,
    giftTaxPer10000,
    stakeRange,
    stakeMultiplier10000th,
  });

  await diamond.deploy('OuterSpace', {
    from: deployer,
    linkedData: {
      genesisHash,
      resolveWindow,
      timePerDistance,
      exitDuration,
      acquireNumSpaceships,
      productionSpeedUp,
      chainGenesisHash,
      frontrunningDelay,
      productionCapAsDuration,
      upkeepProductionDecreaseRatePer10000th,
      fleetSizeFactor6,
      initialSpaceExpansion,
      expansionDelta,
      giftTaxPer10000,
      stakeRange,
      stakeMultiplier10000th,
    },
    facets: [
      'OuterSpaceInitializationFacet',
      'OuterSpaceAdminFacet',
      'OuterSpaceFleetsReadFacet',
      'OuterSpaceFleetsCommitFacet',
      'OuterSpaceFleetsRevealFacet',
      'OuterSpacePlanetsFacet',
      'OuterSpaceInformationFacet',
      'OuterSpaceStakingFacet',
      'OuterSpaceRewardFacet',
    ],
    facetsArgs: [
      {
        stakingToken: PlayToken.address,
        freeStakingToken: FreePlayToken.address,
        allianceRegistry: allianceRegistry.address,
        genesis: genesisHash,
        resolveWindow,
        timePerDistance,
        exitDuration,
        acquireNumSpaceships,
        productionSpeedUp,
        frontrunningDelay,
        productionCapAsDuration,
        upkeepProductionDecreaseRatePer10000th,
        fleetSizeFactor6,
        initialSpaceExpansion,
        expansionDelta,
        giftTaxPer10000,
        stakeRange,
        stakeMultiplier10000th,
      },
    ],
    execute: {
      methodName: 'init',
      args: [],
    },
    log: true,
    autoMine: true,
  });

  // console.log(await read('OuterSpace', 'tokenURI', xyToLocation(108, -126)));
};
export default func;
func.dependencies = ['PlayToken_deploy', 'FreePlayToken_deploy', 'AllianceRegistry_deploy'];
func.tags = ['OuterSpace', 'OuterSpace_deploy'];
