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
    return c.text(
      `
# Token Distribution Service

Use the following scripts to interact with the service:

## Claim Tokens

\`\`\`bash
#!/usr/bin/env npx tsx
/**
 * Claim Script
 *
 * Claims tokens for a given on-chain address by signing a request with an Ed25519 private key.
 *
 * Usage:
 *   ED25519_PRIVATE_KEY="<base64-private-key>" npx tsx scripts/claim.ts <wallet-address>
 *
 * Environment variables:
 *   ED25519_PRIVATE_KEY - The Ed25519 private key in base64 format (PKCS#8 DER)
 *   CLAIM_API_URL - Optional: The claim API URL (default: https://selfclaw-claim.conquest.game)
 */

import * as crypto from 'node:crypto';
import {loadEnv} from 'ldenv';
loadEnv();

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: ED25519_PRIVATE_KEY=<key> npx tsx scripts/claim.ts <wallet-address>');
  console.error('');
  console.error('Arguments:');
  console.error('  wallet-address  The Ethereum wallet address to claim tokens for (0x...)');
  console.error('');
  console.error('Environment variables:');
  console.error('  ED25519_PRIVATE_KEY  The Ed25519 private key in base64 format (PKCS#8 DER)');
  console.error('  CLAIM_API_URL        Optional: The claim API URL (default: https://selfclaw-claim.conquest.game)');
  process.exit(1);
}

const walletAddress = args[0];

// Validate wallet address format
if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
  console.error(\`Error: Invalid wallet address format: \${walletAddress}\`);
  console.error('Expected format: 0x followed by 40 hex characters');
  process.exit(1);
}

// Get private key from environment
const privateKeyBase64 = process.env.ED25519_PRIVATE_KEY;

if (!privateKeyBase64) {
  console.error('Error: ED25519_PRIVATE_KEY environment variable is not set');
  process.exit(1);
}

// Get API URL from environment or use default
const apiUrl = process.env.CLAIM_API_URL || 'https://selfclaw-claim.conquest.game';

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Build the claim message
 */
function buildClaimMessage(timestamp: number, walletAddress: string): string {
  return \`claim:\${timestamp}:\${walletAddress.toLowerCase()}\`;
}

async function main() {
  try {
    // Import the private key
    const privateKeyBuffer = Buffer.from(privateKeyBase64, 'base64');

    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: 'der',
      type: 'pkcs8',
    });

    // Extract the public key
    const publicKey = crypto.createPublicKey(privateKey);

    // Export the public key in SPKI DER format for the request
    const publicKeyDer = publicKey.export({format: 'der', type: 'spki'});
    const publicKeyBase64 = arrayBufferToBase64(publicKeyDer);

    // Build the message to sign
    const timestamp = Date.now();
    const message = buildClaimMessage(timestamp, walletAddress);

    console.log('Claim Details:');
    console.log('  Wallet Address:', walletAddress);
    console.log('  Timestamp:', timestamp);
    console.log('  Message:', message);
    console.log('  API URL:', apiUrl);
    console.log('');

    // Sign the message
    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    const signatureHex = arrayBufferToHex(signature);

    // Prepare the request body
    const requestBody = {
      publicKey: publicKeyBase64,
      signature: signatureHex,
      timestamp,
      walletAddress,
    };

    console.log('Request Body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('');

    // Make the claim request
    console.log('Sending claim request...');
    const response = await fetch(\`\${apiUrl}/api/claim\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('');
      console.log('✅ Claim successful!');
      console.log('  Transaction Hash:', result.txHash);
      console.log('  Amount:', result.amount);
      console.log('  Token Address:', result.tokenAddress);
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ Claim failed!');
      console.log('  Error:', result.error);
      console.log('  Message:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

\`\`\`
      `,
    );
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
    const chainId = c.req.query('chainId');
    const tokenAddress = c.req.query('tokenAddress');

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

    const status = await getStatus(db, humanId, chainId, tokenAddress);
    return c.json(status, 200);
  });

  return app;
}
