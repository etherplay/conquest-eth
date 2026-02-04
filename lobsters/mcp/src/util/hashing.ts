import type {Address} from 'viem';
import {encodeAbiParameters, keccak256} from 'viem';

/**
 * Compute the toHash used in fleet commit phase
 * This hashes the destination planet and secret together
 *
 * @param toPlanetId - The destination planet location ID
 * @param secret - The secret value to commit to
 * @returns The hash commitment (keccak256 hash)
 */
export function computeToHash(toPlanetId: bigint, secret: `0x${string}`): `0x${string}` {
	return keccak256(
		encodeAbiParameters(
			[
				{name: 'to', type: 'uint256'},
				{name: 'secret', type: 'bytes32'},
			],
			[toPlanetId, secret],
		),
	);
}

/**
 * Compute the fleet ID from send transaction parameters
 * The fleet ID is computed from: toHash, from, fleetSender, operator
 * This matches what the contract emits in the FleetSent event
 *
 * @param toHash - The hash commitment to destination and secret
 * @param fromPlanetId - The source planet location ID
 * @param fleetSender - The address that owns the fleet
 * @param operator - The address that committed the transaction
 * @returns The fleet ID (keccak256 hash)
 */
export function computeFleetId(
	toHash: `0x${string}`,
	fromPlanetId: bigint,
	fleetSender: Address,
	operator: Address,
): `0x${string}` {
	return keccak256(
		encodeAbiParameters(
			[
				{name: 'toHash', type: 'bytes32'},
				{name: 'from', type: 'uint256'},
				{name: 'fleetSender', type: 'address'},
				{name: 'operator', type: 'address'},
			],
			[toHash, fromPlanetId, fleetSender, operator],
		),
	);
}

/**
 * Generate a random secret for fleet commitment
 *
 * @returns A cryptographically random 32-byte hex string
 */
export function generateSecret(): `0x${string}` {
	const randomBytes = new Uint8Array(32);
	crypto.getRandomValues(randomBytes);
	return `0x${Buffer.from(randomBytes).toString('hex')}`;
}
