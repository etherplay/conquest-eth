import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const networkName = hre.deployments.getNetworkName();

  const allianceRegistry = await hre.deployments.get('AllianceRegistry');

  const frontendBaseURI = `https://basic-alliances${
    networkName === 'mainnet' ? '' : '-' + networkName
  }.conquest.etherplay.io/alliances/#`;

  await deploy('BasicAllianceFactory', {
    contract: 'BasicAlliance',
    from: deployer,
    args: [allianceRegistry.address, frontendBaseURI],
    log: true,
    autoMine: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.dependencies = ['AllianceRegistry_deploy'];
func.tags = ['BasicAllianceFactory', 'BasicAllianceFactory_deploy'];
