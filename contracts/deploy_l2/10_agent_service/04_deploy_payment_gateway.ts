import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  await deploy('PaymentGateway', {
    from: deployer,
    contract: 'src/agent/PaymentGateway.sol:PaymentGateway',
    args: [deployer], // TODO
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['PaymentGateway', 'PaymentGateway_deploy'];
