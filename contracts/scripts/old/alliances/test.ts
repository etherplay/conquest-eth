import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

import deployRegistry from '../../deploy_l2/02_alliance_registry/01_deploy_alliance_registry';

const args = process.argv.slice(2);

const p1 = args[0];
const p2 = args[1];
const alliance = args[2];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;

  async function readSlots(player: string): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const slot = await read('AllianceRegistry', 'getAllianceDataAtSlot', player, i);
      console.log(`slot ${i}: ${slot.alliance}, ${slot.joinTime}`);
    }
  }

  console.log(`${p1}`);
  await readSlots(p1);

  console.log(`${p2}`);
  await readSlots(p2);

  await deployRegistry(hre);

  const alliances = await read('AllianceRegistry', 'havePlayersAnAllianceInCommon', p1, p2, 1638948141);

  console.log(alliances);

  const p1Data = await read('AllianceRegistry', 'getAllianceData', p1, alliance);
  const p2Data = await read('AllianceRegistry', 'getAllianceData', p2, alliance);

  console.log({
    alliances,
    p1Data,
    p2Data,
  });
}
if (require.main === module) {
  func(hre);
}

// havePlayersAnAllianceInCommon
