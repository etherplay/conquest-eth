/* eslint-disable prefer-const */
import {YakuzaSubscribed, YakuzaClaimed} from '../../generated/Yakuza/YakuzaContract';
import {Fleet, FleetArrivedEvent, YakuzaClaim, YakuzaSubscription} from '../../generated/schema';
import {store, BigInt} from '@graphprotocol/graph-ts';
import {getOrCreatePlanet, handleOwner} from '../shared';
import {toEventId, toFleetId} from '../utils';

export let ZERO = BigInt.fromI32(0);

export function toPlanetId(location: BigInt): string {
  return '0x' + location.toHex().slice(2).padStart(64, '0');
}

export function handleYakuzaSubscribed(event: YakuzaSubscribed): void {
  let subscriber = handleOwner(event.params.subscriber);
  let existingSubscription = YakuzaSubscription.load(subscriber.id);
  if (!existingSubscription) {
    existingSubscription = new YakuzaSubscription(subscriber.id);
    existingSubscription.endTime = ZERO;
    existingSubscription.startTime = ZERO;
    existingSubscription.owner = subscriber.id;
    existingSubscription.totalContribution = ZERO;

    subscriber.yakuzaSubscription = existingSubscription.id;
    subscriber.save();
  }

  existingSubscription.endTime = event.params.endTime;
  existingSubscription.startTime = event.params.startTime;
  existingSubscription.totalContribution = existingSubscription.totalContribution.plus(event.params.contribution);

  existingSubscription.save();
}

export function handleYakuzaClaimed(event: YakuzaClaimed): void {
  let owner = handleOwner(event.params.sender);
  let fleetId = toFleetId(event.params.fleetId);

  let fleet = Fleet.load(fleetId) as Fleet; // assert it is there

  let sentFleet = Fleet.load(toFleetId(event.params.fleetSentId)) as Fleet; // assert it is there
  sentFleet.yakuzaOnBehalf = owner.id;
  sentFleet.save();

  let fleetArrivedEvent = FleetArrivedEvent.load(fleet.arrivalEvent as string) as FleetArrivedEvent; // assert it is there

  let planet = getOrCreatePlanet(toPlanetId(event.params.attackedPlanet));
  planet.save();
  let existingClaim = YakuzaClaim.load(fleetId);
  if (!existingClaim) {
    existingClaim = new YakuzaClaim(fleetId);
    existingClaim.owner = owner.id;
    existingClaim.attackedPlanet = toPlanetId(event.params.attackedPlanet);
  }
  existingClaim.amountLeft = event.params.amountLeft;

  fleetArrivedEvent.yakuzaClaimAmountLeft = event.params.amountLeft;
  if (existingClaim.amountLeft.equals(ZERO)) {
    fleetArrivedEvent.yakuzaClaimed = true;
  }
  fleetArrivedEvent.save();

  existingClaim.save();
}
