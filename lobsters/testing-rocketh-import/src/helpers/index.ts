import {Methods} from 'eip-1193';
import {createCurriedJSONRPC} from 'remote-procedure-call';

export async function getChain(rpcUrl: string) {
	const rpc = createCurriedJSONRPC<Methods>(rpcUrl);
	const response = await rpc.call('eth_chainId')();
	if (!response.success) {
		throw new Error('Failed to get chain ID');
	}
	const chainIDAsHex = response.value;

	const chain = {
		id: Number(chainIDAsHex),
		name: 'Unknown',
		nativeCurrency: {
			decimals: 18,
			name: 'Ether',
			symbol: 'ETH',
		},
		rpcUrls: {
			default: {
				http: [rpcUrl],
			},
		},
	};
	return chain;
}
