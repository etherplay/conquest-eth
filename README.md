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
>
> And [Zellij](https://zellij.dev/) for easily launching the game locally
>
> For nodejs we use version 14. If you use volta for version management, it will automatically pick the correct version

### docker and docker-compose

`docker` is used to setup the external services (an ethereum node, an ipfs node and a [subgraph](https://thegraph.com) node)

If you prefer (or do not have access to docker/docker-compose) you can run them independently.

### intall dependencies :

```bash
pnpm install
```

### Development

The following command will start everything up. But you need to have [Zellij](https://zellij.dev/) installed

```bash
pnpm start
```

### Play locally but connected to Conquest Defcon edition

The following will launch the client on http://localhost:3000

```bash
pnpm web defcon
```
