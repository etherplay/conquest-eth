import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {ethers} from 'hardhat';
import {Wallet} from 'ethers';
import 'isomorphic-fetch';
import {parseEther} from '@ethersproject/units';
import {request} from './utils';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {getUnnamedAccounts, deployments} = hre;
  const {rawTx} = deployments;
  const delegateWallet = Wallet.createRandom();

  const PaymentGateway = await deployments.get('PaymentGateway');
  const players = await getUnnamedAccounts();
  const player = players[0];
  await rawTx({
    from: player,
    to: PaymentGateway.address,
    value: parseEther('0.1'),
  });

  const registrationSubmission = {
    player,
    delegate: delegateWallet.address,
    nonceMsTimestamp: Math.floor(Date.now() - 10),
  };
  const messageString = `conquest-agent-service: register ${registrationSubmission.delegate.toLowerCase()} as delegate for ${registrationSubmission.player.toLowerCase()} (nonce: ${
    registrationSubmission.nonceMsTimestamp
  })`;
  const registerSignature = await (await ethers.getSigner(player)).signMessage(messageString);

  await request('register', 'POST', {
    ...registrationSubmission,
    signature: registerSignature,
  });
}
if (require.main === module) {
  func(hre);
}
