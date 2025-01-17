/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");
const {execSync} = require('child_process');

const args = process.argv.slice(2);
const pathArg = args[0];

if (!pathArg) {
  console.error(
    `please provide the path to contracts info, either a directory of deployemnt or a single export file`
  );
}
if (!fs.existsSync(pathArg)) {
  console.error(`file ${pathArg} doest not exits`);
}

const chainNames = {
  1: "mainnet",
  3: "ropsten",
  4: "rinkeby",
  5: "goerli",
  42: "kovan",
  1337: "localhost",
  31337: "localhost",
  100: "gnosis",
  7001: "zetachain-athens"
};
// TODO use chain.network

const stat = fs.statSync(pathArg);
let contractsInfo;
if (stat.isDirectory()) {
  const chainId = fs.readFileSync(path.join(pathArg, ".chainId")).toString();
  const chainName = chainNames[chainId];
  if (!chainName) {
    throw new Error(`chainId ${chainId} not know`);
  }

  console.log({directory: true, chainName, chainId});
  contractsInfo = {
    contracts: {},
    chainName,
  };
  const files = fs.readdirSync(pathArg, { withFileTypes: true });
  for (const file of files) {
    console.log(`${file.path}...`);
    if (
      !file.isDirectory() &&
      file.name.substr(file.name.length - 5) === ".json" &&
      !file.name.startsWith(".")
    ) {
      const contractName = file.name.substr(0, file.name.length - 5);
      contractsInfo.contracts[contractName] = JSON.parse(
        fs.readFileSync(path.join(pathArg, file.name)).toString()
      );
    }
  }
} else {
  const contractsInfoFile = JSON.parse(fs.readFileSync(pathArg).toString());

  const chainId = contractsInfoFile.chainId;
  const chainName = chainNames[chainId];
  if (!chainName) {
    throw new Error(`chainId ${chainId} not know`);
  }

  console.log({directory: false, chainName, chainId});

  contractsInfo = {
    contracts: contractsInfoFile.contracts,
    chainName,
  };
}

const contracts = contractsInfo.contracts;
fs.emptyDirSync("./abis");
fs.copySync("./interfaces_abis", "./abis");
for (const contractName of Object.keys(contracts)) {
  const contractInfo = contracts[contractName];
  fs.writeFileSync(
    path.join("abis", contractName + ".json"),
    JSON.stringify(contractInfo.abi)
  );
}

console.log({chainName: contractsInfo.chainName});

const templateSubgraphYaml = Handlebars.compile(
  fs.readFileSync("./templates/subgraph.yaml").toString()
);
const resultSubgraphYaml = templateSubgraphYaml(contractsInfo);
fs.writeFileSync("./subgraph.yaml", resultSubgraphYaml);

if (contractsInfo.contracts.RewardsGenerator.linkedData) {
  let templateConfigFile;
  try {
    templateConfigFile = fs.readFileSync("./templates/config.ts").toString();
  }  catch{}
  if (templateConfigFile) {
    const templateConfig = Handlebars.compile(
      templateConfigFile
    );

    function getCommitHash() {
      try {
        return execSync('git rev-parse --short HEAD').toString().trim();
      } catch (err){
        const timestamp = Date.now().toString();
        console.error(err);
        console.error(`could not get commit-hash to set a version id, falling back on timestamp ${timestamp}`);
        
        return timestamp;
      }
    }
    const commitHash = getCommitHash();

    const resultConfig = templateConfig({...contractsInfo, commitHash});
    fs.writeFileSync("./src/config.ts", resultConfig);
    
  }
}

