import type {Provider, TransactionResponse} from '@ethersproject/abstract-provider';
import {poll} from '@ethersproject/web';
export async function waitForTransactionAcknowledgement(
  provider: Provider,
  hash: string
): Promise<TransactionResponse> {
  try {
    return await poll(
      async () => {
        return await provider.getTransaction(hash);
      },
      {oncePoll: provider}
    );
  } catch (error) {
    (<any>error).transactionHash = hash;
    throw error;
  }
}
