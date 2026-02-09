/**
 * API Integration Tests
 *
 * Tests the HTTP endpoints using Hono's test client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, createPrivateKey, sign } from "crypto";
import type { RemoteSQL } from "remote-sql";
import { createServer } from "../src/index.js";
import type { CloudflareWorkerEnv } from "../src/env.js";
import type { ServerOptions } from "../src/types.js";
import { buildClaimMessage } from "../src/services/claim/index.js";

// Mock external dependencies
vi.mock("../src/services/claim/selfclaw.js", () => ({
  checkVerification: vi.fn(),
}));

vi.mock("../src/services/claim/token.js", () => ({
  transferTokens: vi.fn(),
  getDistributorBalance: vi.fn(),
}));

import { checkVerification } from "../src/services/claim/selfclaw.js";
import { transferTokens } from "../src/services/claim/token.js";

/**
 * Generate test keypair
 */
function generateTestKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  return {
    publicKey: publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
    privateKey: privateKey
      .export({ type: "pkcs8", format: "der" })
      .toString("base64"),
  };
}

/**
 * Sign a message
 */
function signMessage(message: string, privateKey: string): string {
  const privateKeyDer = Buffer.from(privateKey, "base64");
  const privateKeyObj = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });

  const signature = sign(null, Buffer.from(message), privateKeyObj);
  return signature.toString("hex");
}

