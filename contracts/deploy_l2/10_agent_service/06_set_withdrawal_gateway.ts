import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {execute, read} = hre.deployments;

  const paymentWithdrwalGateway = await hre.deployments.get('PaymentWithdrawalGateway');

  const currentOwner = await read('PaymentGateway', 'owner');
  // TODO ?
  // if (currentOwner.toLowerCase() !== paymentWithdrwalGateway.address.toLowerCase()) {
  //   await execute(
  //     'PaymentGateway',
  //     {from: currentOwner, log: true},
  //     'transferOwnership',
  //     paymentWithdrwalGateway.address
  //   );
  // }
};
export default func;
func.tags = ['PaymentWithdrawalGateway', 'PaymentGateway'];
func.dependencies = ['PaymentGateway_deploy', 'PaymentWithdrawalGateway_deploy'];
