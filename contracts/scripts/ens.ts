import {ethers} from 'hardhat';

const args = process.argv.slice(2);

async function main() {
  const address = args[0];
  const name = await ethers.provider.lookupAddress(address);
  console.log(name);
}

main();
