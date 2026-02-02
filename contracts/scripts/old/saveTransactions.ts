import {ethers} from 'hardhat';
import fs from 'fs-extra';
import path from 'path';
import {TransactionResponse} from '@ethersproject/providers';
import type {
	BlockWithTransactions,
	TransactionReceipt,
} from '@ethersproject/abstract-provider';

export type TransactionJSONObject = {
	hash: string;

	to?: string;
	from?: string;
	nonce: number;

	gasLimit: string;
	gasPrice?: string;

	data: string;
	value: string;
	chainId: number;

	r?: string;
	s?: string;
	v?: number;

	// Typed-Transaction features
	type?: number;

	// EIP-2930; Type 1 & EIP-1559; Type 2
	accessList?: Array<{address: string; storageKeys: Array<string>}>;

	// EIP-1559; Type 2
	maxPriorityFeePerGas?: string;
	maxFeePerGas?: string;

	// Only if a transaction has been mined
	blockNumber: number;
	blockHash: string;
	timestamp: number;

	// The raw transaction
	raw?: string;

	receiptInfo?: {
		transactionIndex: number;
		gasUsed: string;
		cumulativeGasUsed: string;
		effectiveGasPrice: string;
		byzantium: boolean;
		status?: number;
	};
};

function convertTransactionResponseToJSONObject(
	tx: TransactionResponse,
	block: BlockWithTransactions,
	receipt?: TransactionReceipt,
): TransactionJSONObject {
	return {
		hash: tx.hash,
		to: tx.to,
		from: tx.from,
		nonce: tx.nonce,
		gasLimit: tx.gasLimit.toString(),
		gasPrice: tx.gasPrice?.toString(),
		data: tx.data,
		value: tx.value.toString(),
		chainId: tx.chainId,
		r: tx.r,
		s: tx.s,
		v: tx.v,
		type: tx.type == null ? undefined : tx.type,
		accessList: tx.accessList,
		maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
		maxFeePerGas: tx.maxFeePerGas?.toString(),
		blockNumber: block.number,
		blockHash: block.hash,
		timestamp: block.timestamp,
		raw: tx.raw,

		receiptInfo: receipt
			? {
					transactionIndex: receipt.transactionIndex,
					gasUsed: receipt.gasUsed?.toString(),
					cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
					effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
					byzantium: receipt.byzantium,
					status: receipt.status,
				}
			: undefined,
	};
}

const fetchReceipt = true;
const FOLDER = 'saved-networks';
const transactionFilepath = path.join(FOLDER, 'transactions.json');
async function main() {
	let transactionsFromFile;
	try {
		transactionsFromFile = JSON.parse(
			fs.readFileSync(transactionFilepath).toString(),
		);
	} catch (e) {}
	const allTransactions: TransactionJSONObject[] = transactionsFromFile || [];
	let fromBlock = 0;
	if (allTransactions.length > 0) {
		const blockNumberFound =
			allTransactions[allTransactions.length - 1].blockNumber;
		if (!blockNumberFound) {
			throw new Error(
				`no block number found in last tx: ${allTransactions[allTransactions.length - 1].hash}`,
			);
		}
		fromBlock = blockNumberFound + 1;
	}
	const lastBlock = await ethers.provider.getBlockNumber();
	console.log(`fetching blocks from ${fromBlock} to ${lastBlock}....`);
	fs.ensureDirSync(FOLDER);
	for (let i = fromBlock; i < lastBlock; i++) {
		if (i % 30 == 0) {
			console.log(i);
		}
		const block = await ethers.provider.getBlockWithTransactions(i);
		if (block.transactions.length > 0) {
			let newTransactions: TransactionJSONObject[];
			if (fetchReceipt) {
				newTransactions = [];
				for (const tx of block.transactions) {
					const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
					newTransactions.push(
						convertTransactionResponseToJSONObject(tx, block, receipt),
					);
				}
			} else {
				newTransactions = block.transactions.map((tx) =>
					convertTransactionResponseToJSONObject(tx, block),
				);
			}

			allTransactions.push(...newTransactions);
			fs.writeFileSync(
				transactionFilepath,
				JSON.stringify(allTransactions, null, '  '),
			);
			console.log(`wrote ${newTransactions.length} more tx`);
		}
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
