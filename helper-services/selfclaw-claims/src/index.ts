import {Hono} from 'hono';
import type {ContentfulStatusCode} from 'hono/utils/http-status';
import {CloudflareWorkerEnv} from './env.js';
import {ServerOptions} from './types.js';
import {processClaim, getStatus, type ClaimRequest, type ClaimServiceConfig} from './services/claim/index.js';

const DEFAULT_TIMESTAMP_TOLERANCE_MS = 5000;
const DEFAULT_SELFCLAW_API_URL = 'https://selfclaw.ai';

export function createServer<CustomEnv extends CloudflareWorkerEnv>(options: ServerOptions<CustomEnv>) {
  const app = new Hono<{Bindings: CustomEnv}>();

  // Health check endpoint
  app.get('/', (c) => {
    return c.text('Token Distribution Service - OK');
  });

  // Claim tokens endpoint
  app.post('/api/claim', async (c) => {
    const env = options.getEnv(c);
    const db = options.services.getDB(env);

    // Parse request body
    let request: ClaimRequest;
    try {
      request = await c.req.json<ClaimRequest>();
    } catch {
      return c.json(
        {
          success: false,
          error: 'invalid_request',
          message: 'Invalid JSON body',
        },
        400,
      );
    }

    // Build config from environment
    const config: ClaimServiceConfig = {
      privateKey: env.PRIVATE_KEY,
      tokenAddress: env.TOKEN_ADDRESS,
      tokenAmount: env.TOKEN_AMOUNT,
      tokenDistributorAddress: env.TOKEN_DISTRIBUTOR_ADDRESS,
      nativeTokenAmount: env.NATIVE_TOKEN_AMOUNT,
      rpcUrl: env.RPC_URL,
      chainId: parseInt(env.CHAIN_ID, 10),
      timestampToleranceMs: env.TIMESTAMP_TOLERANCE_MS
        ? parseInt(env.TIMESTAMP_TOLERANCE_MS, 10)
        : DEFAULT_TIMESTAMP_TOLERANCE_MS,
      selfClawApiUrl: env.SELFCLAW_API_URL || DEFAULT_SELFCLAW_API_URL,
    };

    // Process the claim
    const result = await processClaim(db, request, config);

    if (result.success) {
      return c.json(result, 200);
    }

    // Map error types to HTTP status codes
    const statusMap: Record<string, ContentfulStatusCode> = {
      invalid_request: 400,
      timestamp_expired: 401,
      invalid_signature: 401,
      not_verified: 403,
      human_already_claimed: 409,
      wallet_already_received: 409,
      transfer_failed: 500,
    };

    const status: ContentfulStatusCode = statusMap[result.error] || 500;
    return c.json(result, status);
  });

  // Status check endpoint
  app.get('/api/status', async (c) => {
    const humanId = c.req.query('humanId');

    if (!humanId) {
      return c.json(
        {
          success: false,
          error: 'invalid_request',
          message: 'humanId query parameter is required',
        },
        400,
      );
    }

    const env = options.getEnv(c);
    const db = options.services.getDB(env);

    const status = await getStatus(db, humanId);
    return c.json(status, 200);
  });

  return app;
}
