import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from '@ethersproject/units';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer, agentService} = await hre.getNamedAccounts();
  const {rawTx} = hre.deployments;
  if (agentService) {
    const currentBalance = await hre.ethers.provider.getBalance(agentService);
    if (currentBalance.lt(parseEther('1'))) {
      await rawTx({
        from: deployer,
        log: true,
        autoMine: true,
        to: agentService,
        value: parseEther('10'),
      });
    }
  }
};
export default func;
func.tags = ['agentService'];
