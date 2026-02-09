// import {Writable, writable} from 'svelte/store';
import type {PlanetInfo, PlanetState} from '../types.js';
import {encodePacked, keccak256} from 'viem';
import {
	LocationPointer,
	nextInSpiral,
	StrictLocationPointer,
	xyToLocation,
	locationToXY,
} from '../util/location.js';
import {normal16, normal8, value8Mod} from '../util/extraction.js';
import {uniqueName} from '../random/uniqueName.js'; // TODO in common

function hours(numHours: number): number {
	return 60 * 60 * numHours;
}
function days(n: number): number {
	return hours(n * 24);
}

const ACTIVE_MASK = 2 ** 31;

function skip(): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, 1);
	});
}

// TODO remove duplicate in playersQuery
type Player = {
	address: string;
	alliances: {address: string; ally: boolean}[];
};

// TODO remove duplication , see send.ts
function findCommonAlliances(arr1: string[], arr2: string[]): string[] {
	const result = [];
	for (const item1 of arr1) {
		if (arr2.indexOf(item1) !== -1) {
			result.push(item1);
		}
	}
	return result;
}

// type Mutable<T> = {
//   -readonly [k in keyof T]: T[k];
// };

export type Outcome = {
	min: {captured: boolean; numSpaceshipsLeft: number};
	max: {captured: boolean; numSpaceshipsLeft: number};
	allies: boolean;
	taxAllies: boolean;
	tax?: {taxRate: number; loss: number};
	gift: boolean;
	timeUntilFails: number;
	nativeResist: boolean;
	combat?: {
		defenderLoss: number;
		attackerLoss: number;
	};
};

export type FleetInput = {
	fromPlanet: PlanetInfo;
	fleetAmount: number;
	senderPlayer?: Player;
	fromPlayer?: Player;
	gift?: boolean;
	specific?: string;
	extra?: {defense: number; attackPowerOverride: number};
};

export type FleetOutcome = {
	fromPlanet: PlanetInfo;
	fleetAmount: number;
	outcome: Outcome;
};

export type MultipleFleetOutcome = {
	fleets: FleetOutcome[];
	finalOutcome: {
		min: {captured: boolean; numSpaceshipsLeft: number; owner?: string};
		max: {captured: boolean; numSpaceshipsLeft: number; owner?: string};
	};
	arrivalTime: number;
};

export class SpaceInfo {
	private readonly genesis: `0x${string}`;
	private readonly cache: Map<string, PlanetInfo | null> = new Map();
	private readonly locationCache: Map<bigint, PlanetInfo | null> = new Map();
	// private readonly planetIdsInArea: {[zoneId: string]: string[]} = {};

	public readonly resolveWindow: number;
	public readonly timePerDistance: number;
	public readonly exitDuration: number;
	public readonly acquireNumSpaceships: number;
	public readonly productionSpeedUp: number;
	public readonly productionCapAsDuration: number;
	public readonly fleetSizeFactor6: number;
	public readonly upkeepProductionDecreaseRatePer10000th: number;
	public readonly giftTaxPer10000: number;
	public readonly stakeRange: string;
	public readonly stakeRangeArray: number[];
	public readonly stakeMultiplier10000th: number;
	public readonly roundTo1Decimal: boolean;
	public readonly bootstrapSessionEndTime: number;
	public readonly infinityStartTime: number;

	// public readonly planetsOnFocus: PlanetInfo[] = [];
	// private lastFocus: {x0: number; y0: number; x1: number; y1: number} = {x0: 0, y0: 0, x1: 0, y1: 0};
	// private store: Writable<PlanetInfo[]>;

	constructor(config: {
		genesis: `0x${string}`;
		resolveWindow: number;
		timePerDistance: number;
		exitDuration: number;
		acquireNumSpaceships: number;
		productionSpeedUp: number;
		productionCapAsDuration: number;
		fleetSizeFactor6: number;
		upkeepProductionDecreaseRatePer10000th: number;
		giftTaxPer10000: number;
		stakeRange: string;
		stakeMultiplier10000th: number;
		roundTo1Decimal?: boolean;
		bootstrapSessionEndTime: number;
		infinityStartTime: number;
	}) {
		this.resolveWindow = config.resolveWindow;
		this.timePerDistance = Math.floor(config.timePerDistance / 4); // Same as in OuterSpace.sol: the coordinates space is 4 times bigger
		this.exitDuration = config.exitDuration;
		this.acquireNumSpaceships = config.acquireNumSpaceships;
		this.productionSpeedUp = config.productionSpeedUp;
		this.productionCapAsDuration = config.productionCapAsDuration;
		this.upkeepProductionDecreaseRatePer10000th =
			config.upkeepProductionDecreaseRatePer10000th;
		this.fleetSizeFactor6 = config.fleetSizeFactor6;
		this.genesis = config.genesis;
		this.giftTaxPer10000 = config.giftTaxPer10000;
		this.stakeRange = config.stakeRange;
		this.stakeMultiplier10000th = config.stakeMultiplier10000th;
		this.roundTo1Decimal = config.roundTo1Decimal || false;
		this.bootstrapSessionEndTime = config.bootstrapSessionEndTime;
		this.infinityStartTime = config.infinityStartTime;
		// this.store = writable(this.planetsOnFocus);

		// const stakeRange = [6, 8, 10, 12, 14, 16, 18, 20, 20, 22, 24, 32, 40, 48, 56, 72]; //[4, 5, 5, 10, 10, 15, 15, 20, 20, 30, 30, 40, 40, 80, 80, 100];
		this.stakeRangeArray = [];
		for (let i = 2; i < this.stakeRange.length; i += 4) {
			this.stakeRangeArray.push(parseInt(this.stakeRange.slice(i, i + 4), 16));
		}
		// console.log({stakeRangeArray});
	}

