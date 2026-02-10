export type Env = {
  LOGFLARE_API_KEY?: string;
  LOGFLARE_SOURCE?: string;
  NAMED_LOGS?: string;
  NAMED_LOGS_LEVEL?: string;
};

export type TokenDistributionEnv = {
  // Wallet private key for sending tokens (hex-encoded with 0x prefix)
  PRIVATE_KEY: string;
  // ERC20 token contract address
  TOKEN_ADDRESS: string;
  // Amount of tokens to distribute (in wei/smallest unit)
  TOKEN_AMOUNT: string;
  // if set along with NATIVE_TOKEN_AMOUNT use it to send tokens along with native tokens
  TOKEN_DISTRIBUTOR_ADDRESS?: string;
  // if set, along with TOKEN_DISTRIBUTOR_ADDRESS use it to send tokens along with native tokens
  NATIVE_TOKEN_AMOUNT?: string;
  // Amount of tokens to distribute (in wei/smallest unit)
  RPC_URL: string;
  // Network chain ID
  CHAIN_ID: string;
  // Timestamp tolerance in milliseconds (default: 5000)
  TIMESTAMP_TOLERANCE_MS?: string;
  // SelfClaw API base URL (default: https://selfclaw.ai)
  SELFCLAW_API_URL?: string;
};

export type CloudflareWorkerEnv = Env &
  TokenDistributionEnv & {
    DB: D1Database;
  };
