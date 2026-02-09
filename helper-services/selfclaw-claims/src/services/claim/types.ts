/**
 * Claim Service Types
 */

/**
 * Request body for claiming tokens
 */
export interface ClaimRequest {
  /** Agent's Ed25519 public key in SPKI DER format - base64 encoded */
  publicKey: string;
  /** Ed25519 signature of the message - hex encoded */
  signature: string;
  /** Current timestamp in milliseconds */
  timestamp: number;
  /** Wallet address to receive tokens - 0x prefixed */
  walletAddress: string;
}

/**
 * Success response for token claim
 */
export interface ClaimSuccessResponse {
  success: true;
  txHash: string;
  walletAddress: string;
  amount: string;
  tokenAddress: string;
  humanId: string;
}

/**
 * Error response when claim is rejected
 */
export interface ClaimErrorResponse {
  success: false;
  error:
    | "human_already_claimed"
    | "wallet_already_received"
    | "invalid_signature"
    | "timestamp_expired"
    | "not_verified"
    | "invalid_request"
    | "transfer_failed";
  message: string;
}

/**
 * Union type for claim responses
 */
export type ClaimResponse = ClaimSuccessResponse | ClaimErrorResponse;

/**
 * Status check response
 */
export interface StatusResponse {
  humanId: string;
  claimed: boolean;
  claim?: {
    walletAddress: string;
    txHash: string;
    claimedAt: number;
  };
}

/**
 * Database record for a token claim
 */
export interface ClaimRecord {
  id?: number;
  humanId: string;
  walletAddress: string;
  publicKey: string;
  txHash: string;
  amount: string;
  tokenAddress: string;
  claimedAt: number;
  createdAt?: number;
}

/**
 * SelfClaw agent verification response
 */
export interface SelfClawAgentResponse {
  verified: boolean;
  publicKey: string;
  agentName?: string;
  humanId?: string;
  selfxyz?: {
    verified: boolean;
    registeredAt: string;
  };
  swarm?: string;
}
