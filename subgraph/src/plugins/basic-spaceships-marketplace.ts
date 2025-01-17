/* eslint-disable prefer-const */
import {
  SpaceshipsForSale,
  SaleCancelled,
  SpaceshipsSold,
} from '../../generated/BasicSpaceshipMarket/BasicSpaceshipMarketContract';
import {FleetArrived, ExitComplete} from '../../generated/OuterSpace/OuterSpaceContract';
import {SpaceshipSale} from '../../generated/schema';
import {store, BigInt} from '@graphprotocol/graph-ts';

export let ZERO = BigInt.fromI32(0);

export function toPlanetId(location: BigInt): string {
  return '0x' + location.toHex().slice(2).padStart(64, '0');
}

export function handleSpaceshipsForSale(event: SpaceshipsForSale): void {
  let id = toPlanetId(event.params.location);
  let entity = SpaceshipSale.load(id);
  if (!entity) {
    entity = new SpaceshipSale(id);
  }
  entity.seller = event.params.owner;
  entity.pricePerUnit = event.params.pricePerUnit;
  entity.timestamp = event.block.timestamp;
  entity.spaceshipsToKeep = event.params.spaceshipsToKeep;
  entity.spaceshipsLeftToSell = event.params.spaceshipsToSell;
  entity.save();
}

export function handleSpaceshipsSold(event: SpaceshipsSold): void {
  let id = toPlanetId(event.params.location);
  let entity = SpaceshipSale.load(id);
  if (entity) {
    entity.spaceshipsLeftToSell = entity.spaceshipsLeftToSell.minus(event.params.numSpaceships);
    if (entity.spaceshipsLeftToSell.equals(ZERO)) {
      store.remove('SpaceshipSale', id);
    } else {
      entity.save();
    }
  }
}

export function handleSaleCancelled(event: SaleCancelled): void {
  let id = toPlanetId(event.params.location);
  let entity = SpaceshipSale.load(id);
  if (entity) {
    store.remove('SpaceshipSale', id);
  }
}

export function handleFleetArrived(event: FleetArrived): void {
  let id = toPlanetId(event.params.destination);
  // TODO rename won to capture, new owner
  //  and check if recorded properly
  if (event.params.won) {
    let entity = SpaceshipSale.load(id);
    if (entity) {
      if (entity.seller != event.params.fleetOwner) {
        store.remove('SpaceshipSale', id);
      }
    }
  }
}

export function handleExitComplete(event: ExitComplete): void {
  let id = toPlanetId(event.params.location);
  let entity = SpaceshipSale.load(id);
  if (entity) {
    store.remove('SpaceshipSale', id);
  }
}
