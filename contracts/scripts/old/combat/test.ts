import fs from 'fs';
import path from 'path';

type Result = {
  attackerLoss: number;
  defenderLoss: number;
  win: boolean;
  numSpaceships: number;
};

type Values = {
  numAttack: number;
  numDefense: number;
  attack: number;
  defense: number;
};

function fromRow(row: number[]): Values {
  return {
    attack: row[0],
    numAttack: row[1],
    defense: row[2],
    numDefense: row[3],
  };
}

function currentRule(row: number[]): Result {
  const {numAttack, numDefense, attack, defense} = fromRow(row);
  let attackerLoss = 0;
  let defenderLoss = 0;
  let win = false;
  let numSpaceships = numDefense;
  if (numAttack == 0 || numDefense == 0) {
    return {defenderLoss, attackerLoss, win, numSpaceships};
  }
  const attackDamage = Math.floor((numAttack * attack) / defense);

  if (numDefense > attackDamage) {
    // attack fails
    attackerLoss = numAttack; // all attack destroyed
    defenderLoss = attackDamage; // 1 spaceship will be left at least as attackDamage < numDefense

    win = false;
    numSpaceships = numDefense - defenderLoss;
  } else {
    // attack succeed
    let defenseDamage = Math.floor((numDefense * defense) / attack);
    if (defenseDamage >= numAttack) {
      defenseDamage = numAttack - 1; // ensure 1 spaceship left
    }

    attackerLoss = defenseDamage;
    defenderLoss = numDefense; // all defense destroyed

    win = true;
    numSpaceships = numAttack - attackerLoss;
  }
  return {defenderLoss, attackerLoss, win, numSpaceships};
}

function oldRule(row: number[]): Result {
  const {numAttack, numDefense, attack, defense} = fromRow(row);
  let attackerLoss = 0;
  let defenderLoss = 0;
  let win = false;
  let numSpaceships = numDefense;
  if (numAttack == 0 || numDefense == 0) {
    return {defenderLoss, attackerLoss, win, numSpaceships};
  }
  const attackPower = numAttack * attack;
  const defensePower = numDefense * defense;

  let numAttackRound = Math.floor((numDefense * 100000000) / attackPower);
  if (numAttackRound * attackPower < numDefense * 100000000) {
    numAttackRound++;
  }
  let numDefenseRound = Math.floor((numAttack * 100000000) / defensePower);
  if (numDefenseRound * defensePower < numAttack * 100000000) {
    numDefenseRound++;
  }

  const numRound = Math.min(numAttackRound, numDefenseRound);
  attackerLoss = Math.floor(Math.min((numRound * defensePower) / 100000000, numAttack));
  defenderLoss = Math.floor(Math.min((numRound * attackPower) / 100000000, numDefense));

  if (defenderLoss >= numDefense) {
    win = true;
    numSpaceships = numAttack - attackerLoss;
  } else {
    win = false;
    numSpaceships = numDefense - defenderLoss;
  }
  return {defenderLoss, attackerLoss, win, numSpaceships};
}

async function main() {
  const datastr = fs.readFileSync(path.join(__dirname, 'data.json')).toString();
  const data = JSON.parse(datastr) as number[][];
  console.log('---------------------------------------------------------------------------------------------------');
  console.log('OLD RULE');
  console.log('---------------------------------------------------------------------------------------------------');
  data.map(oldRule).map((v) => console.log(v));
  console.log('---------------------------------------------------------------------------------------------------');
  console.log('CURRENT RULE');
  console.log('---------------------------------------------------------------------------------------------------');
  data.map(currentRule).map((v) => console.log(v));
  console.log('---------------------------------------------------------------------------------------------------');
  console.log('NEW RULE');
  console.log('---------------------------------------------------------------------------------------------------');
  data.map(newRule).map((v) => console.log(v));
}

function newRule(row: number[]): Result {
  const {numAttack, numDefense, attack, defense} = fromRow(row);
  let attackerLoss = 0;
  let defenderLoss = 0;
  let win = false;
  let numSpaceships = numDefense;
  if (numAttack == 0 || numDefense == 0) {
    return {defenderLoss, attackerLoss, win, numSpaceships};
  }

  const attackDamage = Math.floor((((numAttack + (numAttack / numDefense) * numAttack) / 2) * attack) / defense);

  if (numDefense > attackDamage) {
    // attack fails
    attackerLoss = numAttack; // all attack destroyed
    defenderLoss = attackDamage; // 1 spaceship will be left at least as attackDamage < numDefense

    win = false;
    numSpaceships = numDefense - defenderLoss;
  } else {
    // attack succeed
    let defenseDamage = Math.floor((((numDefense + (numDefense / numAttack) * numDefense) / 2) * defense) / attack);
    if (defenseDamage >= numAttack) {
      defenseDamage = numAttack - 1; // ensure 1 spaceship left
    }

    attackerLoss = defenseDamage;
    defenderLoss = numDefense; // all defense destroyed

    win = true;
    numSpaceships = numAttack - attackerLoss;
  }
  return {
    defenderLoss,
    attackerLoss,
    win,
    numSpaceships,
    // numDefense,
    // numAttack,
  } as any;
}

main();
