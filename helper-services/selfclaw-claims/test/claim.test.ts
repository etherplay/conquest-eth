import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RemoteSQL } from "remote-sql";
import {
  processClaim,
  getStatus,
  type ClaimRequest,
  type ClaimServiceConfig,
} from "../src/services/claim/index.js";

// Mock the external dependencies
vi.mock("../src/services/claim/selfclaw.js", () => ({
  checkVerification: vi.fn(),
}));

vi.mock("../src/services/claim/token.js", () => ({
  transferTokens: vi.fn(),
  getDistributorBalance: vi.fn(),
}));

vi.mock("../src/services/claim/verification.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/services/claim/verification.js")
  >("../src/services/claim/verification.js");
  return {
    ...actual,
    verifySignature: vi.fn(),
  };
});

import { checkVerification } from "../src/services/claim/selfclaw.js";
import { transferTokens } from "../src/services/claim/token.js";
import { verifySignature } from "../src/services/claim/verification.js";

describe("Claim Service", () => {
  const mockConfig: ClaimServiceConfig = {
    privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    tokenAddress: "0xTokenAddress1234567890abcdef12345678",
    tokenAmount: "1000000000000000000",
    rpcUrl: "https://rpc.example.com",
    chainId: 42220,
    timestampToleranceMs: 5000,
    selfClawApiUrl: "https://selfclaw.ai",
  };

  let mockDb: RemoteSQL;
  let dbData: Map<string, unknown[]>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-09T12:00:00.000Z"));

    // Reset mock data
    dbData = new Map();
    dbData.set("token_claims", []);

    // Create mock database
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
            (c: unknown) => (c as { wallet_address: string }).wallet_address === wallet,
          );
          return { rows: found ? [{ "1": 1 }] : [] };
        }

        if (sql.includes("SELECT wallet_address, tx_hash, claimed_at")) {
          const humanId = (args as string[])[0].toLowerCase();
          const found = claims.find(
            (c: unknown) => (c as { human_id: string }).human_id === humanId,
          );
          if (found) {
            const claim = found as { wallet_address: string; tx_hash: string; claimed_at: number };
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
          const [humanId, walletAddress, publicKey, txHash, amount, tokenAddress, claimedAt] =
            args as string[];
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

    // Reset mocks
    vi.mocked(verifySignature).mockReset();
    vi.mocked(checkVerification).mockReset();
    vi.mocked(transferTokens).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("processClaim", () => {
    // Create a function to generate valid request with current timestamp
    const createValidRequest = (): ClaimRequest => ({
      publicKey: "MCowBQYDK2VwAyEAWzZL...",
      signature: "a".repeat(128),
      timestamp: Date.now(),
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });

    it("should return error for missing required fields", async () => {
      const request: Partial<ClaimRequest> = {
        publicKey: "test",
      };

      const result = await processClaim(
        mockDb,
        request as ClaimRequest,
        mockConfig,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_request");
        expect(result.message).toBe("Missing required fields");
      }
    });

    it("should return error for invalid wallet address format", async () => {
      const validRequest = createValidRequest();
      const request: ClaimRequest = {
        ...validRequest,
        walletAddress: "invalid-wallet",
      };

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_request");
        expect(result.message).toBe("Invalid wallet address format");
      }
    });

    it("should return error for expired timestamp", async () => {
      const validRequest = createValidRequest();
      const request: ClaimRequest = {
        ...validRequest,
        timestamp: Date.now() - 10000, // 10 seconds ago
      };

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("timestamp_expired");
      }
    });

    it("should return error for invalid signature", async () => {
      const validRequest = createValidRequest();
      vi.mocked(verifySignature).mockResolvedValue(false);

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_signature");
      }
    });

    it("should return error for unverified agent", async () => {
      const validRequest = createValidRequest();
      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({ verified: false });

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("not_verified");
      }
    });

    it("should return error if human already claimed", async () => {
      const validRequest = createValidRequest();
      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId: "0xHumanId123",
      });

      // Add existing claim
      (dbData.get("token_claims") as unknown[]).push({
        human_id: "0xhumanid123",
        wallet_address: "0xotheraddress",
        tx_hash: "0xtxhash",
        claimed_at: Date.now(),
      });

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("human_already_claimed");
      }
    });

    it("should return error if wallet already received", async () => {
      const validRequest = createValidRequest();
      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId: "0xNewHuman",
      });

      // Add existing claim for the wallet
      (dbData.get("token_claims") as unknown[]).push({
        human_id: "0xotherhumanid",
        wallet_address: validRequest.walletAddress.toLowerCase(),
        tx_hash: "0xtxhash",
        claimed_at: Date.now(),
      });

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("wallet_already_received");
      }
    });

    it("should return error if token transfer fails", async () => {
      const validRequest = createValidRequest();
      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId: "0xNewHuman",
      });
      vi.mocked(transferTokens).mockRejectedValue(
        new Error("Insufficient balance"),
      );

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("transfer_failed");
        expect(result.message).toContain("Insufficient balance");
      }
    });

    it("should successfully process a valid claim", async () => {
      const validRequest = createValidRequest();
      const humanId = "0xValidHumanId";
      const txHash = "0xSuccessfulTxHash123";

      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      const result = await processClaim(mockDb, validRequest, mockConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.txHash).toBe(txHash);
        expect(result.walletAddress).toBe(validRequest.walletAddress);
        expect(result.amount).toBe(mockConfig.tokenAmount);
        expect(result.tokenAddress).toBe(mockConfig.tokenAddress);
        expect(result.humanId).toBe(humanId);
      }

      // Verify token transfer was called
      expect(transferTokens).toHaveBeenCalledWith(
        mockConfig.privateKey,
        mockConfig.tokenAddress,
        validRequest.walletAddress,
        mockConfig.tokenAmount,
        mockConfig.rpcUrl,
        mockConfig.chainId,
      );
    });

    it("should record claim in database after successful transfer", async () => {
      const validRequest = createValidRequest();
      const humanId = "0xValidHumanId";
      const txHash = "0xSuccessfulTxHash123";

      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      await processClaim(mockDb, validRequest, mockConfig);

      // Verify the claim was recorded
      const claims = dbData.get("token_claims") as unknown[];
      expect(claims.length).toBe(1);
      expect((claims[0] as { human_id: string }).human_id).toBe(humanId.toLowerCase());
      expect((claims[0] as { wallet_address: string }).wallet_address).toBe(
        validRequest.walletAddress.toLowerCase(),
      );
    });
  });

  describe("getStatus", () => {
    it("should return claimed: false for unknown humanId", async () => {
      const result = await getStatus(mockDb, "0xUnknownHuman");

      expect(result.claimed).toBe(false);
      expect(result.claim).toBeUndefined();
    });

    it("should return claim details for known humanId", async () => {
      const humanId = "0xKnownHuman";
      const claim = {
        human_id: humanId.toLowerCase(),
        wallet_address: "0xwallet",
        tx_hash: "0xtxhash",
        claimed_at: 1707480000000,
      };

      (dbData.get("token_claims") as unknown[]).push(claim);

      const result = await getStatus(mockDb, humanId);

      expect(result.claimed).toBe(true);
      expect(result.claim).toBeDefined();
      expect(result.claim?.walletAddress).toBe(claim.wallet_address);
      expect(result.claim?.txHash).toBe(claim.tx_hash);
      expect(result.claim?.claimedAt).toBe(claim.claimed_at);
    });
  });
});
