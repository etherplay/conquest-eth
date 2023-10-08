<p align="center">
  <a href="https://conquest.game">
    <img src="web/static/conquest.png" alt="Conquest Logo" width="500">
  </a>
</p>
<p align="center">
  <a href="https://twitter.com/conquest_eth">
    <img alt="Twitter" src="https://img.shields.io/badge/Twitter-1DA1F2?logo=twitter&logoColor=white" />
  </a>

  <a href="https://github.com/etherplay/conquest-eth-v0">
    <img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/etherplay/conquest-eth-v0">
  </a>
  <!-- <a href="https://github.com/etherplay/conquest-eth-v0">
  <img alt="Build" src="https://github.com/etherplay/conquest-eth-v0/actions/workflows/build.yml/badge.svg">
  </a> -->
  <a href="https://github.com/etherplay/conquest-eth-v0/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/etherplay/conquest-eth-v0.svg">
  </a>
  <a href="https://github.com/etherplay/conquest-eth-v0/issues">
    <img alt="open issues" src="https://isitmaintained.com/badge/open/etherplay/conquest-eth-v0.svg">
  </a>
</p>

---

# A Game of Diplomacy, Fully Persistent and Permission-less


[Conquest.eth](https://conquest.game) is an "infinite game", a permission-less, immutable, and interoperable game. An Unstoppable game where all meaningful actions happen on-chain.

If you are interested to know more about infinite games and autonomous worlds, check out our [blog post](https://ronan.eth.limo/blog/infinite-games/)


## What will you find here ?

Here is the full source code, published under the [AGPL-3.0 license](https://www.gnu.org/licenses/agpl-3.0.en.html) for [Conquest.eth](https://conquest.game). You can run it fully locally or hook it up with the Gnosis blockchain to play the real game right out of localhost.

> ⚠ Note that some of the graphical assets are not open-source and if you want to release a fork, you'll have to procure your own assets or purchase a license for these assets. Contact [Helianthus](https://twitter.com/HelianthusGames)

## 🎮 How do you play ?

You can always play the persistent game, [DEFCON edition](https://defcon.conquest.etherplay.io/).

To read more, check out [player handbook](https://knowledge.conquest.game) or our [game book](https://book.conquest.game)

## 🎎 Who we are?

We are [Etherplay](https://etherplay.io), a game studio creating Autonomous Worlds, or what we like to call ["Infinite Games"](https://ronan.eth.limo/infinite-games/) including [Ethernal](https://ethernal.land), [Conquest.eth](https://conquest.game) and [Stratagems](https://stratagems.world).

The team is for now, just me, [Ronan Sandford](https://twitter.com/wighawag).

Ronan is a game designer with love for permissionless-ness. He is also an active developer in the web3 space with contributions towards EIPs like [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) and [ERC-2771](https://eips.ethereum.org/EIPS/eip-2771), but also tools like [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) and [Jolly-Roger](https://jolly-roger.eth.limo). He has been tinkering with on-chain NFTs with [Mandalas](https://mandalas.eth.limo) and [Bleeps](https://bleeps.art). You can find more on his [personal website](https://ronan.eth.limo).

## 💻 Install

> We are assuming here that you have [nodejs](https://nodejs.org/en) and [pnpm](https://pnpm.io/) installed
>
> We also uses [docker](https://www.docker.com/)


### docker and docker-compose

`docker` is used to setup the external services (an ethereum node, an ipfs node and a [subgraph](https://thegraph.com) node)

If you prefer (or do not have access to docker/docker-compose) you can run them independently.

### intall dependencies :

```bash
pnpm install
```

#### Development

The following command will start everything up.

```bash
pnpm start
```

This will run each processes in their own terminal window/tab. Note that you might need configuration based on your system.

On linux it uses `xterm` by default (so you need that installed).

On windows it use `cmd.exe` by default.

If you need some other terminal to execute the separate processes, you can configure it in `.newsh.json`.

This command will bring 5 shells up

1. docker-compose: running the ethereum node, ipfs node and subgraph node.
2. common-lib: watching for changes and recompiling to js.
3. web app: watching for changes. Hot Module Replacement enabled. (will reload on common-lib changes)
4. contracts: watching for changes. For every code changes, contract are redeployed, with proxies keeping their addresses.
5. subgraph: watch for code or template changes and redeploy.

Once docker-compose is running, you can stop the other shells and restart them if needed via

```bash
pnpm dev
```

Alternatively you can call the following first : this will setup the external services only (ipfs, ethereum and graph nodes)

```bash
pnpm externals
```

and then run `pnpm dev` to bring up the rest in watch mode.

You can also always run them individually

### full list of commands

Here is the list of npm scripts you can execute:

Some of them relies on [./\_scripts.js](./_scripts.js) to allow parameterizing it via command line argument (have a look inside if you need modifications)
<br/><br/>

`pnpm prepare`

As a standard lifecycle npm script, it is executed automatically upon install. It generate various config file for you, including vscode files.
<br/><br/>

`pnpm setup`

this will update name of the project (by default "jolly-roger") to be the name of the folder (See `set-name` command) and install the dependencies (`pnpm install`)
<br/><br/>

`pnpm set-name [<new name>]`

This will replace every instance of `jolly-roger` (or whatever name was set) to `new name` (if specified, otherwise it use the folder name)
If your name is not unique and conflict with variable name, etc... this will not be safe to execute.
<br/><br/>

`pnpm common:dev`

This will compile the common-library and watch for changes.
<br/><br/>

`pnpm common:build`

This will compile the common library and terminate
<br/><br/>

`pnpm contracts:dev`

This will deploy the contract on localhost and watch for changes and recompile/redeploy when so.
<br/><br/>

`pnpm contracts:deploy [<network>]`

This will deploy the contract on the network specified.

If network is a live network, a mnemonic and url will be required. the following env need to be set:

- `MNEMONIC_<network name>`
- `ETH_NODE_URI_<network name>`
  <br/><br/>

`pnpm seed [<network>]`

This will execute the contracts/scripts/seed.ts on the network specified
<br/><br/>

`pnpm subgraph:dev`

This will setup and deploy the subgraph on localhost and watch for changes.
<br/><br/>

`pnpm subgraph:deploy [<network>]`

This will deploy subgraph on the network specified. If network is a live network, the following env beed to be set:

- `THEGRAPH_TOKEN` token giving you write access to thegraph.com service
  <br/><br/>

`pnpm web:dev [<network>]`

This will spawn a vite dev server for the webapp, connected to the specified network
<br/><br/>

`pnpm web:build [<network>]` or `pnpm build [<network>]`

This will build a static version of the web app for the specified network.

If no network are specified it will fetch from the env variable `NETWORK_NAME`. If no such env variable is set, it will try to fetch the git's branch name.
<br/><br/>

`pnpm web:serve`

This will serve the static file as if on an ipfs gateway.
<br/><br/>

`pnpm web:build:serve [<network>]`

this both build and serve the web app.
<br/><br/>

`pnpm web:deploy <network>`

This build and deploy the web app on ipfs for the network specified.

You ll need the following env variables setup :

- `IPFS_DEPLOY_PINATA__API_KEY` │
- `IPFS_DEPLOY_PINATA__SECRET_API_KEY`

<br/><br/>

`pnpm deploy [<network>]`

This will deploy all (contracts, subgraph and web app). See below for more details.

If no network are specified it will fetch from the env variable `NETWORK_NAME`. If no such env variable is set, it will try to fetch the git's branch name.
<br/><br/>

`pnpm deploy:noweb [<network>]`

This will deploy all (contracts, subgraph) except web app. See below for more details.

If no network are specified it will fetch from the env variable `NETWORK_NAME`. If no such env variable is set, it will try to fetch the git's branch name.
<br/><br/>

`pnpm stop`

This stop the docker services running
<br/><br/>

`pnpm externals`
This spawn docker services: an ethereum node, an IPFS node and a subgraph node
<br/><br/>

`pnpm dev`
This assume external service run. It will spawn a web server, watch/build the common library, the web app, the contracts and the subgraph. It will also seed the contracts with some data.
<br/><br/>

`pnpm start`
It will spawn everything needed to get started, external services, a web server, watch/build the common library, the web app, the contracts and the subgraph. It will also seed the contracts with some data.
<br/><br/>

### env variables required for full deployment

You need to gather the following environment variables :

- `THEGRAPH_TOKEN=<graph token used to deploy the subgraph on thegraph.com>`
- `INFURA_TOKEN=<infura token to talk to a network>`
- `IPFS_DEPLOY_PINATA__API_KEY=<pinata api key>`
- `IPFS_DEPLOY_PINATA__SECRET_API_KEY=<pinata secret key>`
- `MNEMONIC=<mnemonic of the account that will deploy the contract>` (you can also use `MNEMONIC_<network name>`)

Note that pinata is currently the default ipfs provider setup but ipfs-deploy, the tool used to deploy to ipfs support other providers, see : https://github.com/ipfs-shipyard/ipfs-deploy

For production and staging, you would need to set MENMONIC too in the respective `.env.production` and `.env.staging` files.

You can remove the env if you want to use the same as the one in `.env`

You'll also need to update the following for staging and production :

- `SUBGRAPH_NAME=<thegraph account name>/<subgraph name>`
- `VITE_CHAIN_ID=<id of the chain where contracts lives>`
- `VITE_THE_GRAPH_HTTP=https://api.thegraph.com/subgraphs/name/<thegraph account name>/<subgraph name>`

you then need to ensure you have a subgraph already created on thegraph.com with that name: https://thegraph.com/explorer/dashboard

Furthermore, you need to ensure the values in [web/application.json](web/application.json) are to your liking. Similar for the the web/public/preview.png image that is used for open graph metadata. The application.json is also where you setup the ens name if any.

