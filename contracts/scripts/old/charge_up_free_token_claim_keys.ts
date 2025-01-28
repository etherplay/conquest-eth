import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {deployments} from 'hardhat';
import {formatEther, parseEther} from '@ethersproject/units';
import {Wallet} from '@ethersproject/wallet';
import {BigNumber} from 'ethers';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployer} = await hre.getNamedAccounts();
  const {network, getChainId, ethers} = hre;

  const lists: {list: string[]; used: boolean}[] = JSON.parse(await deployments.readDotFile('.free_token_list.json'));

  const PlayTokenDeployment = await deployments.get('PlayToken');

  const claimKeyETHAmount = parseEther('2');
  const tokenAmount = parseEther('25');

  const amountOfNativeToken = tokenAmount
    .mul(parseEther('1'))
    .div(PlayTokenDeployment.linkedData.numTokensPerNativeTokenAt18Decimals);

  const addresses: string[] = [];
  const tokenAmounts: BigNumber[] = [];
  const nativeTokenAmounts: BigNumber[] = [];

  const page = lists[3];

  if (page.used) {
    throw new Error('page used');
  }

  const list = page.list;

  let totalETH = BigNumber.from(0);
  for (const claimLink of list) {
    const privateKey = claimLink.slice('https://defcon.conquest.etherplay.io/#tokenClaim='.length);
    const wallet = new Wallet(privateKey);
    addresses.push(wallet.address);
    tokenAmounts.push(tokenAmount);
    nativeTokenAmounts.push(claimKeyETHAmount);
    totalETH = totalETH.add(claimKeyETHAmount).add(amountOfNativeToken);
  }

  console.log({
    addresses,
    tokenAmounts: formatEther(tokenAmounts[0]),
    nativeTokenAmounts: formatEther(nativeTokenAmounts[0]),
    totalETH: formatEther(totalETH),
  });

  await deployments.execute(
    'FreePlayToken',
    {
      from: deployer,
      log: true,
      autoMine: true,
      value: totalETH,
      gasLimit: 10000000,
    },
    'mintMultipleViaNativeTokenPlusSendExtraNativeTokens',
    addresses,
    tokenAmounts,
    nativeTokenAmounts
  );
}

// function wait(time: number): Promise<void> {
//   return new Promise<void>((resolve) => {
//     setTimeout(resolve, time * 1000);
//   });
// }

async function main() {
  // for (let i = 0; i < 107; i++) {
  //   console.log(`executing ${i} ... in 3s`);
  // await wait(3);
  await func(hre);
  // }
}

if (require.main === module) {
  main();
}
