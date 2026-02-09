/**
 * Integration tests for Token Distribution Service
 *
 * These tests use real Ed25519 cryptographic operations to verify
 * the complete claim flow works end-to-end.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { createPrivateKey, createPublicKey, sign, generateKeyPairSync } from "crypto";
import type { RemoteSQL } from "remote-sql";
import {
  processClaim,
  getStatus,
  buildClaimMessage,
  type ClaimRequest,
  type ClaimServiceConfig,
} from "../src/services/claim/index.js";
import {
  verifySignature,
  validateTimestamp,
  validateWalletAddress,
} from "../src/services/claim/verification.js";

// Mock only external network calls, not crypto
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
 * Generate an Ed25519 keypair for testing
 * Returns keys in the same format as the selfclaw SDK
 */
function generateTestKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const publicKeySpki = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const privateKeyPkcs8 = privateKey
    .export({ type: "pkcs8", format: "der" })
    .toString("base64");

  return {
    publicKey: publicKeySpki,
    privateKey: privateKeyPkcs8,
  };
}

/**
 * Sign a message with Ed25519 private key (matching what the SDK does)
 * @param message - Message to sign
 * @param privateKey - Private key in PKCS8 DER format (base64)
 * @returns Hex-encoded signature
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

describe("Integration Tests", () => {
  describe("Real Ed25519 Signature Verification", () => {
    let keypair: { publicKey: string; privateKey: string };

    beforeAll(() => {
      keypair = generateTestKeyPair();
    });

    it("should verify a valid signature", async () => {
      const message = "claim:1707480000000:0x1234567890abcdef1234567890abcdef12345678";
      const signature = signMessage(message, keypair.privateKey);

      const isValid = await verifySignature(
        keypair.publicKey,
        signature,
        message,
      );

      expect(isValid).toBe(true);
    });

    it("should reject an invalid signature", async () => {
      const message = "claim:1707480000000:0x1234567890abcdef1234567890abcdef12345678";
      const wrongMessage = "claim:1707480000000:0xdifferentaddress12345678901234567890";
      const signature = signMessage(wrongMessage, keypair.privateKey);

      const isValid = await verifySignature(
        keypair.publicKey,
        signature,
        message,
      );

      expect(isValid).toBe(false);
    });

    it("should reject signature from different keypair", async () => {
      const otherKeypair = generateTestKeyPair();
      const message = "claim:1707480000000:0x1234567890abcdef1234567890abcdef12345678";
      const signature = signMessage(message, otherKeypair.privateKey);

      const isValid = await verifySignature(
        keypair.publicKey,
        signature,
        message,
      );

      expect(isValid).toBe(false);
    });

    it("should verify claim message format", async () => {
      const timestamp = 1707480000000;
      const walletAddress = "0x1234567890AbCdEf1234567890AbCdEf12345678";

      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      const isValid = await verifySignature(
        keypair.publicKey,
        signature,
        message,
      );

      expect(isValid).toBe(true);
      expect(message).toBe(
        "claim:1707480000000:0x1234567890abcdef1234567890abcdef12345678",
      );
    });
  });

  describe("Full Claim Flow with Real Signatures", () => {
    let keypair: { publicKey: string; privateKey: string };
    let mockDb: RemoteSQL;
    let dbData: Map<string, unknown[]>;

    const mockConfig: ClaimServiceConfig = {
      privateKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      tokenAddress: "0xTokenAddress1234567890abcdef12345678",
      tokenAmount: "1000000000000000000",
      rpcUrl: "https://rpc.example.com",
      chainId: 42220,
      timestampToleranceMs: 5000,
      selfClawApiUrl: "https://selfclaw.ai",
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-02-09T12:00:00.000Z"));

      keypair = generateTestKeyPair();

      // Reset mock data
      dbData = new Map();
      dbData.set("token_claims", []);

      // Create mock database using the RemoteSQL interface (prepare/bind/all pattern)
      mockDb = {
        prepare: vi.fn().mockImplementation((sql: string) => {
          let boundArgs: unknown[] = [];
          return {
            bind: vi.fn().mockImplementation((...args: unknown[]) => {
              boundArgs = args;
              return {
                all: vi.fn().mockImplementation(async () => {
                  const claims = dbData.get("token_claims") as unknown[];

                  if (sql.includes("SELECT 1 FROM token_claims WHERE human_id")) {
                    const humanId = (boundArgs[0] as string).toLowerCase();
                    const found = claims.find(
                      (c: unknown) => (c as { human_id: string }).human_id === humanId,
                    );
                    return { results: found ? [{ "1": 1 }] : [] };
                  }

                  if (sql.includes("SELECT 1 FROM token_claims WHERE wallet_address")) {
                    const wallet = (boundArgs[0] as string).toLowerCase();
                    const found = claims.find(
                      (c: unknown) => (c as { wallet_address: string }).wallet_address === wallet,
                    );
                    return { results: found ? [{ "1": 1 }] : [] };
                  }

                  if (sql.includes("SELECT wallet_address, tx_hash, claimed_at")) {
                    const humanId = (boundArgs[0] as string).toLowerCase();
                    const found = claims.find(
                      (c: unknown) => (c as { human_id: string }).human_id === humanId,
                    );
                    if (found) {
                      const claim = found as { wallet_address: string; tx_hash: string; claimed_at: number };
                      return {
                        results: [
                          {
                            wallet_address: claim.wallet_address,
                            tx_hash: claim.tx_hash,
                            claimed_at: claim.claimed_at,
                          },
                        ],
                      };
                    }
                    return { results: [] };
                  }

                  if (sql.includes("INSERT INTO token_claims")) {
                    const [humanId, walletAddress, publicKey, txHash, amount, tokenAddress, claimedAt] =
                      boundArgs as string[];
                    claims.push({
                      human_id: humanId,
                      wallet_address: walletAddress,
                      public_key: publicKey,
                      tx_hash: txHash,
                      amount,
                      token_address: tokenAddress,
                      claimed_at: claimedAt,
                    });
                    return { results: [] };
                  }

                  return { results: [] };
                }),
              };
            }),
          };
        }),
        batch: vi.fn(),
      } as unknown as RemoteSQL;

      // Reset mocks
      vi.mocked(checkVerification).mockReset();
      vi.mocked(transferTokens).mockReset();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should successfully process a claim with real cryptographic signature", async () => {
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
      const humanId = "0xHumanId12345";
      const txHash = "0xSuccessfulTransactionHash";

      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      const request: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature,
        timestamp,
        walletAddress,
      };

      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens).mockResolvedValue(txHash);

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.txHash).toBe(txHash);
        expect(result.walletAddress).toBe(walletAddress);
        expect(result.humanId).toBe(humanId);
      }
    });

    it("should reject a claim with tampered wallet address", async () => {
      const timestamp = Date.now();
      const originalWallet = "0x1234567890abcdef1234567890abcdef12345678";
      const tamperedWallet = "0xabcdef1234567890abcdef1234567890abcdef12";

      // Sign with original wallet
      const message = buildClaimMessage(timestamp, originalWallet);
      const signature = signMessage(message, keypair.privateKey);

      // But request with tampered wallet
      const request: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature,
        timestamp,
        walletAddress: tamperedWallet,
      };

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_signature");
      }
    });

    it("should reject a claim with tampered timestamp", async () => {
      const originalTimestamp = Date.now();
      const tamperedTimestamp = originalTimestamp - 1000;
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

      // Sign with original timestamp
      const message = buildClaimMessage(originalTimestamp, walletAddress);
      const signature = signMessage(message, keypair.privateKey);

      // But request with tampered timestamp
      const request: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature,
        timestamp: tamperedTimestamp,
        walletAddress,
      };

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_signature");
      }
    });

    it("should reject a claim from a different agent", async () => {
      const otherKeypair = generateTestKeyPair();
      const timestamp = Date.now();
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

      // Sign with other keypair's private key
      const message = buildClaimMessage(timestamp, walletAddress);
      const signature = signMessage(message, otherKeypair.privateKey);

      // But use original keypair's public key
      const request: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature,
        timestamp,
        walletAddress,
      };

      const result = await processClaim(mockDb, request, mockConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("invalid_signature");
      }
    });

    it("should prevent double-claiming by same human with different wallets", async () => {
      const humanId = "0xHumanId12345";
      const txHash1 = "0xFirstTransactionHash";
      const txHash2 = "0xSecondTransactionHash";

      vi.mocked(checkVerification).mockResolvedValue({
        verified: true,
        humanId,
      });
      vi.mocked(transferTokens)
        .mockResolvedValueOnce(txHash1)
        .mockResolvedValueOnce(txHash2);

      // First claim
      const timestamp1 = Date.now();
      const wallet1 = "0x1111111111111111111111111111111111111111";
      const message1 = buildClaimMessage(timestamp1, wallet1);
      const signature1 = signMessage(message1, keypair.privateKey);

      const request1: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature: signature1,
        timestamp: timestamp1,
        walletAddress: wallet1,
      };

      const result1 = await processClaim(mockDb, request1, mockConfig);
      expect(result1.success).toBe(true);

      // Second claim attempt with different wallet
      const timestamp2 = Date.now();
      const wallet2 = "0x2222222222222222222222222222222222222222";
      const message2 = buildClaimMessage(timestamp2, wallet2);
      const signature2 = signMessage(message2, keypair.privateKey);

      const request2: ClaimRequest = {
        publicKey: keypair.publicKey,
        signature: signature2,
        timestamp: timestamp2,
        walletAddress: wallet2,
      };

      const result2 = await processClaim(mockDb, request2, mockConfig);

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe("human_already_claimed");
      }
    });

    it("should prevent claiming to a wallet that already received", async () => {
      const sharedWallet = "0x1111111111111111111111111111111111111111";
      const txHash = "0xFirstTransactionHash";

      // First agent claims successfully
      const keypair1 = generateTestKeyPair();
      const humanId1 = "0xHuman1";

      vi.mocked(checkVerification).mockResolvedValueOnce({
        verified: true,
        humanId: humanId1,
      });
      vi.mocked(transferTokens).mockResolvedValueOnce(txHash);

      const timestamp1 = Date.now();
      const message1 = buildClaimMessage(timestamp1, sharedWallet);
      const signature1 = signMessage(message1, keypair1.privateKey);

      const request1: ClaimRequest = {
        publicKey: keypair1.publicKey,
        signature: signature1,
        timestamp: timestamp1,
        walletAddress: sharedWallet,
      };

      const result1 = await processClaim(mockDb, request1, mockConfig);
      expect(result1.success).toBe(true);

      // Second agent tries to claim to the same wallet
      const keypair2 = generateTestKeyPair();
      const humanId2 = "0xHuman2";

      vi.mocked(checkVerification).mockResolvedValueOnce({
        verified: true,
        humanId: humanId2,
      });

      const timestamp2 = Date.now();
      const message2 = buildClaimMessage(timestamp2, sharedWallet);
      const signature2 = signMessage(message2, keypair2.privateKey);

      const request2: ClaimRequest = {
        publicKey: keypair2.publicKey,
        signature: signature2,
        timestamp: timestamp2,
        walletAddress: sharedWallet,
      };

      const result2 = await processClaim(mockDb, request2, mockConfig);

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe("wallet_already_received");
      }
    });

    it("should allow different agents to claim to different wallets", async () => {
      const txHash1 = "0xFirstTransactionHash";
      const txHash2 = "0xSecondTransactionHash";

      // First agent claims
      const keypair1 = generateTestKeyPair();
      const humanId1 = "0xHuman1";
      const wallet1 = "0x1111111111111111111111111111111111111111";

      vi.mocked(checkVerification).mockResolvedValueOnce({
        verified: true,
        humanId: humanId1,
      });
      vi.mocked(transferTokens).mockResolvedValueOnce(txHash1);

      const timestamp1 = Date.now();
      const message1 = buildClaimMessage(timestamp1, wallet1);
      const signature1 = signMessage(message1, keypair1.privateKey);

      const request1: ClaimRequest = {
        publicKey: keypair1.publicKey,
        signature: signature1,
        timestamp: timestamp1,
        walletAddress: wallet1,
      };

      const result1 = await processClaim(mockDb, request1, mockConfig);
      expect(result1.success).toBe(true);

      // Second agent claims to different wallet
      const keypair2 = generateTestKeyPair();
      const humanId2 = "0xHuman2";
      const wallet2 = "0x2222222222222222222222222222222222222222";

      vi.mocked(checkVerification).mockResolvedValueOnce({
        verified: true,
        humanId: humanId2,
      });
      vi.mocked(transferTokens).mockResolvedValueOnce(txHash2);

      const timestamp2 = Date.now();
      const message2 = buildClaimMessage(timestamp2, wallet2);
      const signature2 = signMessage(message2, keypair2.privateKey);

      const request2: ClaimRequest = {
        publicKey: keypair2.publicKey,
        signature: signature2,
        timestamp: timestamp2,
        walletAddress: wallet2,
      };

      const result2 = await processClaim(mockDb, request2, mockConfig);

      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.txHash).toBe(txHash2);
        expect(result2.humanId).toBe(humanId2);
      }
    });
  });

  describe("Timestamp Validation Edge Cases", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-02-09T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should accept timestamp exactly at tolerance boundary", () => {
      const now = Date.now();
      const atBoundary = now - 5000;

      expect(validateTimestamp(atBoundary, 5000)).toBe(true);
    });

    it("should reject timestamp just over tolerance", () => {
      const now = Date.now();
      const overBoundary = now - 5001;

      expect(validateTimestamp(overBoundary, 5000)).toBe(false);
    });

    it("should accept future timestamp within tolerance", () => {
      const now = Date.now();
      const futureWithin = now + 3000;

      expect(validateTimestamp(futureWithin, 5000)).toBe(true);
    });

    it("should reject future timestamp beyond tolerance", () => {
      const now = Date.now();
      const futureBeyond = now + 6000;

      expect(validateTimestamp(futureBeyond, 5000)).toBe(false);
    });
  });

  describe("Wallet Address Validation Edge Cases", () => {
    it("should handle checksum addresses", () => {
      // Mixed case checksum address
      expect(
        validateWalletAddress("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"),
      ).toBe(true);
    });

    it("should handle all lowercase addresses", () => {
      expect(
        validateWalletAddress("0xab5801a7d398351b8be11c439e05c5b3259aec9b"),
      ).toBe(true);
    });

    it("should handle all uppercase addresses", () => {
      expect(
        validateWalletAddress("0xAB5801A7D398351B8BE11C439E05C5B3259AEC9B"),
      ).toBe(true);
    });

    it("should reject address with 0X prefix", () => {
      expect(
        validateWalletAddress("0X1234567890abcdef1234567890abcdef12345678"),
      ).toBe(false);
    });

    it("should reject address with spaces", () => {
      expect(
        validateWalletAddress("0x 1234567890abcdef1234567890abcdef1234567"),
      ).toBe(false);
    });
  });
});
