/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config()
const fs = require('fs-extra')
const path = require('path')
const Handlebars = require('handlebars')

const args = process.argv.slice(2)
const pathArg = args[0]

if (!pathArg) {
  console.error(
    `please provide the path to contracts info, either a directory of deployemnt or a single export file`,
  )
}
if (!fs.existsSync(pathArg)) {
  console.error(`file ${pathArg} doest not exits`)
}

// TODO use chain.network

let networkName = 'unknown'
let chainId = 'unknown'

let finality = 8 // TODO

const stat = fs.statSync(pathArg)
let contractsInfo
if (stat.isDirectory()) {
  let normalizedPath = pathArg
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, normalizedPath.length - 1)
  }
  networkName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

  chainId = fs.readFileSync(path.join(pathArg, '.chainId')).toString()

  contractsInfo = {
    contracts: {},
  }
  const files = fs.readdirSync(pathArg, { withFileTypes: true })
  for (const file of files) {
    if (
      !file.isDirectory() &&
      file.name.substr(file.name.length - 5) === '.json' &&
      !file.name.startsWith('.')
    ) {
      const contractName = file.name.substr(0, file.name.length - 5)
      contractsInfo.contracts[contractName] = JSON.parse(
        fs.readFileSync(path.join(pathArg, file.name)).toString(),
      )
    }
  }
} else {
  const contractsInfoFile = JSON.parse(fs.readFileSync(pathArg)).toString()
  networkName = contractsInfoFile.name
  chainId = contractsInfoFile.chainId
  contractsInfo = {
    contracts: contractsInfoFile.contracts,
  }
}

const contracts = {}
for (const contractName of Object.keys(contractsInfo.contracts)) {
  const contractInfo = contractsInfo.contracts[contractName]
  contracts[contractName] = {
    address: contractInfo.address,
    linkedData: contractInfo.linkedData,
    abi: contractInfo.abi,
  }
}

fs.writeFileSync(
  path.join(__dirname, 'src/contracts.json'),
  JSON.stringify(
    {
      name: networkName,
      chainId,
      contracts,
    },
    null,
    '  ',
  ),
)

if (networkName === 'quick') {
  finality = 3
}

const template = Handlebars.compile(
  fs.readFileSync('./templates/wrangler.toml.hbs').toString(),
)
const environment = networkName === 'localhost' ? 'dev' : 'production'
const result = template({
  devMode: 'true', // TODOenvironment === 'dev' ? 'true' : 'false',
  networkName,
  ETHEREUM_NODE: process.env.AGENT_SERVICE_ETHEREUM_NODE,
  DATA_DOG_API_KEY: process.env.DATA_DOG_API_KEY,
  FINALITY: finality,
  chainId,
  environment,
})
fs.writeFileSync('./wrangler.toml', result)