	syncFromRect(x0: number, y0: number, x1: number, y1: number): bigint[] {
		const ids = [];
		for (let x = x0; x <= x1; x++) {
			for (let y = y0; y <= y1; y++) {
				const planet = this.getPlanetInfo(x, y);
				if (planet) {
					ids.push(xyToLocation(x, y));
				}
			}
		}
		return ids;
	}

	*yieldPlanetsFromRect(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	): Generator<PlanetInfo, void> {
		for (let x = x0; x <= x1; x++) {
			for (let y = y0; y <= y1; y++) {
				const id = '' + x + ',' + y; // TODO optimize ?
				const inCache = this.cache.get(id);
				const planet = this.getPlanetInfo(x, y);
				if (planet) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(planet as any).inCache = inCache;
					yield planet;
				}
			}
		}
	}

	async asyncPlanetsFromRect(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	): Promise<PlanetInfo[]> {
		const planets = [];
		let i = 0;
		for (const planet of this.yieldPlanetsFromRect(x0, y0, x1, y1)) {
			planets.push(planet);
			i++;
			if (i % 6 == 0) {
				await skip(); // TODO use worker instead
			}
		}
		return planets;
	}

	getPlanetInfoViaId(id: bigint): PlanetInfo | undefined {
		const inCache = this.locationCache.get(id);
		if (typeof inCache !== 'undefined') {
			if (inCache === null) {
				return undefined;
			}
			return inCache;
		}
		const {x, y} = locationToXY(id);
		return this.getPlanetInfo(x, y);
	}

	getPlanetInfo(x: number, y: number): PlanetInfo | undefined {
		const id = '' + x + ',' + y; // TODO optimize ?
		const inCache = this.cache.get(id);
		if (typeof inCache !== 'undefined') {
			if (inCache === null) {
				return undefined;
			}
			return inCache;
		}

		const location = xyToLocation(x, y);

		const data = keccak256(
			encodePacked(['bytes32', 'uint256'], [this.genesis, location]),
		);

		const hasPlanet = value8Mod(data, 52, 16) == 1;
		if (!hasPlanet) {
			this.cache.set(id, null);
			return undefined;
		}

		const subX = 1 - value8Mod(data, 0, 3);
		const subY = 1 - value8Mod(data, 2, 3);

		const productionIndex = normal8(data, 12);

		const stakeIndex = productionIndex;
		const stake = this.roundTo1Decimal
			? Math.floor(
					(this.stakeRangeArray[stakeIndex] * this.stakeMultiplier10000th) /
						1000,
				) * 1000
			: Math.floor(
					this.stakeRangeArray[stakeIndex] * this.stakeMultiplier10000th,
				);
		// console.log({stake});
		const production = normal16(
			data,
			12,
			'0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0',
		);
		const attackRoll = normal8(data, 20);
		const attack = 4000 + attackRoll * 400;
		const defenseRoll = normal8(data, 28);
		const defense = 4000 + defenseRoll * 400;
		const speedRoll = normal8(data, 36);
		const speed = 5005 + speedRoll * 333;
		const natives = 15000 + normal8(data, 44) * 3000;

		// const type = value8Mod(data, 60, 23);
		const attackGrade = attackRoll < 6 ? 0 : attackRoll < 10 ? 1 : 2;
		const defenseGrade = defenseRoll < 6 ? 0 : defenseRoll < 10 ? 1 : 2;
		const speedGrade = speedRoll < 6 ? 0 : speedRoll < 10 ? 1 : 2;

		const type = attackGrade * 9 + defenseGrade * 3 + speedGrade;

		const name = uniqueName(2, location);

		const planetObj = {
			location: {
				id: location,
				x,
				y,
				globalX: x * 4 + subX,
				globalY: y * 4 + subY,
			},
			type,
			stats: {
				name,
				stake,
				production,
				attack,
				defense,
				speed,
				natives,
				subX,
				subY,
				maxTravelingUpkeep: Math.floor(
					this.acquireNumSpaceships +
						(production * this.productionCapAsDuration) / hours(1),
				),
				cap: Math.floor(
					this.acquireNumSpaceships +
						(production * this.productionCapAsDuration) / hours(1),
				),
			},
		};
		// console.log(JSON.stringify(planetObj);
		this.cache.set(id, planetObj);
		this.locationCache.set(planetObj.location.id, planetObj);
		return planetObj;
	}

	findNextPlanet(
		pointer?: LocationPointer<PlanetInfo> | StrictLocationPointer<PlanetInfo>,
	): StrictLocationPointer<PlanetInfo> {
		do {
			pointer = nextInSpiral(pointer);
			pointer.data = this.getPlanetInfo(pointer.x, pointer.y);
		} while (!pointer.data);
		return pointer as StrictLocationPointer<PlanetInfo>;
	}

	timeLeft(
		time: number,
		fromPlanet: PlanetInfo,
		toPlanet: PlanetInfo,
		startTime: number,
	): {timeLeft: number; timePassed: number; fullTime: number} {
		const speed = fromPlanet.stats.speed;
		const fullDistance = this.distance(fromPlanet, toPlanet);
		const fullTime = Math.floor(
			fullDistance * ((this.timePerDistance * 10000) / speed),
		);
		const timePassed = time - startTime;
		const timeLeft = fullTime - timePassed;
		return {timeLeft, timePassed, fullTime};
	}

	distance(fromPlanet: PlanetInfo, toPlanet: PlanetInfo): number {
		const gFromX = fromPlanet.location.globalX;
		const gFromY = fromPlanet.location.globalY;
		const gToX = toPlanet.location.globalX;
		const gToY = toPlanet.location.globalY;

		const fullDistance = Math.floor(
			Math.sqrt(Math.pow(gToX - gFromX, 2) + Math.pow(gToY - gFromY, 2)),
		);
		return fullDistance;
	}

	timeToArrive(fromPlanet: PlanetInfo, toPlanet: PlanetInfo): number {
		return this.timeLeft(0, fromPlanet, toPlanet, 0).timeLeft;
	}

	hasJustExited(exitTime: number, t: number): boolean {
		return exitTime > 0 && t > exitTime + this.exitDuration;
	}

	computePlanetUpdateForTimeElapsed(
		planetUpdate: PlanetState,
		planetInfo: PlanetInfo,
		t: number,
	): void {
		if (planetUpdate.startExitTime != 0) {
			if (this.hasJustExited(planetUpdate.startExitTime, t)) {
				planetUpdate.numSpaceships = 0;
				planetUpdate.travelingUpkeep = 0;
				planetUpdate.overflow = 0;
				planetUpdate.active = false; // event is emitted at the endof each write function
				planetUpdate.exiting = false;
				planetUpdate.startExitTime = 0;
				planetUpdate.exitTimeLeft = 0;
				planetUpdate.owner = undefined;
				planetUpdate.rewardGiver = '';
				planetUpdate.natives = true;
				// lastUpdated is set at the end directly on storage
				return;
			}
		}

		if (planetUpdate.natives) {
			// this is to calculate properly as natives is not numSpaceships in contract state
			planetUpdate.numSpaceships = 0;
		}

		const timePassed = t - planetUpdate.lastUpdatedSaved;
		const production = planetInfo.stats.production;
		const amountProducedTheWholeTime = Math.floor(
			(timePassed * this.productionSpeedUp * production) / hours(1),
		);

		// NOTE: the repaypemnt of upkeep always happen at a fixed rate (per planet), it is fully predictable
		let upkeepRepaid = 0;
		if (planetUpdate.travelingUpkeep > 0) {
			upkeepRepaid = Math.floor(
				(amountProducedTheWholeTime *
					this.upkeepProductionDecreaseRatePer10000th) /
					10000,
			);
			if (upkeepRepaid > planetUpdate.travelingUpkeep) {
				upkeepRepaid = planetUpdate.travelingUpkeep;
			}
			planetUpdate.travelingUpkeep =
				planetUpdate.travelingUpkeep - upkeepRepaid;
		}

		let newNumSpaceships = planetUpdate.numSpaceships;
		let extraUpkeepPaid = 0;
		if (this.productionCapAsDuration > 0) {
			// NOTE no need of productionSpeedUp for the cap because _productionCapAsDuration can include it
			const capWhenActive = Math.floor(
				this.acquireNumSpaceships +
					(production * this.productionCapAsDuration) / hours(1),
			);
			const cap = planetUpdate.active ? capWhenActive : 0;

			if (newNumSpaceships > cap) {
				let decreaseRate = 1800;
				if (planetUpdate.overflow > 0) {
					decreaseRate = Math.floor(
						(planetUpdate.overflow * 1800) / capWhenActive,
					);
					if (decreaseRate < 1800) {
						decreaseRate = 1800;
					}
				}

				let decrease = Math.floor(
					(timePassed * this.productionSpeedUp * decreaseRate) / hours(1),
				);
				if (decrease > newNumSpaceships - cap) {
					decrease = newNumSpaceships - cap;
				}
				if (planetUpdate.active) {
					extraUpkeepPaid = decrease;
				}
				newNumSpaceships -= decrease;
			} else {
				if (planetUpdate.active) {
					let increase = amountProducedTheWholeTime;
					if (planetUpdate.travelingUpkeep > 0) {
						const timeBeforeUpkeepBackToZero =
							planetUpdate.travelingUpkeep /
							((this.productionSpeedUp *
								production *
								this.upkeepProductionDecreaseRatePer10000th) /
								hours(1) /
								10000);
						if (timeBeforeUpkeepBackToZero >= timePassed) {
							extraUpkeepPaid = increase;
						} else {
							extraUpkeepPaid =
								(timeBeforeUpkeepBackToZero *
									this.productionSpeedUp *
									production) /
								hours(1);
							if (extraUpkeepPaid > increase) {
								extraUpkeepPaid = increase; // TODO remove ? should not be possible
							}
						}
						increase -= extraUpkeepPaid;
					}
					const maxIncrease = cap - newNumSpaceships;
					if (increase > maxIncrease) {
						extraUpkeepPaid = increase - maxIncrease;
						increase = maxIncrease;
					}
					newNumSpaceships += increase;
				} else {
					// not effect currently, when inactive, cap == 0, meaning zero spaceship here
					// NOTE: we could do the following assuming we act on upkeepRepaid when inactive, we do not do that currently
					//  extraUpkeepPaid = amountProducedTheWholeTime - upkeepRepaid;
				}
			}

			if (planetUpdate.active) {
				// // travelingUpkeep can go negative allow you to charge up your planet for later use, up to 7 days
				// let newTravelingUpkeep = planetUpdate.travelingUpkeep - extraUpkeepPaid;
				const upkeepRepaid =
					Math.floor(
						(amountProducedTheWholeTime *
							this.upkeepProductionDecreaseRatePer10000th) /
							10000,
					) + extraUpkeepPaid;

				let newTravelingUpkeep = planetUpdate.travelingUpkeep - upkeepRepaid;
				// console.log({newTravelingUpkeep, upkeepRepaid, travelingUpkeep: planetUpdate.travelingUpkeep});

				if (newTravelingUpkeep < -cap) {
					newTravelingUpkeep = -cap;
				}
				planetUpdate.travelingUpkeep = newTravelingUpkeep;
			}
		} else {
			if (planetUpdate.active) {
				newNumSpaceships += amountProducedTheWholeTime;
			} else {
				// NOTE no need to overflow here  as there is no production cap, so no incentive to regroup spaceships
				let decrease = Math.floor(
					(timePassed * this.productionSpeedUp * 1800) / hours(1),
				);
				if (decrease > newNumSpaceships) {
					decrease = newNumSpaceships;
					newNumSpaceships = 0;
				} else {
					newNumSpaceships -= decrease;
				}
			}
		}

		if (newNumSpaceships >= ACTIVE_MASK) {
			newNumSpaceships = ACTIVE_MASK - 1;
		}
		planetUpdate.numSpaceships = newNumSpaceships;
		planetUpdate.natives =
			planetUpdate.numSpaceships == 0 && !planetUpdate.active;
		if (planetUpdate.natives) {
			planetUpdate.owner = undefined;
		}
	}

	computeFuturePlanetState(
		planetInfo: PlanetInfo,
		currentPlanetState: PlanetState,
		duration: number,
	): PlanetState {
		const newPlanetState = {
			owner: currentPlanetState.owner,
			lastUpdatedSaved: currentPlanetState.lastUpdatedSaved,
			startExitTime: currentPlanetState.startExitTime,
			numSpaceships: currentPlanetState.numSpaceships,
			flagTime: currentPlanetState.flagTime,
			travelingUpkeep: currentPlanetState.travelingUpkeep,
			overflow: currentPlanetState.overflow,
			active: currentPlanetState.active,
			exiting: currentPlanetState.exiting,
			exitTimeLeft: currentPlanetState.exitTimeLeft,
			natives: currentPlanetState.natives,
			capturing: currentPlanetState.capturing,
			inReach: currentPlanetState.inReach,
			rewardGiver: currentPlanetState.rewardGiver,
			requireClaimAcknowledgement:
				currentPlanetState.requireClaimAcknowledgement,
			metadata: currentPlanetState.metadata,
			ownerYakuzaSubscriptionEndTime:
				currentPlanetState.ownerYakuzaSubscriptionEndTime,
		};

		this.computePlanetUpdateForTimeElapsed(
			newPlanetState,
			planetInfo,
			newPlanetState.lastUpdatedSaved + duration,
		);

		return newPlanetState;
	}

	numSpaceshipsAfterDuration(
		toPlanet: PlanetInfo,
		toPlanetState: PlanetState,
		duration: number,
	): number {
		const newPlanetState = this.computeFuturePlanetState(
			toPlanet,
			toPlanetState,
			duration,
		);

		if (newPlanetState.natives) {
			return toPlanet.stats.natives;
		} else {
			return newPlanetState.numSpaceships;
		}
	}

	computePlanetStatesAtArrival(
		toPlanet: PlanetInfo,
		toPlanetState: PlanetState,
		duration: number,
	): {minPlanetState: PlanetState; maxPlanetState: PlanetState} {
		return {
			minPlanetState: this.computeFuturePlanetState(
				toPlanet,
				toPlanetState,
				Math.max(0, duration),
			),
			maxPlanetState: this.computeFuturePlanetState(
				toPlanet,
				toPlanetState,
				Math.max(0, duration + this.resolveWindow),
			),
		};
	}

	// TODO redo after travelingUpkeep update
	numSpaceshipsAtArrival(
		toPlanet: PlanetInfo,
		toPlanetState: PlanetState,
		duration: number,
	): {min: number; max: number} {
		// console.log({timeTraveled});
		return {
			min: this.numSpaceshipsAfterDuration(
				toPlanet,
				toPlanetState,
				Math.max(0, duration),
			),
			max: this.numSpaceshipsAfterDuration(
				toPlanet,
				toPlanetState,
				Math.max(0, duration + this.resolveWindow),
			),
		};
	}

	durationToReachXSpaceships(
		planet: PlanetInfo,
		planetState: PlanetState,
		numSpaceshipsToReach: number,
	): {amount: number; duration: number} {
		if (planetState.active) {
			const numSpaceshipsSoFar = planetState.numSpaceships;

			if (planet.stats.cap < numSpaceshipsToReach) {
				numSpaceshipsToReach = planet.stats.cap;
			}

			if (numSpaceshipsSoFar >= numSpaceshipsToReach) {
				return {
					amount: 0,
					duration: 0,
				};
			}

			const numSpaceshipsToProduce = numSpaceshipsToReach - numSpaceshipsSoFar;
			// Math.floor((timePassed * this.productionSpeedUp * production) / hours(1));
			const duration =
				numSpaceshipsToProduce /
				((planet.stats.production * this.productionSpeedUp) / hours(1));
			return {
				amount: numSpaceshipsToProduce,
				duration,
			};
		}
		return {
			amount: 0,
			duration: 0,
		};
	}

	outcome(
		fromPlanet: PlanetInfo,
		toPlanet: PlanetInfo,
		toPlanetState: PlanetState,
		fleetAmount: number,
		duration: number,
		senderPlayer?: Player,
		fromPlayer?: Player,
		toPlayer?: Player,
		gift?: boolean,
		specific?: string,
		extra?: {defense: number; attackPowerOverride: number},
	): Outcome {
		// const {min, max} = this.numSpaceshipsAtArrival(fromPlanet, toPlanet, toPlanetState, timeTraveled);
		const {minPlanetState, maxPlanetState} = this.computePlanetStatesAtArrival(
			toPlanet,
			toPlanetState,
			duration,
		);

		let nativeResistIfAttackFails = minPlanetState.natives;
		let min = minPlanetState.numSpaceships;
		if (minPlanetState.natives) {
			min = toPlanet.stats.natives;
		} else if (!minPlanetState.active && min < toPlanet.stats.natives) {
			min = toPlanet.stats.natives;
			nativeResistIfAttackFails = true;
		}

		let max = maxPlanetState.numSpaceships;
		if (maxPlanetState.natives) {
			max = toPlanet.stats.natives;
		} else if (!maxPlanetState.active && min < toPlanet.stats.natives) {
			max = toPlanet.stats.natives;
		}

		let numDefenseMin = BigInt(min);
		let numDefenseMax = BigInt(max);
		let numAttack = BigInt(fleetAmount);

		let allies = false;
		if (toPlayer) {
			if (
				toPlayer.address.toLowerCase() === fromPlayer?.address.toLowerCase()
			) {
				allies = true;
			} else if (fromPlayer) {
				if (toPlayer.alliances.length > 0 && fromPlayer.alliances.length > 0) {
					const potentialAlliances = findCommonAlliances(
						toPlayer.alliances.map((v) => v.address),
						fromPlayer.alliances.map((v) => v.address),
					);
					// console.log({potentialAlliances});
					if (potentialAlliances.length > 0) {
						allies = true;
					}
				}
			}
		}

		let taxAllies = allies;

		if (
			senderPlayer &&
			toPlayer &&
			fromPlayer &&
			fromPlayer.address !== senderPlayer?.address
		) {
			taxAllies = false;
			if (
				toPlayer.address.toLowerCase() === senderPlayer?.address.toLowerCase()
			) {
				taxAllies = true;
			} else if (senderPlayer) {
				if (
					toPlayer.alliances.length > 0 &&
					senderPlayer.alliances.length > 0
				) {
					const potentialAlliances = findCommonAlliances(
						toPlayer.alliances.map((v) => v.address),
						senderPlayer.alliances.map((v) => v.address),
					);
					// console.log({potentialAlliances});
					if (potentialAlliances.length > 0) {
						taxAllies = true;
					}
				}
			}
		}

		let actualGift = gift;

		if (specific) {
			if (specific === '0x0000000000000000000000000000000000000001') {
				if (gift) {
					actualGift = allies;
				} else {
					actualGift = allies;
				}
			} else {
				if (
					toPlayer &&
					toPlayer.address.toLowerCase() === specific.toLowerCase()
				) {
				}
			}
			// TODO more
		}

		if (actualGift) {
			// TODO specific
			let loss = 0n;
			if (!taxAllies) {
				loss = numAttack * (BigInt(this.giftTaxPer10000) / 10000n);
				numAttack = numAttack - loss;
			}
			return {
				min: {
					captured: false,
					numSpaceshipsLeft: Number(numDefenseMin + numAttack),
				},
				max: {
					captured: false,
					numSpaceshipsLeft: Number(numDefenseMax + numAttack),
				},
				timeUntilFails: 0,
				allies,
				taxAllies,
				gift: true,
				tax: {
					taxRate: this.giftTaxPer10000,
					loss: Number(loss),
				},
				nativeResist: nativeResistIfAttackFails,
			};
		}

		if (numAttack == 0n) {
			return {
				min: {
					captured: false,
					numSpaceshipsLeft: Number(numDefenseMin),
				},
				max: {
					captured: false,
					numSpaceshipsLeft: Number(numDefenseMax),
				},
				gift: false,
				allies,
				taxAllies,
				timeUntilFails: 0,
				nativeResist: nativeResistIfAttackFails,
				combat: {
					defenderLoss: 0,
					attackerLoss: 0,
				},
			};
		}

		let fleetOwnerTax = false;
		if (
			senderPlayer &&
			fromPlayer &&
			senderPlayer?.address !== fromPlayer?.address
		) {
			if (
				fromPlayer.alliances.length > 0 &&
				senderPlayer.alliances.length > 0
			) {
				const potentialAlliances = findCommonAlliances(
					fromPlayer.alliances.map((v) => v.address),
					senderPlayer.alliances.map((v) => v.address),
				);
				if (potentialAlliances.length == 0) {
					fleetOwnerTax = true;
				}
			} else {
				fleetOwnerTax = true;
			}
		}

		let loss = 0n;
		if (fleetOwnerTax) {
			loss = (numAttack * BigInt(this.giftTaxPer10000)) / 10000n;
			numAttack = numAttack - loss;
		}

		const minOutcome = {
			captured: false,
			numSpaceshipsLeft: 0,
		};
		const maxOutcome = {
			captured: false,
			numSpaceshipsLeft: 0,
		};

		const resultMin = this.combat(
			extra ? extra.attackPowerOverride : fromPlanet.stats.attack,
			numAttack,
			toPlanet.stats.defense,
			numDefenseMin + (extra?.defense ? BigInt(extra.defense) : 0n),
		);
		if (resultMin.attackerLoss == numAttack) {
			// TODO check numDefense winning on zeroes in smart contract
			minOutcome.captured = false;
			minOutcome.numSpaceshipsLeft = toPlanetState.natives
				? toPlanet.stats.natives
				: Number(
						numDefenseMin +
							(extra?.defense ? BigInt(extra.defense) : 0n) -
							resultMin.defenderLoss,
					);
		} else {
			minOutcome.captured = true;
			minOutcome.numSpaceshipsLeft = Number(numAttack - resultMin.attackerLoss);
		}

		const resultMax = this.combat(
			fromPlanet.stats.attack,
			numAttack,
			toPlanet.stats.defense,
			numDefenseMax,
		);
		if (resultMax.attackerLoss == numAttack) {
			maxOutcome.captured = false;
			maxOutcome.numSpaceshipsLeft = toPlanetState.natives
				? toPlanet.stats.natives
				: Number(numDefenseMax - resultMax.defenderLoss);
		} else {
			maxOutcome.captured = true;
			maxOutcome.numSpaceshipsLeft = Number(numAttack - resultMax.attackerLoss);
		}

		let timeUntilFails = 0;
		if (minOutcome.captured) {
			// TODO consider upkeep and production reduction
			const production =
				((numDefenseMax - numDefenseMin) * 1000000n) /
				BigInt(this.resolveWindow);
			if (production > 0n) {
				timeUntilFails = Number(
					((resultMin.attackDamage - numDefenseMin) * 1000000n) / production,
				);

				if (timeUntilFails > this.resolveWindow) {
					timeUntilFails = 0;
				}
			}
		}

		// TODO numDefenseMax = 0 due to exit => natives

		return {
			min: minOutcome,
			max: maxOutcome,
			allies,
			taxAllies,
			timeUntilFails,
			gift: false,
			tax:
				loss > 0
					? {
							taxRate: this.giftTaxPer10000,
							loss: Number(loss),
						}
					: undefined,
			nativeResist: !minOutcome.captured && nativeResistIfAttackFails,
			combat: {
				defenderLoss: Number(resultMin.defenderLoss),
				attackerLoss: Number(resultMin.attackerLoss),
			},
		};
	}

	/**
		* Simulate multiple fleets attacking the same target planet.
		* Each fleet is processed sequentially, with the planet state updated after each combat.
		*
		* @param fleets - Array of fleet inputs, each with source planet and fleet amount
		* @param toPlanet - Target planet info
		* @param toPlanetState - Current state of target planet
		* @param arrivalTime - Time when fleets arrive (optional, if not provided uses max travel time)
		* @param toPlayer - Player info for target planet owner (optional)
		* @returns Combined outcome showing each fleet's contribution and final result
		*/
	outcomeMultipleFleets(
		fleets: FleetInput[],
		toPlanet: PlanetInfo,
		toPlanetState: PlanetState,
		arrivalTime: number | undefined,
		toPlayer?: Player,
	): MultipleFleetOutcome {
		if (fleets.length === 0) {
			return {
				fleets: [],
				finalOutcome: {
					min: {
						captured: false,
						numSpaceshipsLeft: toPlanetState.natives ? toPlanet.stats.natives : toPlanetState.numSpaceships,
						owner: toPlanetState.owner,
					},
					max: {
						captured: false,
						numSpaceshipsLeft: toPlanetState.natives ? toPlanet.stats.natives : toPlanetState.numSpaceships,
						owner: toPlanetState.owner,
					},
				},
				arrivalTime: 0,
			};
		}

		// Calculate travel times for all fleets and determine arrival time
		const travelTimes = fleets.map(fleet => this.timeToArrive(fleet.fromPlanet, toPlanet));
		const maxTravelTime = Math.max(...travelTimes);
		const effectiveArrivalTime = arrivalTime ?? maxTravelTime;

		// Track fleet outcomes
		const fleetOutcomes: FleetOutcome[] = [];

		// Track min/max planet states - we simulate both paths
		let currentMinState = this.computeFuturePlanetState(
			toPlanet,
			toPlanetState,
			Math.max(0, effectiveArrivalTime),
		);
		let currentMaxState = this.computeFuturePlanetState(
			toPlanet,
			toPlanetState,
			Math.max(0, effectiveArrivalTime + this.resolveWindow),
		);

		// Track current owner (may change if planet is captured)
		let currentMinOwner = toPlanetState.owner;
		let currentMaxOwner = toPlanetState.owner;

		// Process each fleet sequentially
		for (const fleet of fleets) {
			// Get individual outcome (using duration 0 since we already computed state at arrival)
			const outcome = this.outcome(
				fleet.fromPlanet,
				toPlanet,
				currentMinState,
				fleet.fleetAmount,
				0, // already at arrival time
				fleet.senderPlayer,
				fleet.fromPlayer,
				toPlayer,
				fleet.gift,
				fleet.specific,
				fleet.extra,
			);

			fleetOutcomes.push({
				fromPlanet: fleet.fromPlanet,
				fleetAmount: fleet.fleetAmount,
				outcome,
			});

			// Update min state based on outcome
			if (outcome.min.captured) {
				// Planet was captured - attacker now owns it
				currentMinState = {
					...currentMinState,
					numSpaceships: outcome.min.numSpaceshipsLeft,
					natives: false,
					active: true,
					owner: fleet.fromPlayer?.address ?? fleet.senderPlayer?.address,
				};
				currentMinOwner = fleet.fromPlayer?.address ?? fleet.senderPlayer?.address;
				// Future fleets from the same player would be gifts, from different players would be attacks
			} else {
				// Attack failed or was a gift
				if (outcome.gift) {
					currentMinState = {
						...currentMinState,
						numSpaceships: outcome.min.numSpaceshipsLeft,
					};
				} else {
					// Attack failed - defender keeps planet with reduced spaceships
					currentMinState = {
						...currentMinState,
						numSpaceships: outcome.min.numSpaceshipsLeft,
					};
				}
			}

			// Update max state similarly (for max case scenario)
			if (outcome.max.captured) {
				currentMaxState = {
					...currentMaxState,
					numSpaceships: outcome.max.numSpaceshipsLeft,
					natives: false,
					active: true,
					owner: fleet.fromPlayer?.address ?? fleet.senderPlayer?.address,
				};
				currentMaxOwner = fleet.fromPlayer?.address ?? fleet.senderPlayer?.address;
			} else {
				if (outcome.gift) {
					currentMaxState = {
						...currentMaxState,
						numSpaceships: outcome.max.numSpaceshipsLeft,
					};
				} else {
					currentMaxState = {
						...currentMaxState,
						numSpaceships: outcome.max.numSpaceshipsLeft,
					};
				}
			}
		}

		// Determine final captured status - captured if owner changed from original
		const originalOwner = toPlanetState.owner?.toLowerCase();
		const minCaptured = currentMinOwner?.toLowerCase() !== originalOwner;
		const maxCaptured = currentMaxOwner?.toLowerCase() !== originalOwner;

		return {
			fleets: fleetOutcomes,
			finalOutcome: {
				min: {
					captured: minCaptured,
					numSpaceshipsLeft: currentMinState.numSpaceships,
					owner: currentMinOwner,
				},
				max: {
					captured: maxCaptured,
					numSpaceshipsLeft: currentMaxState.numSpaceships,
					owner: currentMaxOwner,
				},
			},
			arrivalTime: effectiveArrivalTime,
		};
	}

	combat(
		attack: number,
		numAttack: bigint,
		defense: number,
		numDefense: bigint,
	): {
		defenderLoss: bigint;
		attackerLoss: bigint;
		attackDamage: bigint;
	} {
		if (numAttack == 0n || numDefense == 0n) {
			return {
				defenderLoss: 0n,
				attackerLoss: 0n,
				attackDamage: 0n,
			};
		}

		const attackFactor =
			numAttack *
			(1000000n -
				BigInt(this.fleetSizeFactor6) +
				(numAttack * BigInt(this.fleetSizeFactor6)) / numDefense);

		const attackDamage =
			(attackFactor * BigInt(attack)) / BigInt(defense) / 1000000n;

		if (numDefense > attackDamage) {
			// attack fails
			return {
				attackerLoss: numAttack, // all attack destroyed
				defenderLoss: attackDamage, // 1 spaceship will be left at least as defenderLoss < numDefense
				attackDamage,
			};
		} else {
			// attack succeed
			const defenseFactor =
				numDefense *
				(1000000n -
					BigInt(this.fleetSizeFactor6) +
					(numDefense * BigInt(this.fleetSizeFactor6)) / numAttack);
			let defenseDamage =
				(defenseFactor * BigInt(defense)) / BigInt(attack) / 1000000n;
			if (defenseDamage >= numAttack) {
				defenseDamage = numAttack - 1n;
			}
			return {
				attackerLoss: defenseDamage,
				defenderLoss: numDefense, // all defense destroyeda
				attackDamage,
			};
		}
	}

	simulateCapture(
		from: string,
		planetInfo: PlanetInfo,
		planetState: PlanetState,
	): {
		success: boolean;
		numSpaceshipsLeft: number;
	} {
		// console.log(planetState.owner, from);
		if (
			planetState.owner &&
			planetState.owner?.toLowerCase() === from?.toLowerCase()
		) {
			return {
				success: true,
				numSpaceshipsLeft: planetState.numSpaceships + 100000, // TODO use contract _acquireNumSpaceships
			};
		}

		// Do not allow staking over occupied planets
		if (!planetState.natives) {
			if (planetState.numSpaceships > 0) {
				return {
					success: false,
					numSpaceshipsLeft: planetState.numSpaceships,
				};
			}
		}

		const numDefense = planetState.natives
			? planetInfo.stats.natives
			: planetState.numSpaceships;
		const {attackerLoss} = this.combat(
			10000,
			100000n, // TODO use contract _acquireNumSpaceships
			planetInfo.stats.defense,
			BigInt(numDefense),
		);

		if (attackerLoss < 100000n) {
			return {
				success: true,
				numSpaceshipsLeft: 100000 - Number(attackerLoss),
			};
		} else {
			return {
				success: false,
				numSpaceshipsLeft: planetState.numSpaceships,
			};
		}
	}
}
