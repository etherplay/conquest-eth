// TODO delete ?
// import {BaseStoreWithData} from '$lib/utils/stores/base';
// import privateAccount from '$lib/account/privateAccount';
// import {wallet} from '$lib/blockchain/wallet';
// import {blockTime, finality, logPeriod, lowFrequencyFetch} from '$lib/config';
// import type {BigNumber} from '@ethersproject/bignumber';
// import {hexZeroPad} from '@ethersproject/bytes';
// export type AttackEvent = {
//   won: boolean;
//   fleet: string;
//   planet: string;
//   attacker: string;
//   attackerLoss: number;
//   defenderLoss: number;
//   blockNumber: number;
// };

// type FleetArrivedEvent = {
//   args: {
//     fleet: BigNumber;
//     fleetOwner: string;
//     destinationOwner: string;
//     destination: BigNumber;
//     fleetLoss: number;
//     planetLoss: number;
//     inFlightFleetLoss: number;
//     inFlightPlanetLoss: number;
//     won: boolean;
//     newNumspaceships: number;
//   };
//   blockNumber: number;
// };

// export type PlanetLogs = {
//   step: 'IDLE' | 'LOADING' | 'READY';
//   attacksReceived?: {
//     [location: string]: AttackEvent[];
//   };
//   error?: {message?: string};
// };

// class PlanetLogsStore extends BaseStoreWithData<PlanetLogs, undefined> {
//   private address: string | undefined;
//   private lastQueryBlockNumber: number | undefined;
//   private events: AttackEvent[] = [];
//   private timeout: NodeJS.Timeout;
//   public constructor() {
//     super({
//       step: 'IDLE',
//     });

//     privateAccount.subscribe(($privateAccount) => {
//       if ($privateAccount.step === 'READY') {
//         this.start($privateAccount.walletAddress, $privateAccount.data?.logs?.lastBlockNumber);
//         this.syncWithPrivateAccount();
//       } else {
//         this.stop();
//       }
//     });
//   }

//   getEventsForPlanet(location: string) {
//     return this.$store.attacksReceived && this.$store.attacksReceived[location];
//   }

//   async fetch() {
//     const latestBlock = await wallet.provider.getBlock('latest');
//     const toBlock = latestBlock.number - finality;
//     const fromBlockNumber = Math.max(this.lastQueryBlockNumber || 0, toBlock - Math.floor(logPeriod / blockTime)) + 1;
//     const OuterSpace = wallet.contracts.OuterSpace;
//     const addressUsed = this.address.toLowerCase();
//     const filter = OuterSpace.filters.FleetArrived(null, null, this.address);
//     const logs = (await OuterSpace.queryFilter(filter, fromBlockNumber, toBlock)) as unknown as FleetArrivedEvent[];
//     if (addressUsed !== this.address.toLowerCase()) {
//       return; // skip as we are now using a different account
//     }
//     this.lastQueryBlockNumber = toBlock;
//     for (const log of logs) {
//       if (log.args.fleetOwner.toLowerCase() !== addressUsed) {
//         this.events.push({
//           won: log.args.won,
//           fleet: log.args.fleet.toString(),
//           planet: hexZeroPad(log.args.destination.toHexString(), 32),
//           attacker: log.args.fleetOwner,
//           attackerLoss: log.args.fleetLoss,
//           defenderLoss: log.args.planetLoss,
//           blockNumber: log.blockNumber,
//         });
//       }
//     }
//     this.syncWithPrivateAccount();
//     this.timeout = setTimeout(this.fetch.bind(this), lowFrequencyFetch * 1000);
//   }

//   syncWithPrivateAccount() {
//     const acknowledgedAttacks = privateAccount.getAcknowledgedAttacks();
//     this.$store.attacksReceived = {};
//     for (const event of this.events) {
//       if (!acknowledgedAttacks[event.fleet]) {
//         this.$store.attacksReceived[event.planet] = this.$store.attacksReceived[event.planet] || [];
//         this.$store.attacksReceived[event.planet].push(event);
//       }
//     }
//     this.setPartial({attacksReceived: this.$store.attacksReceived});
//   }

//   start(address: string, lastBlockNumber?: number) {
//     if (!this.lastQueryBlockNumber || this.lastQueryBlockNumber < lastBlockNumber) {
//       this.lastQueryBlockNumber = lastBlockNumber;
//     }
//     if (this.address !== address) {
//       this.address = address;
//       this.setPartial({attacksReceived: undefined});
//     }
//     if (this.timeout) {
//       clearTimeout(this.timeout);
//     }
//     this.timeout = setTimeout(this.fetch.bind(this), 1000);
//   }

//   stop() {
//     this.setPartial({attacksReceived: undefined});
//     if (this.timeout) {
//       clearTimeout(this.timeout);
//       this.timeout = undefined;
//     }
//   }

//   // TODO privateAccount.acknowledgeAttack
// }

// export const planetLogs = new PlanetLogsStore();
