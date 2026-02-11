/**
 * Database Service for Token Claims
 *
 * Handles D1 database operations for tracking claims
 */

import type { RemoteSQL } from "remote-sql";
import type { ClaimRecord, StatusResponse } from "./types.js";

/**
 * Check if a humanId has already claimed tokens for a specific chain and token
 *
 * @param db - RemoteSQL database instance
 * @param humanId - The human ID to check
 * @param chainId - The chain ID to check
 * @param tokenAddress - The token address to check
 * @returns true if already claimed for this chain/token combination
 */
export async function hasHumanClaimed(
  db: RemoteSQL,
  humanId: string,
  chainId: string,
  tokenAddress: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      "SELECT 1 FROM token_claims WHERE human_id = ? AND chain_id = ? AND token_address = ?",
    )
    .bind(humanId.toLowerCase(), chainId, tokenAddress.toLowerCase())
    .all();
  return result.results.length > 0;
}

/**
 * Check if a wallet has already received tokens for a specific chain and token
 *
 * @param db - RemoteSQL database instance
 * @param walletAddress - The wallet address to check
 * @param chainId - The chain ID to check
 * @param tokenAddress - The token address to check
 * @returns true if already received for this chain/token combination
 */
export async function hasWalletReceived(
  db: RemoteSQL,
  walletAddress: string,
  chainId: string,
  tokenAddress: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      "SELECT 1 FROM token_claims WHERE wallet_address = ? AND chain_id = ? AND token_address = ?",
    )
    .bind(walletAddress.toLowerCase(), chainId, tokenAddress.toLowerCase())
    .all();
  return result.results.length > 0;
}

/**
 * Record a new token claim in the database
 *
 * @param db - RemoteSQL database instance
 * @param claim - The claim record to insert
 */
export async function recordClaim(
  db: RemoteSQL,
  claim: ClaimRecord,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO token_claims 
          (human_id, wallet_address, public_key, tx_hash, amount, token_address, chain_id, claimed_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      claim.humanId.toLowerCase(),
      claim.walletAddress.toLowerCase(),
      claim.publicKey,
      claim.txHash,
      claim.amount,
      claim.tokenAddress.toLowerCase(),
      claim.chainId,
      claim.claimedAt,
    )
    .all();
}

/**
 * Get claim status for a humanId, optionally scoped to a specific chain and token
 *
 * @param db - RemoteSQL database instance
 * @param humanId - The human ID to check
 * @param chainId - Optional chain ID to scope the check
 * @param tokenAddress - Optional token address to scope the check
 * @returns Status response with claim details if claimed
 */
export async function getClaimStatus(
  db: RemoteSQL,
  humanId: string,
  chainId?: string,
  tokenAddress?: string,
): Promise<StatusResponse> {
  let query =
    "SELECT wallet_address, tx_hash, claimed_at FROM token_claims WHERE human_id = ?";
  const params: string[] = [humanId.toLowerCase()];

  if (chainId && tokenAddress) {
    query += " AND chain_id = ? AND token_address = ?";
    params.push(chainId, tokenAddress.toLowerCase());
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<{
      wallet_address: string;
      tx_hash: string;
      claimed_at: number;
    }>();

  if (result.results.length === 0) {
    return {
      humanId,
      claimed: false,
    };
  }

  const row = result.results[0];

  return {
    humanId,
    claimed: true,
    claim: {
      walletAddress: row.wallet_address,
      txHash: row.tx_hash,
      claimedAt: row.claimed_at,
    },
  };
}

/**
 * Get claim by wallet address, optionally scoped to a specific chain and token
 *
 * @param db - RemoteSQL database instance
 * @param walletAddress - The wallet address to check
 * @param chainId - Optional chain ID to scope the check
 * @param tokenAddress - Optional token address to scope the check
 * @returns Claim record if exists, null otherwise
 */
export async function getClaimByWallet(
  db: RemoteSQL,
  walletAddress: string,
  chainId?: string,
  tokenAddress?: string,
): Promise<ClaimRecord | null> {
  let query = `SELECT id, human_id, wallet_address, public_key, tx_hash, amount, token_address, chain_id, claimed_at, created_at 
          FROM token_claims WHERE wallet_address = ?`;
  const params: string[] = [walletAddress.toLowerCase()];

  if (chainId && tokenAddress) {
    query += " AND chain_id = ? AND token_address = ?";
    params.push(chainId, tokenAddress.toLowerCase());
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<{
      id: number;
      human_id: string;
      wallet_address: string;
      public_key: string;
      tx_hash: string;
      amount: string;
      token_address: string;
      chain_id: string;
      claimed_at: number;
      created_at: number;
    }>();

  if (result.results.length === 0) {
    return null;
  }

  const row = result.results[0];

  return {
    id: row.id,
    humanId: row.human_id,
    walletAddress: row.wallet_address,
    publicKey: row.public_key,
    txHash: row.tx_hash,
    amount: row.amount,
    tokenAddress: row.token_address,
    chainId: row.chain_id,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
  };
}
