// import {expect} from '../chai-setup';
import {expectRevert, waitFor} from '../test-utils';
import {sendInSecret, setupOuterSpace, fetchPlanetState} from './utils';
// import {BigNumber} from '@ethersproject/bignumber';
// import {expect} from '../chai-setup';
import {ethers} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {defaultAbiCoder} from '@ethersproject/abi';

// const stableTokenUnit = BigNumber.from('1000000000000000000');
describe('OuterSpace Basic', function () {
  it('user can acquire virgin planet', async function () {
    const {players, spaceInfo, outerSpaceContract} = await setupOuterSpace();
    const pointer = spaceInfo.findNextPlanet();
    // console.log({
    //   location: pointer.data.location.id,
    //   stake: pointer.data.stats.stake,
    //   stakeMultiplier: spaceInfo.stakeMultiplier.toString(),
    // });
    const amount = BigNumber.from(pointer.data.stats.stake).mul('1000000000000000000');
    await waitFor(
      players[0].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount,
        defaultAbiCoder.encode(['address', 'uint256'], [players[0].address, pointer.data.location.id])
      )
    );
  });

  it('user cannot acquire planet already onwed by another player', async function () {
    const {players, spaceInfo, outerSpaceContract} = await setupOuterSpace();
    const pointer = spaceInfo.findNextPlanet();
    const amount = BigNumber.from(pointer.data.stats.stake).mul('1000000000000000000');
    await waitFor(
      players[0].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount,
        defaultAbiCoder.encode(['address', 'uint256'], [players[0].address, pointer.data.location.id])
      )
    );
    await expectRevert(
      players[1].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount,
        defaultAbiCoder.encode(['address', 'uint256'], [players[1].address, pointer.data.location.id])
      ),
      'STILL_ACTIVE'
    );
  });

  it("user can attack other player's planet", async function () {
    const {players, spaceInfo, outerSpaceContract, increaseTime, provider} = await setupOuterSpace();
    const p0 = spaceInfo.findNextPlanet();
    let planet0 = await fetchPlanetState(outerSpaceContract, p0.data);
    let planet1 = await fetchPlanetState(outerSpaceContract, spaceInfo.findNextPlanet(p0).data);
    const amount0 = BigNumber.from(planet0.stats.stake).mul('1000000000000000000');
    await waitFor(
      players[0].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount0,
        defaultAbiCoder.encode(['address', 'uint256'], [players[0].address, planet0.location.id])
      )
    );
    const amount1 = BigNumber.from(planet1.stats.stake).mul('1000000000000000000');
    await waitFor(
      players[1].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount1,
        defaultAbiCoder.encode(['address', 'uint256'], [players[1].address, planet1.location.id])
      )
    );
    planet0 = await fetchPlanetState(outerSpaceContract, planet0);
    planet1 = await fetchPlanetState(outerSpaceContract, planet1);

    const block = await provider.getBlock('latest');
    const quantity = planet1.getNumSpaceships(block.timestamp);
    console.log({quantity, blockTime: block.timestamp});
    const sent = await sendInSecret(spaceInfo, players[1], {
      from: planet1,
      quantity,
      to: planet0,
      gift: false,
    });
    if (!sent) {
      throw new Error('no fleet found');
    }
    const {
      fleetId,
      secret,
      from,
      to,
      distance,
      timeRequired,
      gift,
      // potentialAlliances,
    } = sent;
    await increaseTime(timeRequired);

    await waitFor(
      players[1].OuterSpace.resolveFleet(fleetId, {
        from,
        to,
        distance,
        alliance: gift ? '0x0000000000000000000000000000000000000001' : '0x0000000000000000000000000000000000000000',
        secret,
      })
    );
  });

  it('planet production matches estimates', async function () {
    const {players, spaceInfo, outerSpaceContract, increaseTime} = await setupOuterSpace();
    let planet = await fetchPlanetState(outerSpaceContract, spaceInfo.findNextPlanet().data);
    const amount = BigNumber.from(planet.stats.stake).mul('1000000000000000000');
    await waitFor(
      players[0].ConquestToken.transferAndCall(
        outerSpaceContract.address,
        amount,
        defaultAbiCoder.encode(['address', 'uint256'], [players[0].address, planet.location.id])
      )
    );
    planet = await fetchPlanetState(outerSpaceContract, planet);
    const fistTime = (await ethers.provider.getBlock('latest')).timestamp;
    console.log({fistTime});
    await sendInSecret(spaceInfo, players[0], {
      from: planet,
      quantity: planet.getNumSpaceships(fistTime),
      to: planet,
      gift: false,
    });
    await increaseTime(1000);
    const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
    const new_planet = await fetchPlanetState(outerSpaceContract, planet);
    const quantity = new_planet.getNumSpaceships(currentTime);
    console.log({quantity, currentTime});
    await sendInSecret(spaceInfo, players[0], {
      from: planet,
      quantity,
      to: planet,
      gift: false,
    });
    const currentTimeAgain = (await ethers.provider.getBlock('latest')).timestamp;
    const new_planet_again = await fetchPlanetState(outerSpaceContract, planet);
    const quantityAgain = new_planet_again.getNumSpaceships(currentTimeAgain);
    console.log({quantityAgain, currentTimeAgain});
    await expectRevert(
      sendInSecret(spaceInfo, players[0], {
        from: planet,
        quantity: quantityAgain + 2,
        to: planet,
        gift: false,
      })
    );
  });
});
