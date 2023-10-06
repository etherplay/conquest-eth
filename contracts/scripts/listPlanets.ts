import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const planetsChosen = JSON.parse(await hre.deployments.readDotFile('.planets-chosen.json'));

  for (const planet of planetsChosen) {
    console.log(`- (${planet.x},${planet.y})`);
  }
}
if (require.main === module) {
  func(hre);
}
