import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer, agentService} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const paymentGateway = await hre.deployments.get('PaymentGateway');

  const withdrawalSigner = agentService || AddressZero;
  const expiryInSeconds = 15 * 60;
  const extraIntervalInSeconds = 15 * 60;

  const linkedData = {
    expiryInSeconds,
    extraIntervalInSeconds,
  };

  await deploy('PaymentWithdrawalGateway', {
    from: deployer,
    args: [deployer, paymentGateway.address, withdrawalSigner, expiryInSeconds, extraIntervalInSeconds],
    linkedData,
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['PaymentWithdrawalGateway', 'PaymentWithdrawalGateway_deploy'];
func.dependencies = ['PaymentGateway_deploy'];
