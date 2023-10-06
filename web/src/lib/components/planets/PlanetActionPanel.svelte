<script lang="ts">
  import PlanetFleetActionPanel from '$lib/components/planets/PlanetFleetActionPanel.svelte';
  // import PlanetFleetResultPanel from '$lib/components/planets/PlanetFleetResultPanel.svelte';
  // import PlanetExitResultPanel from '$lib/components/planets/PlanetExitResultPanel.svelte';
  // import PlanetAttackResultPanel from '$lib/components/planets/PlanetAttackResultPanel.svelte';
  // import privateAccount from '$lib/account/privateAccount';
  // import {planetLogs} from '$lib/space/planetLogs';
  // import {time} from '$lib/time';
  // import type {OwnFleet} from 'conquest-eth-common';
  // import {locationToXY} from 'conquest-eth-common';
  // import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
  // import {logPeriod} from '$lib/config';

  export let coords: {x: number; y: number};
  export let close: () => void;

  // $: attacks = $planetLogs.attacksReceived && $planetLogs.attacksReceived[location];

  // let planetX: number;
  // let planetY: number;
  // let fleets: ({
  //   id: string;
  //   status: 'Error' | 'Success' | 'Expired';
  // } & OwnFleet)[];
  // $: {
  //   planetX = coords.x;
  //   planetY = coords.y;
  //   const now = $time;
  //   if (!$privateAccount.data) {
  //     fleets = [];
  //   } else {
  //     fleets = [];
  //     const fleetIds = Object.keys($privateAccount.data.fleets);
  //     for (const fleetId of fleetIds) {
  //       const fleet = $privateAccount.data.fleets[fleetId];
  //       if (fleet.toDelete) {
  //         continue;
  //       }

  //       // TODO investigate why need to hide 7 days old events
  //       const launchTime = fleet.actualLaunchTime || fleet.launchTime;
  //       const donotSHowTime = launchTime + fleet.duration + logPeriod;
  //       if ($time > donotSHowTime) {
  //         continue;
  //       }

  //       let status: 'Success' | 'Error' | 'Expired' | undefined;
  //       if (fleet.resolveTx) {
  //         const txStatus = privateAccount.txStatus(fleet.resolveTx.hash);
  //         if (txStatus && txStatus !== 'Loading' && txStatus.status !== 'Pending' && txStatus.status !== 'Cancelled') {
  //           // TODO Cancelled ?
  //           if (fleet.to.x === planetX && fleet.to.y === planetY) {
  //             status = txStatus.status === 'Failure' ? 'Error' : 'Success';
  //           }
  //         }
  //       } else {
  //         const txStatus = privateAccount.txStatus(fleet.sendTx.hash);
  //         if (txStatus && txStatus !== 'Loading' && txStatus.status === 'Failure') {
  //           // TODO Cancelled ?
  //           if (fleet.from.x === planetX && fleet.from.y === planetY) {
  //             status = txStatus.status === 'Failure' ? 'Error' : 'Success';
  //           }
  //         } else if (fleet.to.x === planetX && fleet.to.y === planetY) {
  //           const launchTime = fleet.actualLaunchTime || fleet.launchTime;
  //           const resolveWindow = contractsInfos.contracts.OuterSpace.linkedData.resolveWindow;
  //           const expiryTime = launchTime + fleet.duration + resolveWindow;

  //           if (expiryTime < $time) {
  //             status = 'Expired';
  //           }
  //         }
  //       }
  //       if (status) {
  //         fleets.push({id: fleetId, ...fleet, status});
  //       }
  //     }
  //   }
  // }

  // let exitFailure: {txHash: string; location: string} | undefined;
  // $: {
  //   exitFailure = undefined;
  //   if ($privateAccount.data) {
  //     const exit = $privateAccount.data.exits[location];
  //     if (exit) {
  //       const txStatus = privateAccount.txStatus(exit.txHash);
  //       if (txStatus && txStatus !== 'Loading') {
  //         if (txStatus.status === 'Failure') {
  //           exitFailure = {txHash: exit.txHash, location};
  //         }
  //       }
  //     }
  //   }
  // }
</script>

<div class="flex flex-col text-center text-xs">
  <!-- {#if attacks && attacks.length > 0} -->
  <!-- <PlanetAttackResultPanel attack={attacks[0]} />
  {:else if exitFailure}
    <PlanetExitResultPanel exit={exitFailure} />
  {:else if fleets.length > 0}
    <PlanetFleetResultPanel fleet={fleets[0]} />
  {:else} -->
  <PlanetFleetActionPanel {close} {coords} />
  <!-- {/if} -->
  <div class="w-full mt-2" />
</div>
