/**
 * Database Service for Token Claims
 *
 * Handles D1 database operations for tracking claims
 */

import type { RemoteSQL } from "remote-sql";
import type { ClaimRecord, StatusResponse } from "./types.js";

/**
 * Check if a humanId has already claimed tokens
 *
 * @param db - RemoteSQL database instance
 * @param humanId - The human ID to check
 * @returns true if already claimed
 */
export async function hasHumanClaimed(
  db: RemoteSQL,
  humanId: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM token_claims WHERE human_id = ?",
    args: [humanId.toLowerCase()],
  });
  return result.rows.length > 0;
}

/**
 * Check if a wallet has already received tokens
 *
 * @param db - RemoteSQL database instance
 * @param walletAddress - The wallet address to check
 * @returns true if already received
 */
export async function hasWalletReceived(
  db: RemoteSQL,
  walletAddress: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM token_claims WHERE wallet_address = ?",
    args: [walletAddress.toLowerCase()],
  });
  return result.rows.length > 0;
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
  await db.execute({
    sql: `INSERT INTO token_claims 
          (human_id, wallet_address, public_key, tx_hash, amount, token_address, claimed_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      claim.humanId.toLowerCase(),
      claim.walletAddress.toLowerCase(),
      claim.publicKey,
      claim.txHash,
      claim.amount,
      claim.tokenAddress.toLowerCase(),
      claim.claimedAt,
    ],
  });
}

/**
 * Get claim status for a humanId
 *
 * @param db - RemoteSQL database instance
 * @param humanId - The human ID to check
 * @returns Status response with claim details if claimed
 */
export async function getClaimStatus(
  db: RemoteSQL,
  humanId: string,
): Promise<StatusResponse> {
  const result = await db.execute({
    sql: "SELECT wallet_address, tx_hash, claimed_at FROM token_claims WHERE human_id = ?",
    args: [humanId.toLowerCase()],
  });

  if (result.rows.length === 0) {
    return {
      humanId,
      claimed: false,
    };
  }

  const row = result.rows[0] as {
    wallet_address: string;
    tx_hash: string;
    claimed_at: number;
  };

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
 * Get claim by wallet address
 *
 * @param db - RemoteSQL database instance
 * @param walletAddress - The wallet address to check
 * @returns Claim record if exists, null otherwise
 */
export async function getClaimByWallet(
  db: RemoteSQL,
  walletAddress: string,
): Promise<ClaimRecord | null> {
  const result = await db.execute({
    sql: `SELECT id, human_id, wallet_address, public_key, tx_hash, amount, token_address, claimed_at, created_at 
          FROM token_claims WHERE wallet_address = ?`,
    args: [walletAddress.toLowerCase()],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: number;
    human_id: string;
    wallet_address: string;
    public_key: string;
    tx_hash: string;
    amount: string;
    token_address: string;
    claimed_at: number;
    created_at: number;
  };

  return {
    id: row.id,
    humanId: row.human_id,
    walletAddress: row.wallet_address,
    publicKey: row.public_key,
    txHash: row.tx_hash,
    amount: row.amount,
    tokenAddress: row.token_address,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
  };
}
