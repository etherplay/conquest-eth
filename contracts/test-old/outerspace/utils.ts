/* eslint-disable @typescript-eslint/no-explicit-any */ // TODO remove
import {waitFor, objMap} from '../test-utils';
import {BigNumber} from '@ethersproject/bignumber';
import {Wallet} from '@ethersproject/wallet';
import {keccak256} from '@ethersproject/solidity';
import {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';
import {Contract, ContractReceipt} from '@ethersproject/contracts';
import {defaultAbiCoder} from '@ethersproject/abi';
import {User} from '../../utils';

export type Player = User<{ConquestToken: Contract; OuterSpace: Contract}>;

export async function sendInSecret(
  spaceInfo: SpaceInfo,
  player: Player,
  {from, quantity, to}: {from: PlanetInfo; quantity: number; to: PlanetInfo}
): Promise<{
  receipt: ContractReceipt;
  timeRequired: number;
  distance: number;
  fleetId: string;
  from: string;
  to: string;
  secret: string;
}> {
  const secret = Wallet.createRandom().privateKey;
  const toHash = keccak256(['bytes32', 'uint256'], [secret, to.location.id]);
  const fleetId = keccak256(['bytes32', 'uint256'], [toHash, from.location.id]);
  const receipt = await waitFor<ContractReceipt>(
    player.OuterSpace.send(from.location.id, quantity, toHash) // TODO subId
  );
  const distanceSquared =
    Math.pow(to.location.globalX - from.location.globalX, 2) + Math.pow(to.location.globalY - from.location.globalY, 2);
  const distance = Math.floor(Math.sqrt(distanceSquared));
  const timeRequired = BigNumber.from(distance)
    .mul(1 * spaceInfo.timePerDistance * 10000)
    .div(from.stats.speed)
    .toNumber();
  return {
    receipt,
    timeRequired,
    distance,
    fleetId,
    from: from.location.id,
    to: to.location.id,
    secret,
  };
}

// TODO get benefit from typescript
export function convertPlanetCallData(o: string | number | BigNumber): string | number {
  if (typeof o === 'number') {
    return o;
  }
  if (typeof o === 'string') {
    return o;
  }
  if (o._isBigNumber && o.lte(2147483647) && o.gte(-2147483647)) {
    return o.toNumber();
  }
  return o.toString();
}

type PlanetState = PlanetInfo & {
  state: any; // TODO
  getNumSpaceships: (time: number) => number;
};

export async function fetchPlanetState(contract: Contract, planet: PlanetInfo): Promise<PlanetState> {
  const planetData = await contract.callStatic.getPlanet(planet.location.id);
  const statsFromContract = objMap(planet.stats, convertPlanetCallData);
  // check as validty assetion:
  for (const key of Object.keys(statsFromContract)) {
    const value = statsFromContract[key];
    if (value !== (planet as any).stats[key]) {
      throw new Error(`${key}: ${(planet as any).stats[key]} not equal to contract stats : ${value} `);
    }
  }
  const state = objMap(planetData.state, convertPlanetCallData);
  return {
    ...planet,
    state,
    getNumSpaceships(time: number) {
      // console.log({state, stats: planet.stats, time});
      let newSpaceships = 0;
      if (time > state.lastUpdated) {
        console.log({
          time,
          lastUpdated: state.lastUpdated,
          numSpaceships: state.numSpaceships,
          production: planet.stats.production,
        });
        newSpaceships = Math.floor(((time - state.lastUpdated) * planet.stats.production) / 3600);
      }
      return state.numSpaceships + newSpaceships;
    },
  };
}

export function acquire(player: Player, planet: PlanetInfo): Promise<ContractReceipt> {
  const amount = BigNumber.from(planet.stats.stake).mul('1000000000000000000');
  return waitFor(
    player.ConquestToken.transferAndCall(
      player.OuterSpace.address,
      amount,
      defaultAbiCoder.encode(['address', 'uint256'], [player.address, planet.location.id])
    )
  );
}
