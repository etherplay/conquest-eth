import {network} from 'hardhat';
import fs from 'fs-extra';
import path from 'path';
import {TransactionJSONObject} from './saveTransactions';
import {JsonRpcProvider, TransactionResponse} from '@ethersproject/providers';
import {BigNumber} from 'ethers';
import {node_url} from '../utils/network';

const FOLDER = 'saved-networks';
const transactionFilepath = path.join(FOLDER, 'transactions.json');
const impersonatedMap: {[address: string]: boolean} = {};
async function main() {
  // TODO why ?
  const provider = new JsonRpcProvider(node_url(network.name));
  const transactionsFromFile: TransactionJSONObject[] = JSON.parse(fs.readFileSync(transactionFilepath).toString());
  const txs: TransactionResponse[] = [];
  if (transactionsFromFile.length === 0) {
    return;
  }
  const startTime = transactionsFromFile[0].timestamp;
  const endTime = transactionsFromFile[transactionsFromFile.length - 1].timestamp;
  const duration = endTime - startTime;
  console.log(`processing ${transactionsFromFile.length} transaction for across ${duration / 3600} hours`);

  let counter = 0;
  let lastBlockNumber = 0;
  let lastBlockTime = 0;
  for (const transaction of transactionsFromFile) {
    if (lastBlockNumber != transaction.blockNumber) {
      console.log(`waiting for tx to be mined...`);
      await Promise.all(txs);
      lastBlockNumber = transaction.blockNumber;
      if (lastBlockTime > 0) {
        const latestBlock = await provider.getBlock('latest');
        const currentStartTime = latestBlock.timestamp;
        const delayBetweenBlock = transaction.timestamp - lastBlockTime;
        try {
          await provider.send(`evm_setNextBlockTimestamp`, [currentStartTime + delayBetweenBlock]);
        } catch (e) {
          console.error(e);
        }
      }
      lastBlockTime = transaction.timestamp;
    }
    if (transaction.raw) {
      console.log('TODO raw');
    }
    const from = transaction.from;
    if (!from) {
      console.log('TODO no from');
      continue;
    }

    if (!impersonatedMap[from.toLowerCase()]) {
      console.log(`impersonating ${from}...`);
      await provider.send('hardhat_impersonateAccount', [from]);
      impersonatedMap[from.toLowerCase()] = true;
    }

    const signer = await provider.getSigner(from);
    let tx;
    try {
      tx = await signer.sendTransaction({
        to: transaction.to,
        // from: transaction.from?.toLowerCase(),
        nonce: transaction.nonce,

        gasLimit: BigNumber.from(transaction.gasLimit),
        gasPrice: transaction.maxFeePerGas
          ? undefined
          : transaction.gasPrice
          ? BigNumber.from(transaction.gasPrice)
          : undefined,

        data: transaction.data,
        value: transaction.value ? BigNumber.from(transaction.value) : undefined,
        chainId: transaction.chainId,

        type: transaction.type,
        accessList: transaction.accessList,

        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
          ? BigNumber.from(transaction.maxPriorityFeePerGas)
          : undefined,
        maxFeePerGas: transaction.maxFeePerGas ? BigNumber.from(transaction.maxFeePerGas) : undefined,
      });
      console.log(`sending tx ${tx.hash}...`);
      txs.push(tx);
    } catch (e) {
      if (transaction.receiptInfo && transaction.receiptInfo.status !== 0) {
        console.error(e);
      }
    }

    counter++;
  }
  console.log(`awaiting transactions...`);
  await Promise.all(txs);
  console.log(`done!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
