// import {expect} from '../chai-setup';
import {hexZeroPad} from '@ethersproject/bytes';
import {deployments} from 'hardhat';
import {setup} from '../fixtures/outerspaceAndPlayerWithTokens';

describe('Basic Alliance', function () {
  it('create alliance', async function () {
    const {players} = await setup();

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
      {from: players[0].address},
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
  });
});
