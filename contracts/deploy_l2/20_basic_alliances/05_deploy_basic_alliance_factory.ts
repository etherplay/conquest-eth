import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const networkName = hre.deployments.getNetworkName();

  // TODO use network tags ?
  const localTesting = networkName === 'hardhat' || networkName === 'localhost'; // chainId === '1337' || chainId === '31337';

  const allianceRegistry = await hre.deployments.get('AllianceRegistry');

  const frontendBaseURI = localTesting
    ? 'http://localhost:3000/basic-alliances/alliances/#'
    : `https://${
        networkName === 'mainnet' ? '' : '-' + networkName.replace('_', '-')
      }.conquest.game/basic-alliances/alliances/#`;

  await deploy('BasicAllianceFactory', {
    contract: 'BasicAlliance',
    from: deployer,
    args: [allianceRegistry.address, deployer, frontendBaseURI],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.dependencies = ['AllianceRegistry_deploy'];
func.tags = ['BasicAllianceFactory', 'BasicAllianceFactory_deploy'];
