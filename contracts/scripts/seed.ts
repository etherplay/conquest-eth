import {BigNumber} from '@ethersproject/bignumber';
import {formatEther, parseEther} from '@ethersproject/units';
import {defaultAbiCoder} from '@ethersproject/abi';
import {getUnnamedAccounts, deployments, getNamedAccounts, ethers} from 'hardhat';
import {SpaceInfo} from 'conquest-eth-common';
import {FreePlayToken, PlayToken} from '../typechain';
import {setupUsers} from '../utils';
import {hexZeroPad} from '@ethersproject/bytes';

async function main() {
  const {claimKeyDistributor, deployer} = await getNamedAccounts();
  const unNamedAccounts = await getUnnamedAccounts();

  const contracts = {
    OuterSpace: await ethers.getContract('OuterSpace'),
    PlayToken: <PlayToken>await ethers.getContract('PlayToken'),
    FreePlayToken: <FreePlayToken>await ethers.getContract('FreePlayToken'),
  };
  const OuterSpaceDeployment = await deployments.get('OuterSpace');

  const PlayTokenDeployment = await deployments.get('PlayToken');
  const players = await setupUsers(unNamedAccounts, contracts);

  const freePlayTokendistribution = [25, 25, 25, 25];
  for (let i = 0; i < freePlayTokendistribution.length; i++) {
    const account = players[i].address;
    const amount = freePlayTokendistribution[i];
    const amountOfNativeToken = parseEther(amount.toString())
      .mul(parseEther('1'))
      .div(PlayTokenDeployment.linkedData.numTokensPerNativeTokenAt18Decimals);

    console.log({
      amount: formatEther(amount),
      amountOfNativeToken: formatEther(amountOfNativeToken),
    });
    await deployments.execute(
      'PlayToken',
      {
        from: account,
        log: true,
        autoMine: true,
        value: amountOfNativeToken,
      },
      'mint',
      account,
      parseEther(amount.toString())
    );
    await deployments.execute(
      'PlayToken',
      {from: account, log: true, autoMine: true},
      'approve',
      contracts.FreePlayToken.address,
      parseEther(amount.toString())
    );
    await deployments.execute(
      'FreePlayToken',
      {from: deployer, log: true, autoMine: true},
      'mint',
      account,
      account,
      parseEther(amount.toString())
    );
  }

  const playTokendistribution = [30, 30, 30, 30];
  for (let i = 0; i < playTokendistribution.length; i++) {
    const account = players[i + freePlayTokendistribution.length].address;
    const amount = playTokendistribution[i];
    const amountOfNativeToken = parseEther(amount.toString())
      .mul(parseEther('1'))
      .div(PlayTokenDeployment.linkedData.numTokensPerNativeTokenAt18Decimals);
    await deployments.execute(
      'PlayToken',
      {from: account, log: true, autoMine: true, value: amountOfNativeToken},
      'mint',
      account,
      parseEther(amount.toString())
    );
  }

  const spaceInfo = new SpaceInfo(OuterSpaceDeployment.linkedData);

  let planetPointer;
  for (let i = 0; i < 4; i++) {
    const outerSpaceContract = await deployments.get('OuterSpace');
    planetPointer = spaceInfo.findNextPlanet(planetPointer);
    await deployments.execute(
      'FreePlayToken',
      {from: players[i].address, log: true, autoMine: true},
      'transferAndCall',
      outerSpaceContract.address,
      BigNumber.from(planetPointer.data.stats.stake).mul('100000000000000'),
      defaultAbiCoder.encode(['address', 'uint256'], [players[i].address, planetPointer.data.location.id])
    );
    console.log(
      `staked: ${planetPointer.data.location.id}, (${planetPointer.data.location.x},${planetPointer.data.location.y})`
    );
  }

  for (let i = 4; i < 8; i++) {
    const outerSpaceContract = await deployments.get('OuterSpace');
    planetPointer = spaceInfo.findNextPlanet(planetPointer);
    await deployments.execute(
      'PlayToken',
      {from: players[i].address, log: true, autoMine: true},
      'transferAndCall',
      outerSpaceContract.address,
      BigNumber.from(planetPointer.data.stats.stake).mul('100000000000000'),
      defaultAbiCoder.encode(['address', 'uint256'], [players[i].address, planetPointer.data.location.id])
    );
    console.log(
      `staked: ${planetPointer.data.location.id}, (${planetPointer.data.location.x},${planetPointer.data.location.y})`
    );
  }

  const allianceAddress = await deployments.read(
    'BasicAllianceFactory',
    {from: players[0].address},
    'getAddress',
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  const nonce0 = 0;
  const message0 = `Join Alliance ${hexZeroPad(allianceAddress.toLowerCase(), 20)}${
    nonce0 === 0 ? '' : ` (nonce: ${('' + nonce0).padStart(10)})`
  }`;
  const player0Signature = players[0].signer.signMessage(message0);

  const nonce1 = 0;
  const message1 = `Join Alliance ${hexZeroPad(allianceAddress.toLowerCase(), 20)}${
    nonce1 === 0 ? '' : ` (nonce: ${('' + nonce0).padStart(10)})`
  }`;
  const player1Signature = players[1].signer.signMessage(message1);

  console.log({message0, message1});
  await deployments.execute(
    'BasicAllianceFactory',
    {from: players[0].address, log: true, autoMine: true},
    'instantiate',
    players[0].address,
    [
      {
        addr: players[0].address,
        nonce: nonce0,
        signature: player0Signature,
      },
      {
        addr: players[1].address,
        nonce: nonce1,
        signature: player1Signature,
      },
    ],
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
