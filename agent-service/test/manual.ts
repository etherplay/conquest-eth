import 'isomorphic-fetch';
import {Contract, Wallet} from 'ethers';
// import {OuterSpaceABI} from '../src/data'

async function request(func: string, data: any) {
  const response = await fetch('http://127.0.0.1:8787/' + func, {method: 'POST', body: JSON.stringify(data)});
  if (response.status !== 200) {
    const message = await response.text();
    if (!message) {
      console.log(response.statusText);
    }
    console.error(`ERROR: "${message}"`);
  } else {
    console.log(await response.json());
  }
}

async function main() {
  const playerWallet = Wallet.createRandom();
  const delegateWallet = Wallet.createRandom();

  const registrationSubmission = {
    player: playerWallet.address,
    delegate: delegateWallet.address,
    nonceMsTimestamp: Math.floor(Date.now() - 10),
  };
  const messageString = `conquest-agent-service: register ${registrationSubmission.delegate.toLowerCase()} as delegate for ${registrationSubmission.player.toLowerCase()} (nonce: ${
    registrationSubmission.nonceMsTimestamp
  })`;
  const registerSignature = await playerWallet.signMessage(messageString);

  await request('register', {
    ...registrationSubmission,
    signature: registerSignature,
  });

  console.log('......');

  const revealSubmission = {
    player: playerWallet.address.toLowerCase(),
    fleetID: '0x01',
    secret: '0x01',
    from: {x: 0, y: 1},
    to: {x: 1, y: 1},
    distance: 1,
    startTime: 1,
    duration: 1,
    nonceMsTimestamp: Math.floor(Date.now()),
  };

  const {player, fleetID, secret, from, to, distance, startTime, duration} = revealSubmission;
  const queueMessageString = `queue:${player}:${fleetID}:${secret}:${from.x}:${from.y}:${to.x}:${to.y}:${distance}:${startTime}:${duration}:${revealSubmission.nonceMsTimestamp}`;
  const queueSignature = await delegateWallet.signMessage(queueMessageString);
  console.log({queueMessageString, queueSignature, player, delegate: delegateWallet.address.toLowerCase()});
  await request('queueReveal', {
    ...revealSubmission,
    signature: queueSignature,
    delegate: delegateWallet.address.toLowerCase(),
  });
}

main();
