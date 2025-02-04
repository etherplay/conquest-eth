import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployer} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;
  const networkName = hre.deployments.getNetworkName();

  const localTesting = networkName === 'hardhat' || networkName === 'localhost'; // chainId === '1337' || chainId === '31337';

  const frontendBaseURI = localTesting
    ? 'http://localhost:3000/basic-alliances/alliances/#'
    : `https://${
        networkName === 'mainnet' ? '' : networkName.replace('_', '-')
      }.conquest.game/basic-alliances/alliances/#`;

  await execute('BasicAllianceFactory', {from: deployer, log: true, autoMine: true}, 'setBaseURI', frontendBaseURI);
}
if (require.main === module) {
  func(hre);
}
