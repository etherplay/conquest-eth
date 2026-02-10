/**
 * ERC20 Token Transfer Service
 *
 * Handles sending ERC20 tokens using viem
 */

import {createWalletClient, createPublicClient, http, parseAbi, type Chain} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';

// ERC20 transfer ABI
const erc20Abi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

const tokenDistributorAbi = parseAbi([
  'function transferTokenAlongWithNativeToken(address token, address payable to, uint256 amount) payable',
]);

/**
 * Create a chain configuration from chain ID
 */
function createChainConfig(chainId: number, rpcUrl: string): Chain {
  return {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: {
      name: 'Native',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: {
      default: {http: [rpcUrl]},
    },
  };
}

/**
 * Transfer ERC20 tokens to a recipient
 *
 * @param privateKey - Hex-encoded private key (0x-prefixed)
 * @param tokenAddress - ERC20 token contract address
 * @param toAddress - Recipient wallet address
 * @param amount - Amount in wei/smallest unit (as string to handle big numbers)
 * @param rpcUrl - Blockchain RPC endpoint
 * @param chainId - Network chain ID
 * @returns Transaction hash
 */
export async function transferTokens(
  privateKey: string,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  rpcUrl: string,
  chainId: number,
  useTokenDistributor?: {
    address: string;
    nativeTokenAmount: string;
  },
): Promise<string> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chain = createChainConfig(chainId, rpcUrl);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  let hash: `0x${string}`;
  if (useTokenDistributor) {
    hash = await walletClient.writeContract({
      address: useTokenDistributor.address as `0x${string}`,
      abi: tokenDistributorAbi,
      functionName: 'transferTokenAlongWithNativeToken',
      args: [tokenAddress as `0x${string}`, toAddress as `0x${string}`, BigInt(amount)],
      value: BigInt(useTokenDistributor.nativeTokenAmount),
    });
  } else {
    hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [toAddress as `0x${string}`, BigInt(amount)],
    });
  }

  return hash;
}

/**
 * Get the token balance of the distributor wallet
 *
 * @param privateKey - Hex-encoded private key (0x-prefixed)
 * @param tokenAddress - ERC20 token contract address
 * @param rpcUrl - Blockchain RPC endpoint
 * @param chainId - Network chain ID
 * @returns Balance in wei as string
 */
export async function getDistributorBalance(
  privateKey: string,
  tokenAddress: string,
  rpcUrl: string,
  chainId: number,
): Promise<string> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const chain = createChainConfig(chainId, rpcUrl);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });

  return balance.toString();
}
