import {getClients, getChain} from 'tools-ethereum/helpers';
import {createSpaceInfo} from './contracts/space-info.js';
import {JsonFleetStorage} from './storage/json-storage.js';
import {FleetManager} from './fleet/manager.js';
import {PlanetManager} from './planet/manager.js';
import type {
	ClientsWithOptionalWallet,
	ConquestEnv,
	EnvFactoryOptions,
	GameContract,
} from './types.js';

import {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';

/**
 * Factory function to create the ConquestEnv
 * This is shared between CLI and MCP server
 *
 * @param options - Configuration options for creating the environment
 * @returns ConquestEnv with fleetManager and planetManager
 */
export async function createConquestEnv(options: EnvFactoryOptions): Promise<ConquestEnv> {
	const {rpcUrl, gameContract: gameContractAddress, privateKey, storagePath = './data'} = options;

	const chain = await getChain(rpcUrl);
	const clients = getClients({
		chain,
		privateKey,
	}) as ClientsWithOptionalWallet;

	const gameContract: GameContract = {
		address: gameContractAddress,
		abi: Abi_IOuterSpace,
	};

	const {spaceInfo, contractConfig} = await createSpaceInfo(clients, gameContract);
	const storage = new JsonFleetStorage(storagePath);

	return {
		fleetManager: new FleetManager(clients, gameContract, spaceInfo, contractConfig, storage),
		planetManager: new PlanetManager(clients, gameContract, spaceInfo, contractConfig, storage),
		spaceInfo,
		contractConfig,
		options,
	};
}
