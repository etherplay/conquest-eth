import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {deployments} from 'hardhat';
import fs from 'fs';
// import qrcode from 'qrcode';

// const args = process.argv.slice(2);

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const qrs: string[] = [];
  const csv = await deployments.readDotFile('.claimKeys.csv');
  const rows = csv.split(`\n`);
  for (const row of rows.slice(1)) {
    if (row && row.indexOf(',') !== -1) {
      const rowConverted = row.replace('data:image/png;base64,', '***'); // remove the starting uri, so the coma is not ingested
      const [used, address, key, amount, url, qrURL] = rowConverted.split(',');
      qrs.push(
        qrURL
          .replace(`"`, ``) // remove double quote 1
          .replace(`"`, ``) // remove double quote 2
          .replace('***', 'data:image/png;base64,') // reinstantiate the starting uri
      );
      // const qrURL = await qrcode.toDataURL(url);
      // qrs.push(qrURL);
    }
  }
  fs.writeFileSync('../web/src/qrs.json', JSON.stringify(qrs, null, 2));
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
