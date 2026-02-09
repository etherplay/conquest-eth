/**
 * Token Claim Service
 *
 * Main service that orchestrates the token claiming process
 */

import type { RemoteSQL } from "remote-sql";
import type {
  ClaimRequest,
  ClaimResponse,
  ClaimSuccessResponse,
  ClaimErrorResponse,
  StatusResponse,
} from "./types.js";
import {
  buildClaimMessage,
  verifySignature,
  validateTimestamp,
  validateWalletAddress,
} from "./verification.js";
import { checkVerification } from "./selfclaw.js";
import { transferTokens } from "./token.js";
import { hasHumanClaimed, hasWalletReceived, recordClaim, getClaimStatus } from "./database.js";

export type { ClaimRequest, ClaimResponse, ClaimSuccessResponse, ClaimErrorResponse, StatusResponse };

export interface ClaimServiceConfig {
  privateKey: string;
  tokenAddress: string;
  tokenAmount: string;
  rpcUrl: string;
  chainId: number;
  timestampToleranceMs: number;
  selfClawApiUrl: string;
}

/**
 * Process a token claim request
 *
 * @param db - Database connection
 * @param request - The claim request
 * @param config - Service configuration
 * @returns Claim response
 */
export async function processClaim(
  db: RemoteSQL,
  request: ClaimRequest,
  config: ClaimServiceConfig,
): Promise<ClaimResponse> {
  // 1. Validate request format
  if (!request.publicKey || !request.signature || !request.timestamp || !request.walletAddress) {
    return createError("invalid_request", "Missing required fields");
  }

  if (!validateWalletAddress(request.walletAddress)) {
    return createError("invalid_request", "Invalid wallet address format");
  }

  // 2. Validate timestamp
  if (!validateTimestamp(request.timestamp, config.timestampToleranceMs)) {
    return createError("timestamp_expired", "Request timestamp expired");
  }

  // 3. Verify signature
  const message = buildClaimMessage(request.timestamp, request.walletAddress);
  const signatureValid = await verifySignature(
    request.publicKey,
    request.signature,
    message,
  );

  if (!signatureValid) {
    return createError("invalid_signature", "Invalid signature");
  }

  // 4. Verify with SelfClaw
  const verification = await checkVerification(
    request.publicKey,
    config.selfClawApiUrl,
  );

  if (!verification.verified || !verification.humanId) {
    return createError("not_verified", "Agent is not verified with SelfClaw");
  }

  const humanId = verification.humanId;

  // 5. Check if humanId already claimed
  if (await hasHumanClaimed(db, humanId)) {
    return createError("human_already_claimed", "This human has already claimed tokens");
  }

  // 6. Check if wallet already received
  if (await hasWalletReceived(db, request.walletAddress)) {
    return createError("wallet_already_received", "This wallet has already received tokens");
  }

  // 7. Transfer tokens
  let txHash: string;
  try {
    txHash = await transferTokens(
      config.privateKey,
      config.tokenAddress,
      request.walletAddress,
      config.tokenAmount,
      config.rpcUrl,
      config.chainId,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return createError("transfer_failed", `Token transfer failed: ${errorMessage}`);
  }

  // 8. Record claim
  await recordClaim(db, {
    humanId,
    walletAddress: request.walletAddress,
    publicKey: request.publicKey,
    txHash,
    amount: config.tokenAmount,
    tokenAddress: config.tokenAddress,
    claimedAt: Date.now(),
  });

  // 9. Return success
  return {
    success: true,
    txHash,
    walletAddress: request.walletAddress,
    amount: config.tokenAmount,
    tokenAddress: config.tokenAddress,
    humanId,
  };
}

/**
 * Get claim status for a humanId
 *
 * @param db - Database connection
 * @param humanId - The human ID to check
 * @returns Status response
 */
export async function getStatus(
  db: RemoteSQL,
  humanId: string,
): Promise<StatusResponse> {
  return getClaimStatus(db, humanId);
}

/**
 * Create an error response
 */
function createError(
  error: ClaimErrorResponse["error"],
  message: string,
): ClaimErrorResponse {
  return {
    success: false,
    error,
    message,
  };
}

// Re-export types and functions
export { buildClaimMessage } from "./verification.js";
export { verifyAgent } from "./selfclaw.js";
export { getDistributorBalance } from "./token.js";
