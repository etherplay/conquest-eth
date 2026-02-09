import _contractsInfos from '$lib/contracts.json';
import {readable} from 'svelte/store';

export const initialContractsInfos = _contractsInfos;

/**
 * Check if the deployment is using an external token (like existing ERC-20)
 * instead of the built-in mintable PlayToken.
 *
 * External tokens:
 * - Cannot be minted with native tokens
 * - May not support ERC-677 transferAndCall
 * - Require using acquireMultipleViaTransferFrom instead of acquireMultipleViaNativeTokenAndStakingToken
 * - Require allowance approval before transfer
 *
 * @returns true if using external token, false if using mintable PlayToken
 */
export function isExternalToken(): boolean {
  const linkedData = (_contractsInfos?.contracts as any)?.PlayToken?.linkedData;
  return !linkedData?.numTokensPerNativeTokenAt18Decimals || linkedData.numTokensPerNativeTokenAt18Decimals === '0';
}

let _set;
export const contractsInfos = readable(_contractsInfos, (set) => {
  _set = set;
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    try {
      _set(newModule.initialContractsInfos);
    } catch (e) {
      console.error('_set contracts', e);
    }
  });
}
