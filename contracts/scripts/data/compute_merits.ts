import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {formatEther} from '@ethersproject/units';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;

  const players_captures: {playerAddress: string; amountCaptured: string; numPlanetsCaptured: number}[] = JSON.parse(
    await deployments.readDotFile('.players_captures.json')
  );

  const players_stakes: {playerAddress: string; amountStaked: string; numPlanetsStaked: number}[] = JSON.parse(
    await deployments.readDotFile('.players_stakes.json')
  );

  let totalNumPlayerWhoCaptured = Object.keys(players_captures).length;
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

  let totalNumPlayerWhoStaked = Object.keys(players_stakes).length;
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
  });
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
