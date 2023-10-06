/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs-extra');
const path = require('path');
const networks = fs.readdirSync('deployments');

fs.emptyDirSync(path.join('export', 'deployments'));

for (const network of networks) {
  if (network === 'localhost') {
    continue;
  }
  const networkDeploymentFolderpath = path.join('deployments', network);
  const deployments = fs
    .readdirSync(networkDeploymentFolderpath)
    .filter((v) => !v.startsWith('.') && v.endsWith('.json'));
  for (const deploymentFilename of deployments) {
    const filepathIn = path.join(networkDeploymentFolderpath, deploymentFilename);
    const filepathOut = path.join('export', 'deployments', network, deploymentFilename);
    const content = JSON.parse(fs.readFileSync(filepathIn).toString());
    fs.ensureFileSync(filepathOut);
    fs.writeFileSync(
      filepathOut,
      JSON.stringify(
        {
          address: content.address,
          abi: content.abi,
          linkedData: content.linkedData,
          transactionHash: content.transactionHash,
          receipt: content.receipt,
          implementation: content.implementation,
          facets: content.facets,
          execute: content.execute,
          args: content.args,
          numDeployments: content.numDeployments,
          // bytecode: content.bytecode,
          // deployedBytecode: content.deployedBytecode,
          devdoc: content.devdoc,
          userdoc: content.userdoc,
        },
        null,
        2
      )
    );
  }
}
