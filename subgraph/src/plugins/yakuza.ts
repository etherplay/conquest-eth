/* eslint-disable prefer-const */
import {YakuzaSubscribed, YakuzaClaimed, YakuzaAttack} from '../../generated/Yakuza/YakuzaContract';
import {Fleet, FleetArrivedEvent, Planet, YakuzaClaim, YakuzaPlanet, YakuzaSubscription} from '../../generated/schema';
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

  for (let i = 0; i < event.params.planets.length; i++) {
    let planetId = toPlanetId(event.params.planets[i]);
    let planet = getOrCreatePlanet(planetId);
    planet.save();

    let yakuzaPlanet = YakuzaPlanet.load(planetId);
    if (!yakuzaPlanet) {
      yakuzaPlanet = new YakuzaPlanet(planetId);
      yakuzaPlanet.planet = planetId;
      yakuzaPlanet.owner = planet.owner;
      yakuzaPlanet.amountSpentOverTime = ZERO;
      yakuzaPlanet.lastAttackTime = ZERO;
      yakuzaPlanet.lockTime = ZERO;
      yakuzaPlanet.save();
    }
  }
}

export function handleYakuzaClaimed(event: YakuzaClaimed): void {
  let owner = handleOwner(event.params.sender);
  let fleetId = toFleetId(event.params.fleetId);

  let fleet = Fleet.load(fleetId) as Fleet; // assert it is there

  let sentFleet = Fleet.load(toFleetId(event.params.fleetSentId)) as Fleet; // assert it is there
  sentFleet.yakuzaOnBehalf = owner.id;
  sentFleet.save();

  let fleetArrivedEvent = FleetArrivedEvent.load(fleet.arrivalEvent as string) as FleetArrivedEvent; // assert it is there

  let planetId = toPlanetId(event.params.attackedPlanet);
  let planet = getOrCreatePlanet(planetId);
  planet.save();

  let yakuzaPlanet = YakuzaPlanet.load(planetId);
  if (!yakuzaPlanet) {
    yakuzaPlanet = new YakuzaPlanet(planetId);
    yakuzaPlanet.owner = planet.owner;
    yakuzaPlanet.planet = planetId;
    yakuzaPlanet.amountSpentOverTime = ZERO;
    yakuzaPlanet.lastAttackTime = ZERO;
    yakuzaPlanet.lockTime = ZERO;
  }
  yakuzaPlanet.lockTime = event.params.lockTime;
  yakuzaPlanet.save();

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

export function handleYakuzaAttack(event: YakuzaAttack): void {
  let planetId = toPlanetId(event.params.to);
  let planet = getOrCreatePlanet(planetId);
  planet.save();
  let yakuzaPlanet = YakuzaPlanet.load(planet.id);
  if (!yakuzaPlanet) {
    yakuzaPlanet = new YakuzaPlanet(planet.id);
    yakuzaPlanet.owner = planet.owner;
    yakuzaPlanet.planet = planet.id;
    yakuzaPlanet.amountSpentOverTime = ZERO;
    yakuzaPlanet.lastAttackTime = ZERO;
    yakuzaPlanet.lockTime = ZERO;
  }
  yakuzaPlanet.lastAttackTime = event.params.lastAttackTime;
  yakuzaPlanet.amountSpentOverTime = event.params.amountSpentOverTime;
  yakuzaPlanet.save();
}
