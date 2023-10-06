<script lang="ts">
  import {account} from '$lib/account/account';
  import {privateWallet} from '$lib/account/privateWallet';
  import {chain, wallet} from '$lib/blockchain/wallet';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {now} from '$lib/time';
  import {decodeCoords} from '$lib/utils';
  import type {BigNumber} from '@ethersproject/bignumber';
  import {locationToXY} from 'conquest-eth-common';

  let destination: string;
  let transactionHash: string;
  let error: string | undefined;
  let success: string | undefined;
  let arrivalTimeWanted: number = 0;
  let specific: string = '';

  function acknowledgeSuccess() {
    success = undefined;
  }

  function acknowledgeError() {
    error = undefined;
  }

  async function recover(event: Event) {
    event.preventDefault();
    privateWallet.execute(async () => {
      const tx = await wallet.provider.getTransaction(transactionHash);
      const receipt = await wallet.provider.getTransactionReceipt(transactionHash);
      const block = await wallet.provider.getBlock(receipt.blockHash);
      const eventInterface = $chain.contracts.OuterSpace.interface;

      const decodedEvents = receipt.logs
        .reduce((filtered, log) => {
          let parsed: any;
          try {
            parsed = eventInterface.parseLog(log);
          } catch (e) {
            console.error(e);
          }
          if (parsed) {
            filtered.push(parsed);
          }
          return filtered;
        }, [])
        .filter((v) => v.name === 'FleetSent');

      if (decodedEvents.length == 0) {
        error = 'No Fleet matching that tx are found';
      }
      console.log(decodedEvents);

      for (const event of decodedEvents) {
        const {fleet, fleetOwner, fleetSender, from, operator, quantity, newNumSpaceships} = event.args;

        let destinationCoords: {x: number; y: number} | undefined;

        try {
          destinationCoords = decodeCoords(destination);
          const planet = spaceInfo.getPlanetInfo(destinationCoords.x, destinationCoords.y);
          if (!planet) {
            error = `no planet at (${destinationCoords.x},${destinationCoords.y})`;
            return;
          }
        } catch (e) {
          error = 'invalid coords';
          return;
        }

        const fromCoords = locationToXY((from as BigNumber).toHexString());

        let fleetFound:
          | {
              fleet: {
                owner: string;
                id: string;
                from: {x: number; y: number};
                to: {x: number; y: number};
                gift: boolean;
                arrivalTimeWanted: number;
                specific: string;
                potentialAlliances?: string[];
                fleetAmount: number;
                fleetSender?: string;
                operator?: string;
              };
              txHash: string;
              timestamp: number;
              nonce: number;
              overrideTimestamp: number;
            }
          | undefined = undefined;
        for (let nonce = Math.max(0, tx.nonce - 1); nonce < tx.nonce + 5; nonce++) {
          for (let i = 0; i < 2; i++) {
            const gift = i == 0;
            const specificToUse = specific === '' ? '0x0000000000000000000000000000000000000001' : specific;
            const listOfArrivalTimeWanted = [arrivalTimeWanted];
            if (arrivalTimeWanted === 0) {
              const numTimesToTry = 64;
              const startTime = Math.floor(block.timestamp / 60) * 60 - Math.floor(numTimesToTry / 2) * 60;
              for (let k = 0; k < numTimesToTry; k++) {
                listOfArrivalTimeWanted.push(startTime + k * 60);
              }
              console.log({listOfArrivalTimeWanted});
            } else if (arrivalTimeWanted == -1) {
              const numTimesToTry = 512;
              const startTime = Math.floor(block.timestamp / 60) * 60 - Math.floor(numTimesToTry / 2) * 60;
              for (let k = 0; k < numTimesToTry; k++) {
                listOfArrivalTimeWanted.push(startTime + k * 60);
              }
              console.log({listOfArrivalTimeWanted});
            }
            for (const arrivalTime of listOfArrivalTimeWanted) {
              const fleetData = await account.hashFleet(
                fromCoords,
                destinationCoords,
                gift,
                specificToUse,
                arrivalTime,
                nonce,
                fleetOwner,
                fleetSender,
                operator
              );
              if (fleetData.fleetId == fleet.toHexString()) {
                fleetFound = {
                  fleet: {
                    fleetAmount: quantity,
                    from: fromCoords,
                    to: destinationCoords,
                    gift: gift,
                    arrivalTimeWanted: arrivalTime,
                    id: fleetData.fleetId,
                    owner: fleetOwner,
                    specific: specificToUse,
                    fleetSender: fleetSender,
                    operator: operator,
                    // potentialAlliances: // TODO
                  },
                  nonce: nonce,
                  txHash: tx.hash,
                  timestamp: block.timestamp,
                  overrideTimestamp: now(),
                };

                console.log('found!!!!!!!!!!!!!!!!!!!!');
                break;
              }
              console.error(
                `fleetID generated: ${fleetData.fleetId} not matching expected fleetID ${fleet.toHexString()} `
              );
            }
            if (fleetFound) {
              break;
            }
          }
          if (fleetFound) {
            break;
          }
        }

        if (fleetFound) {
          try {
            if (!$account?.data) {
              error = 'Account not available, please reload';
            } else {
              const pendingActionFound = $account.data.pendingActions[fleetFound.txHash];
              if (pendingActionFound && typeof pendingActionFound !== 'number') {
                error = 'already recovered';
              } else {
                account.recordFleet(
                  fleetFound.fleet,
                  fleetFound.txHash,
                  fleetFound.timestamp,
                  fleetFound.nonce,
                  fleetFound.overrideTimestamp
                );
              }
            }
          } catch (e) {
            error = e;
          }
        } else {
          error = 'no fleet matching';
        }
      }
    });
  }
