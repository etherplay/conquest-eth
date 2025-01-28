import {locationToXY, xyToLocation} from 'conquest-eth-common';
import 'dotenv/config';
import hre, {deployments} from 'hardhat';
import {getTHEGRAPH} from './utils';

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);
const sponsor = args[1];

if (!blockNumber) {
  console.error(`no blockNumber provided`);
  process.exit(1);
}

if (!sponsor) {
  console.error(`no sponsor provided`);
  process.exit(1);
}

const planetsPerSponsors: {[sponsor: string]: {x: number; y: number; location: string}[]} = {
  blockscout: [
    {
      x: 12,
      y: 20,
      location: '0x000000000000000000000000000000140000000000000000000000000000000c',
    },
    {
      x: 11,
      y: 18,
      location: '0x000000000000000000000000000000120000000000000000000000000000000b',
    },
    {
      x: 4,
      y: -11,
      location: '0xfffffffffffffffffffffffffffffff500000000000000000000000000000004',
    },
    {
      x: 5,
      y: -9,
      location: '0xfffffffffffffffffffffffffffffff700000000000000000000000000000005',
    },
  ],
};

const planets = planetsPerSponsors[sponsor].map((v) => {
  return v.location;
});

console.log({
  planets: planets.map((v) => `${locationToXY(v).x}, ${locationToXY(v).y}`),
  planetIds: planets,
});

const queryString = `
query($planets: [ID!]! $blockNumber: Int!) {
  planetExitEvents(orderBy: timestamp orderDirection: asc block: {number: $blockNumber} where: {planet_in: $planets}) {
    planet {id x y}
    owner { id}
    exitTime
    interupted
    complete
    success
  }
  # exitCompleteEvents(orderBy: timestamp orderDirection: asc block: {number: $blockNumber} where: {planet_in: $planets}) {
  #   planet {id x y}
  #   owner { id}
  # }
  planets(block: {number: $blockNumber} where: {id_in: $planets}) {
    id
    owner { id }
  }
}
`;

async function main() {
  const theGraph = await getTHEGRAPH(hre);
  let rewardsAlreadyGiven: {[token: string]: {[address: string]: {given: {tx: string; planets: string[]}[]}}} = {};

  try {
    rewardsAlreadyGiven = JSON.parse(await deployments.readDotFile('.planets_rewards.json'));
  } catch {}

  const result = await theGraph.query(queryString, {
    variables: {planets: planets, blockNumber}, // TODO blockNumber
  });
  const data = result[0] as {
    planetExitEvents: {
      exitTime: string;
      owner: {id: string};
      planet: {id: string; x: number; y: number};
      interupted: boolean;
      complete: boolean;
      success: boolean;
    }[];
    // exitCompleteEvents: {owner: {id: string}; planet: {id: string}}[];
    planets: {owner: {id: string} | null; id: string}[];
  };

  console.log(data);
  // const exited = data.exitCompleteEvents;
  const held = data.planets;
  const now = Date.now() / 1000;
  const exitingDone = data.planetExitEvents.filter(
    (v) => !v.interupted && !v.complete && now - parseInt(v.exitTime) > 3 * 24 * 3600
  );
  const exittedComplete = data.planetExitEvents.filter((v) => v.success);

  const exited = exittedComplete.concat(exitingDone);

  const token = 'unit';
  const amount = 1;

  const winners: {[id: string]: {planets: string[]} & {[token: string]: number}} = {};
  const planetsCounted: {[id: string]: boolean} = {};
  for (const planetExited of exited) {
    if (!planetsCounted[planetExited.planet.id]) {
      winners[planetExited.owner.id] = winners[planetExited.owner.id] || {
        planets: [],
      };
      const planetString = `${locationToXY(planetExited.planet.id).x},${locationToXY(planetExited.planet.id).y}`;

      let alreadyCounted = false;
      if (rewardsAlreadyGiven[token] && rewardsAlreadyGiven[token][planetExited.owner.id]) {
        for (const givenElem of rewardsAlreadyGiven[token][planetExited.owner.id].given) {
          if (givenElem.planets.indexOf(planetString) !== -1) {
            alreadyCounted = true;
          }
        }
      }

      if (!alreadyCounted) {
        winners[planetExited.owner.id][token] = winners[planetExited.owner.id][token] || 0;
        winners[planetExited.owner.id][token] += amount;
        winners[planetExited.owner.id].planets.push(planetString);
      }
      planetsCounted[planetExited.planet.id] = true;
    }
  }

  console.log(JSON.stringify({held}));
  for (const planetHeld of held) {
    if (!planetsCounted[planetHeld.id] && planetHeld.owner) {
      winners[planetHeld.owner.id] = winners[planetHeld.owner.id] || {
        planets: [],
      };
      const planetString = `${locationToXY(planetHeld.id).x},${locationToXY(planetHeld.id).y}`;

      let alreadyCounted = false;
      if (rewardsAlreadyGiven[token] && rewardsAlreadyGiven[token][planetHeld.owner.id]) {
        for (const givenElem of rewardsAlreadyGiven[token][planetHeld.owner.id].given) {
          if (givenElem.planets.indexOf(planetString) !== -1) {
            alreadyCounted = true;
          }
        }
      }

      if (!alreadyCounted) {
        winners[planetHeld.owner.id][token] = winners[planetHeld.owner.id][token] || 0;
        winners[planetHeld.owner.id][token] += amount;
        winners[planetHeld.owner.id].planets.push(planetString);
      }
      planetsCounted[planetHeld.id] = true;
    }
  }

  console.log({
    // winners,
    // planetsCounted,
    exited: JSON.stringify(
      exited.map((v) => {
        return {owner: v.owner.id, x: v.planet.x, y: v.planet.y};
      })
    ),

    // held,
  });

  console.log(`winners`, winners);

  for (const loc of planets) {
    if (!planetsCounted[loc]) {
      console.log(`not counted: ${locationToXY(loc).x}, ${locationToXY(loc).y}`);
    }
  }
}

main();