describe("API Endpoints", () => {
  let app: ReturnType<typeof createServer>;
  let mockDb: RemoteSQL;
  let dbData: Map<string, unknown[]>;
  let mockEnv: CloudflareWorkerEnv;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-09T12:00:00.000Z"));

    // Reset database mock
    dbData = new Map();
    dbData.set("token_claims", []);

    mockDb = {
      execute: vi.fn().mockImplementation(async ({ sql, args }) => {
        const claims = dbData.get("token_claims") as unknown[];

        if (sql.includes("SELECT 1 FROM token_claims WHERE human_id")) {
          const humanId = (args as string[])[0].toLowerCase();
          const found = claims.find(
            (c: unknown) => (c as { human_id: string }).human_id === humanId,
          );
          return { rows: found ? [{ "1": 1 }] : [] };
        }

        if (sql.includes("SELECT 1 FROM token_claims WHERE wallet_address")) {
          const wallet = (args as string[])[0].toLowerCase();
          const found = claims.find(
            (c: unknown) =>
              (c as { wallet_address: string }).wallet_address === wallet,
          );
          return { rows: found ? [{ "1": 1 }] : [] };
        }

        if (sql.includes("SELECT wallet_address, tx_hash, claimed_at")) {
          const humanId = (args as string[])[0].toLowerCase();
          const found = claims.find(
            (c: unknown) => (c as { human_id: string }).human_id === humanId,
          );
          if (found) {
            const claim = found as {
              wallet_address: string;
              tx_hash: string;
              claimed_at: number;
            };
            return {
              rows: [
                {
                  wallet_address: claim.wallet_address,
                  tx_hash: claim.tx_hash,
                  claimed_at: claim.claimed_at,
                },
              ],
            };
          }
          return { rows: [] };
        }

        if (sql.includes("INSERT INTO token_claims")) {
          const [
            humanId,
            walletAddress,
            publicKey,
            txHash,
            amount,
            tokenAddress,
            claimedAt,
          ] = args as string[];
          claims.push({
            human_id: humanId,
            wallet_address: walletAddress,
            public_key: publicKey,
            tx_hash: txHash,
            amount,
            token_address: tokenAddress,
            claimed_at: claimedAt,
          });
          return { rows: [] };
        }

        return { rows: [] };
      }),
    } as unknown as RemoteSQL;

    mockEnv = {
      DB: {} as D1Database,
      PRIVATE_KEY:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      TOKEN_ADDRESS: "0xTokenAddress1234567890abcdef12345678",
      TOKEN_AMOUNT: "1000000000000000000",
      RPC_URL: "https://rpc.example.com",
      CHAIN_ID: "42220",
      TIMESTAMP_TOLERANCE_MS: "5000",
      SELFCLAW_API_URL: "https://selfclaw.ai",
    };

    const options: ServerOptions<CloudflareWorkerEnv> = {
      services: {
        getDB: () => mockDb,
      },
      getEnv: () => mockEnv,
    };

    app = createServer(options);

    // Reset mocks
    vi.mocked(checkVerification).mockReset();
    vi.mocked(transferTokens).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("GET /", () => {
    it("should return health check message", async () => {
      const res = await app.request("/");

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Token Distribution Service - OK");
    });
  });

  describe("POST /api/claim", () => {
    it("should return 400 for invalid JSON", async () => {
      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("invalid_request");
    });

    it("should return 400 for missing fields", async () => {
      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: "test" }),
      });

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("invalid_request");
    });

    it("should return 400 for invalid wallet address", async () => {
      const keypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "invalid-wallet";
      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature,
          timestamp,
          walletAddress,
        }),
      });

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("invalid_request");
    });

    it("should return 401 for expired timestamp", async () => {
      const keypair = generateTestKeyPair();
      const timestamp = Date.now() - 10000; // 10 seconds ago
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature,
          timestamp,
          walletAddress,
        }),
      });

      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("timestamp_expired");
    });

    it("should return 401 for invalid signature", async () => {
      const keypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const wrongSignature = "a".repeat(128);

      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature: wrongSignature,
          timestamp,
          walletAddress,
        }),
      });

      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("invalid_signature");
    });

    it("should return 403 for unverified agent", async () => {
      const keypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      vi.mocked(checkVerification).mockResolvedValue({ verified: false });

      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature,
          timestamp,
          walletAddress,
        }),
      });

      expect(res.status).toBe(403);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("not_verified");
    });

    it("should return 409 for duplicate human claim", async () => {
      const keypair = generateTestKeyPair();
      const humanId = "0xHumanId12345";
      const txHash = "0xSuccessfulTransactionHash";

      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      // First claim
      const timestamp1 = Date.now();
      const wallet1 = "0x1111111111111111111111111111111111111111";
      const message1 = buildClaimMessage(timestamp1, wallet1);
      const signature1 = signMessage(message1, keypair.privateKey);

      const res1 = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature: signature1,
          timestamp: timestamp1,
          walletAddress: wallet1,
        }),
      });

      expect(res1.status).toBe(200);

      // Second claim attempt
      const timestamp2 = Date.now();
      const wallet2 = "0x2222222222222222222222222222222222222222";
      const message2 = buildClaimMessage(timestamp2, wallet2);
      const signature2 = signMessage(message2, keypair.privateKey);

      const res2 = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature: signature2,
          timestamp: timestamp2,
          walletAddress: wallet2,
        }),
      });

      expect(res2.status).toBe(409);
      const json: any = await res2.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("human_already_claimed");
    });

    it("should return 200 for successful claim", async () => {
      const keypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const humanId = "0xHumanId12345";
      const txHash = "0xSuccessfulTransactionHash";

      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      const res = await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature,
          timestamp,
          walletAddress,
        }),
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.txHash).toBe(txHash);
      expect(json.walletAddress).toBe(walletAddress);
      expect(json.humanId).toBe(humanId);
      expect(json.amount).toBe(mockEnv.TOKEN_AMOUNT);
      expect(json.tokenAddress).toBe(mockEnv.TOKEN_ADDRESS);
    });
  });

  describe("GET /api/status", () => {
    it("should return 400 for missing humanId", async () => {
      const res = await app.request("/api/status");

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("invalid_request");
    });

    it("should return claimed: false for unknown humanId", async () => {
      const res = await app.request("/api/status?humanId=0xUnknown");

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.claimed).toBe(false);
      expect(json.humanId).toBe("0xUnknown");
    });

    it("should return claim details for known humanId", async () => {
      // First make a claim
      const keypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const humanId = "0xHumanId12345";
      const txHash = "0xSuccessfulTransactionHash";

      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      await app.request("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keypair.publicKey,
          signature,
          timestamp,
          walletAddress,
        }),
      });

      // Now check status
      const res = await app.request(`/api/status?humanId=${humanId}`);

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.claimed).toBe(true);
      expect(json.humanId).toBe(humanId);
      expect(json.claim.walletAddress).toBe(walletAddress.toLowerCase());
      expect(json.claim.txHash).toBe(txHash);
    });
  });
});
