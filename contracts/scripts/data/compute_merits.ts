import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {formatEther} from '@ethersproject/units';
import fs from 'fs/promises';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;

  const players_captures: {playerAddress: string; amountCaptured: string; numPlanetsCaptured: number}[] = JSON.parse(
    await deployments.readDotFile('.players_captures.json')
  );

  const players_stakes: {playerAddress: string; amountStaked: string; numPlanetsStaked: number}[] = JSON.parse(
    await deployments.readDotFile('.players_stakes.json')
  );

  let totalNumPlayerWhoCaptured = players_captures.length;
  let totalPlanetsCaptured = 0n;
  let totalAmountCaptured = 0n;
  let maxAmountCaptured = 0n;
  let maxPlanetsCaptured = 0n;
  for (const capture of players_captures) {
    const amountCaptured = BigInt(capture.amountCaptured);
    const numPlanetsCaptured = BigInt(capture.numPlanetsCaptured);
    totalAmountCaptured += amountCaptured;
    totalPlanetsCaptured += numPlanetsCaptured;
    if (amountCaptured > maxAmountCaptured) {
      maxAmountCaptured = amountCaptured;
    }
    if (numPlanetsCaptured > maxPlanetsCaptured) {
      maxPlanetsCaptured = numPlanetsCaptured;
    }
  }

  let totalNumPlayerWhoStaked = players_stakes.length;
  let totalPlanetsStaked = 0n;
  let totalAmountStaked = 0n;
  let maxAmountStaked = 0n;
  let maxPlanetsStaked = 0n;
  for (const stake of players_stakes) {
    const amountStaked = BigInt(stake.amountStaked);
    const numPlanetsStaked = BigInt(stake.numPlanetsStaked);
    totalAmountStaked += amountStaked;
    totalPlanetsStaked += numPlanetsStaked;
    if (amountStaked > maxAmountStaked) {
      maxAmountStaked = amountStaked;
    }
    if (numPlanetsStaked > maxPlanetsStaked) {
      maxPlanetsStaked = numPlanetsStaked;
    }
  }

  const totalMeritsPointPerWeek = 10000;
  const captureWeight = 3;
  const stakeWeight = 1;
  const maxPointsPerPlayer = 1000;

  const playerMerits: {[address: string]: number} = {};

  const totalWeightedPoints = totalAmountCaptured * BigInt(captureWeight) + totalAmountStaked * BigInt(stakeWeight);

  for (const capture of players_captures) {
    const amountCaptured = BigInt(capture.amountCaptured);
    const capturePoints = Number(
      (amountCaptured * BigInt(captureWeight) * BigInt(totalMeritsPointPerWeek)) / totalWeightedPoints
    );
    playerMerits[capture.playerAddress] = (playerMerits[capture.playerAddress] || 0) + capturePoints;
  }

  for (const stake of players_stakes) {
    const amountStaked = BigInt(stake.amountStaked);
    const stakePoints = Number(
      (amountStaked * BigInt(stakeWeight) * BigInt(totalMeritsPointPerWeek)) / totalWeightedPoints
    );
    playerMerits[stake.playerAddress] = (playerMerits[stake.playerAddress] || 0) + stakePoints;
  }

  // Apply cap and redistribute excess points
  let totalDistributedPoints = 0;
  let excessPoints = 0;

  do {
    totalDistributedPoints = 0;
    excessPoints = 0;
    const uncappedPlayers: string[] = [];

    for (const [address, points] of Object.entries(playerMerits)) {
      if (points > maxPointsPerPlayer) {
        excessPoints += points - maxPointsPerPlayer;
        playerMerits[address] = maxPointsPerPlayer;
        totalDistributedPoints += maxPointsPerPlayer;
      } else {
        totalDistributedPoints += points;
        if (points < maxPointsPerPlayer) {
          uncappedPlayers.push(address);
        }
      }
    }

    if (excessPoints > 0 && uncappedPlayers.length > 0) {
      // Sort uncapped players by their current points (descending)
      uncappedPlayers.sort((a, b) => playerMerits[b] - playerMerits[a]);

      for (const address of uncappedPlayers) {
        if (excessPoints <= 0) break;
        const currentPoints = playerMerits[address];
        const pointsToAdd = Math.min(maxPointsPerPlayer - currentPoints, excessPoints);
        playerMerits[address] += pointsToAdd;
        excessPoints -= pointsToAdd;
        totalDistributedPoints += pointsToAdd;
      }
    }
  } while (excessPoints > 0 && totalDistributedPoints < totalMeritsPointPerWeek);

  // Distribute any remaining points to all players evenly
  if (totalDistributedPoints < totalMeritsPointPerWeek) {
    const remainingPoints = totalMeritsPointPerWeek - totalDistributedPoints;
    const players = Object.keys(playerMerits);
    let index = 0;

    while (totalDistributedPoints < totalMeritsPointPerWeek) {
      const address = players[index % players.length];
      if (playerMerits[address] < maxPointsPerPlayer) {
        playerMerits[address]++;
        totalDistributedPoints++;
      }
      index++;
    }
  }

  const sortedPlayers = Object.entries(playerMerits)
    .sort(([, a], [, b]) => b - a)
    .map(([address, points]) => ({address, points}));

  const computedTotal = sortedPlayers.reduce((prev, curr) => {
    return prev + curr.points;
  }, 0);

  if (computedTotal !== totalMeritsPointPerWeek) {
    throw new Error(
      `Computed total ${computedTotal} does not match totalMeritsPointPerWeek ${totalMeritsPointPerWeek}`
    );
  }

  const outputPath = './player_merits.json';
  await fs.writeFile(outputPath, JSON.stringify(sortedPlayers, null, 2));

  console.log({
    totalAmountCaptured: formatEther(totalAmountCaptured),
    totalPlanetsCaptured,
    maxAmountCaptured: formatEther(maxAmountCaptured),
    maxPlanetsCaptured,
    totalAmountStaked: formatEther(totalAmountStaked),
    totalPlanetsStaked,
    maxAmountStaked: formatEther(maxAmountStaked),
    maxPlanetsStaked,
    totalNumPlayerWhoCaptured,
    totalNumPlayerWhoStaked,
    totalMeritsPointPerWeek,
    numberOfPlayersWithMerits: sortedPlayers.length,
    outputPath,
  });
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
