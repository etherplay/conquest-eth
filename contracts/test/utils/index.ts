// Simple user type for tests
import type {WalletClient} from 'viem';

export type User = {
	address: `0x${string}`;
	signer: WalletClient;
};