</script>

<WalletAccess>
  <div class="h-screen flex justify-center items-center">
    <div class="lg:w-2/5 md:w-1/2 w-2/3">
      <form class="bg-black p-10 rounded-lg shadow-lg min-w-full">
        <h1 class="text-center text-2xl mb-6 text-gray-300 font-bold font-sans">Recover Fleet</h1>
        <div>
          <label class="text-gray-100 font-semibold block my-3 text-md" for="transactionHash">Transaction Hash</label>
          <input
            class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
            type="text"
            name="transactionHash"
            id="transactionHash"
            placeholder="transactionHash"
            bind:value={transactionHash}
          />
        </div>
        <!-- <div>
        <label class="text-gray-100 font-semibold block my-3 text-md" for="fleetID">Fleet ID</label>
        <input
          class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
          type="text"
          name="fleetID"
          id="fleetID"
          placeholder="fleetID"
        />
      </div> -->
        <div>
          <label class="text-gray-100 font-semibold block my-3 text-md" for="destination">Destination</label>
          <input
            class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
            type="text"
            name="destination"
            id="destination"
            placeholder="destination"
            bind:value={destination}
          />
        </div>
        <div>
          <label class="text-gray-100 font-semibold block my-3 text-md" for="arrivalTimeWanted">arrivalTimeWanted</label
          >
          <input
            class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
            type="text"
            name="arrivalTimeWanted"
            id="arrivalTimeWanted"
            bind:value={arrivalTimeWanted}
          />
        </div>
        <div>
          <label class="text-gray-100 font-semibold block my-3 text-md" for="specific">specific</label>
          <input
            class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
            type="text"
            name="specific"
            id="specific"
            bind:value={specific}
          />
        </div>

        <!-- <div>
        <label class="text-gray-100 font-semibold block my-3 text-md" for="gift">Gift</label>
        <input
          class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
          type="text"
          name="gift"
          id="gift"
          placeholder="gift"
        />
      </div>
      <div>
        <label class="text-gray-100 font-semibold block my-3 text-md" for="nonce">Nonce</label>
        <input
          class="w-full bg-gray-800 px-4 py-2 rounded-lg focus:outline-none"
          type="text"
          name="nonce"
          id="nonce"
          placeholder="nonce"
        />
      </div> -->

        <button
          type="submit"
          on:click={recover}
          class="w-full mt-6 bg-indigo-600 rounded-lg px-4 py-2 text-lg text-white tracking-wide font-semibold font-sans"
          >Recover</button
        >
      </form>
    </div>
  </div>
</WalletAccess>

{#if error}
  <Modal
    title="An error occured!"
    on:close={() => {
      error = undefined;
    }}
  >
    <ul class="mt-10 text-white">
      <li>{error}</li>
    </ul>
    <div class="text-center">
      <Button class="mt-4 text-center" label="OK" on:click={acknowledgeError}>Ok</Button>
    </div>
  </Modal>
{:else if success}
  <Modal
    title="Success"
    on:close={() => {
      success = undefined;
    }}
  >
    <ul class="mt-10 text-white">
      <li>{success}</li>
    </ul>
    <div class="text-center">
      <Button class="mt-4 text-center" label="OK" on:click={acknowledgeSuccess}>Ok</Button>
    </div>
  </Modal>
{/if}
