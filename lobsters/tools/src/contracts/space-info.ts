import {SpaceInfo} from 'conquest-eth-v0-contracts';
import type {ClientsWithOptionalWallet, ContractConfig, GameContract} from '../types.js';

export async function createSpaceInfo(
	clients: ClientsWithOptionalWallet,
	gameContract: GameContract,
): Promise<{spaceInfo: SpaceInfo; contractConfig: ContractConfig}> {
	// Fetch config from contract
	const config = await clients.publicClient.readContract({
		...gameContract,
		functionName: 'getConfig',
	});

	const contractConfig: ContractConfig = {
		genesis: BigInt(config.genesis),
		resolveWindow: BigInt(config.resolveWindow),
		timePerDistance: BigInt(config.timePerDistance),
		exitDuration: BigInt(config.exitDuration),
		acquireNumSpaceships: Number(config.acquireNumSpaceships),
	};

	// Create SpaceInfo instance with config
	// Note: The contract's getConfig() returns timePerDistance already divided by 4 (see OuterSpaceFacetBase constructor).
	// SpaceInfo also divides by 4 internally, so we need to multiply by 4 here to compensate.
	const spaceInfo = new SpaceInfo({
		genesis: config.genesis as `0x${string}`,
		resolveWindow: Number(config.resolveWindow),
		timePerDistance: Number(config.timePerDistance) * 4,
		exitDuration: Number(config.exitDuration),
		acquireNumSpaceships: Number(config.acquireNumSpaceships),
		productionSpeedUp: Number(config.productionSpeedUp),
		productionCapAsDuration: Number(config.productionCapAsDuration),
		upkeepProductionDecreaseRatePer10000th: Number(config.upkeepProductionDecreaseRatePer10000th),
		fleetSizeFactor6: Number(config.fleetSizeFactor6),
		giftTaxPer10000: Number(config.giftTaxPer10000),
		stakeRange: config.stakeRange,
		stakeMultiplier10000th: Number(config.stakeMultiplier10000th),
		bootstrapSessionEndTime: Number(config.bootstrapSessionEndTime),
		infinityStartTime: Number(config.infinityStartTime),
	});

	return {spaceInfo, contractConfig};
}
