/* eslint-disable @typescript-eslint/no-explicit-any */ // TODO remove
import {increaseTime, waitFor, objMap} from '../test-utils';
import {ethers, getUnnamedAccounts, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {Wallet} from '@ethersproject/wallet';
import {keccak256} from '@ethersproject/solidity';
import {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';
import {ContractReceipt} from '@ethersproject/contracts';
import {Provider} from '@ethersproject/providers';
import {parseEther} from '@ethersproject/units';

type AnyContract = any; // TODO ?
type User = {address: string; [contractName: string]: AnyContract};

async function createPlayerAsContracts(player: string, contractNames: string[]): Promise<User> {
  const obj: User = {address: player};
  for (const contractName of contractNames) {
    obj[contractName] = await ethers.getContract(contractName, player);
  }
  return obj;
}

export async function setupOuterSpace(): Promise<{
  getTime: () => number;
  increaseTime(t: number): Promise<void>;
  outerSpaceContract: AnyContract;
  spaceInfo: SpaceInfo;
  players: User[];
  provider: Provider;
}> {
  const {claimKeyDistributor} = await getNamedAccounts();
  const players = await getUnnamedAccounts();
  await deployments.fixture();

  const distribution = [1000, 500, 3000, 100];
  for (let i = 0; i < distribution.length; i++) {
    const account = players[i];
    const amount = distribution[i];
    await deployments.execute(
      'ConquestToken',
      {from: claimKeyDistributor, log: true, autoMine: true},
      'transfer',
      account,
      parseEther(amount.toString())
    );
  }

  const playersAsContracts = [];
  for (const player of players) {
    const playerObj = await createPlayerAsContracts(player, ['OuterSpace', 'ConquestToken']);
    playersAsContracts.push(playerObj);
  }
  const OuterSpaceDeployment = await deployments.get('OuterSpace');
  let deltaTime = 0;
  return {
    getTime() {
      return Math.floor(Date.now() / 1000) + deltaTime;
    },
    async increaseTime(t) {
      await increaseTime(t);
      deltaTime += t;
    },
    outerSpaceContract: (await ethers.getContract('OuterSpace')) as AnyContract,
    spaceInfo: new SpaceInfo(OuterSpaceDeployment.linkedData),
    players: playersAsContracts,
    provider: ethers.provider,
  };
}

export async function sendInSecret(
  spaceInfo: SpaceInfo,
  player: User,
  {from, quantity, to, gift}: {from: PlanetInfo; quantity: number; to: PlanetInfo; gift: boolean}
): Promise<{
  receipt: ContractReceipt;
  timeRequired: number;
  distance: number;
  fleetId: string;
  from: string;
  to: string;
  gift: boolean;
  secret: string;
}> {
  const secret = Wallet.createRandom().privateKey;
  const toHash = keccak256(['bytes32', 'uint256', 'bool'], [secret, to.location.id, gift]);
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
    gift,
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

export async function fetchPlanetState(contract: AnyContract, planet: PlanetInfo): Promise<PlanetState> {
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
