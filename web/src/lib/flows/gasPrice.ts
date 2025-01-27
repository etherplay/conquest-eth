import {BigNumber} from '@ethersproject/bignumber';
import {formatEther} from '@ethersproject/units';
import {getBestGasEstimate} from 'fuzd-client';
import type {WindowWeb3Provider} from 'web3w';

export async function getGasPrice(
  provider: WindowWeb3Provider,
  priority = 0.5
): Promise<{
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
}> {
  const currentGasPrice: {maxFeePerGas: bigint; maxPriorityFeePerGas: bigint} = await getBestGasEstimate(
    provider,
    priority
  );
  let maxFeePerGas = BigNumber.from(currentGasPrice.maxFeePerGas);
  let maxPriorityFeePerGas = BigNumber.from(currentGasPrice.maxPriorityFeePerGas);
  console.log({
    maxFeePerGas: formatEther(currentGasPrice.maxFeePerGas),
    maxPriorityFeePerGas: formatEther(currentGasPrice.maxPriorityFeePerGas),
  });

  return {maxFeePerGas, maxPriorityFeePerGas};
}
