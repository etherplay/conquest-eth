import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;
  const info = await read('OuterSpace', 'getGeneisHash');
  console.log(JSON.stringify(info, null, 2));
}
if (require.main === module) {
  func(hre);
}
