import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {deployments} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy, execute} = hre.deployments;

  const PlayToken = await deployments.get('PlayToken');
  const FreePlayToken = await deployments.get('FreePlayToken');

  const FreePlayTokenClaim = await deploy('FreePlayTokenClaim', {
    from: deployer,
    contract: 'FreePlayTokenClaim',
    args: [deployer, PlayToken.address, FreePlayToken.address],
    // proxy: hre.network.name !== 'mainnet' ? 'postUpgrade' : undefined, // TODO l2 network mainnet
    log: true,
    autoMine: true,
  });

  await execute(
    'FreePlayToken',
    {
      from: deployer,
      log: true,
      autoMine: true,
    },
    'setMinter',
    FreePlayTokenClaim.address,
    true
  );
};
export default func;
func.tags = ['FreePlayTokenClaim', 'FreePlayTokenClaim_deploy'];
func.dependencies = ['PlayToken_deploy', 'FreePlayToken_deploy'];
