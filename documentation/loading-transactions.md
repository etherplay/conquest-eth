## launch node

`pnpm hardhat node -- --no-deploy --no-reset --hostname 0.0.0.0 --port 8545 --watch --export contractsInfo.json`

## execute saved transactions

`pnpm contracts:execute localhost contracts/scripts/executeTransactions.ts`

## start

`pnpm start:nonode`
