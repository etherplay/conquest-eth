// User setup utilities for tests
import type {Account, Client, WalletClient} from 'viem';
import type {TypedDataDomain, TypedDataField} from 'viem';
import type {Environment} from '../../rocketh/config.js';

/**
 * User type with address, signer, and connected contracts
 */
export type User<T extends Record<string, any>> = {
	address: `0x${string}`;
	signer: WalletClient;
} & T;

/**
 * Setup multiple users with contract connections
 */
export async function setupUsers<T extends Record<string, any>>(
	accounts: readonly Account[],
	contracts: T,
	getClientForAddress: (address: `0x${string}`) => Promise<WalletClient>,
): Promise<User<T>[]> {
	const users: User<T>[] = [];
	for (const account of accounts) {
		users.push(await setupUser(account.address, contracts, getClientForAddress));
	}
	return users;
}

/**
 * Setup a single user with contract connections
 */
export async function setupUser<T extends Record<string, any>>(
	address: `0x${string}`,
	contracts: T,
	getClientForAddress: (address: `0x${string}`) => Promise<WalletClient>,
): Promise<User<T>> {
	const signer = await getClientForAddress(address);
	// @ts-expect-error - dynamic property assignment
	const user: User<T> = {address, signer};
	for (const key of Object.keys(contracts)) {
		// @ts-expect-error - dynamic property assignment
		user[key] = contracts[key].connect(signer);
	}
	return user as User<T>;
}

/**
 * EIP-712 Signer utility for typed data signing
 */
export class EIP712Signer {
	constructor(
		private domain: TypedDataDomain,
		private types: Record<string, Array<TypedDataField>>,
	) {}

	async sign(
		user: User<any>,
		value: Record<string, any>,
	): Promise<`0x${string}`> {
		return user.signer.signTypedData(this.domain, this.types, value);
	}
}

/**
 * EIP-712 Signer Factory for creating signers with different domains
 */
export class EIP712SignerFactory {
	constructor(
		private fixedDomain: TypedDataDomain,
		private types: Record<string, Array<TypedDataField>>,
	) {}

	createSigner(domain: TypedDataDomain): {
		sign: (user: User<any>, value: Record<string, any>) => Promise<`0x${string}`>;
	} {
		const domainToUse = {...this.fixedDomain, ...domain};
		const types = this.types;
		return {
			async sign(user: User<any>, value: Record<string, any>): Promise<`0x${string}`> {
				return user.signer.signTypedData(domainToUse, types, value);
			},
		};
	}
}

/**
 * Convert account from environment to user with contracts
 */
export async function accountToUser<T extends Record<string, any>>(
	account: Account,
	contracts: T,
	getWalletClient: () => Promise<WalletClient>,
): Promise<User<T>> {
	const signer = await getWalletClient();
	// @ts-expect-error - dynamic property assignment
	const user: User<T> = {address: account.address, signer};
	for (const key of Object.keys(contracts)) {
		// @ts-expect-error - dynamic property assignment
		user[key] = contracts[key].connect(signer);
	}
	return user as User<T>;
}