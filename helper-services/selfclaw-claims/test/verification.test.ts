import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildClaimMessage,
  validateTimestamp,
  validateWalletAddress,
  verifySignature,
} from "../src/services/claim/verification.js";

describe("Verification Service", () => {
  describe("buildClaimMessage", () => {
    it("should build a properly formatted claim message", () => {
      const timestamp = 1707483000000;
      const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";

      const message = buildClaimMessage(timestamp, walletAddress);

      expect(message).toBe(
        "claim:1707483000000:0x1234567890abcdef1234567890abcdef12345678",
      );
    });

    it("should lowercase the wallet address", () => {
      const timestamp = 1707483000000;
      const walletAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";

      const message = buildClaimMessage(timestamp, walletAddress);

      expect(message).toBe(
        "claim:1707483000000:0xabcdef1234567890abcdef1234567890abcdef12",
      );
    });
  });

  describe("validateTimestamp", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-02-09T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should accept a timestamp within tolerance", () => {
      const now = Date.now();
      const timestamp = now - 2000; // 2 seconds ago

      expect(validateTimestamp(timestamp, 5000)).toBe(true);
    });

    it("should accept current timestamp", () => {
      const now = Date.now();

      expect(validateTimestamp(now, 5000)).toBe(true);
    });

    it("should accept a timestamp at the edge of tolerance", () => {
      const now = Date.now();
      const timestamp = now - 5000; // exactly 5 seconds ago

      expect(validateTimestamp(timestamp, 5000)).toBe(true);
    });

    it("should reject a timestamp older than tolerance", () => {
      const now = Date.now();
      const timestamp = now - 6000; // 6 seconds ago

      expect(validateTimestamp(timestamp, 5000)).toBe(false);
    });

    it("should reject a future timestamp beyond tolerance", () => {
      const now = Date.now();
      const timestamp = now + 6000; // 6 seconds in the future

      expect(validateTimestamp(timestamp, 5000)).toBe(false);
    });

    it("should use default tolerance of 5000ms", () => {
      const now = Date.now();
      const timestamp = now - 4000;

      expect(validateTimestamp(timestamp)).toBe(true);
    });
  });

  describe("validateWalletAddress", () => {
    it("should accept valid Ethereum address", () => {
      expect(
        validateWalletAddress("0x1234567890abcdef1234567890abcdef12345678"),
      ).toBe(true);
    });

    it("should accept valid address with uppercase", () => {
      expect(
        validateWalletAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12"),
      ).toBe(true);
    });

    it("should accept valid address with mixed case", () => {
      expect(
        validateWalletAddress("0xAbCdEf1234567890aBcDeF1234567890abcDEF12"),
      ).toBe(true);
    });

    it("should reject address without 0x prefix", () => {
      expect(
        validateWalletAddress("1234567890abcdef1234567890abcdef12345678"),
      ).toBe(false);
    });

    it("should reject address that is too short", () => {
      expect(validateWalletAddress("0x1234567890abcdef")).toBe(false);
    });

    it("should reject address that is too long", () => {
      expect(
        validateWalletAddress(
          "0x1234567890abcdef1234567890abcdef1234567890",
        ),
      ).toBe(false);
    });

    it("should reject address with invalid characters", () => {
      expect(
        validateWalletAddress("0x1234567890ghijkl1234567890ghijkl12345678"),
      ).toBe(false);
    });

    it("should reject empty string", () => {
      expect(validateWalletAddress("")).toBe(false);
    });
  });

  describe("verifySignature", () => {
    // Note: These tests use Web Crypto API which is available in Node 18+
    // In a real scenario, we would use actual key pairs for testing

    it("should return false for invalid public key", async () => {
      const invalidPublicKey = "invalid-base64";
      const signature = "0".repeat(128);
      const message = "test message";

      const result = await verifySignature(invalidPublicKey, signature, message);

      expect(result).toBe(false);
    });

    it("should return false for invalid signature format", async () => {
      // Valid base64 but not a valid SPKI public key
      const publicKey = "dGVzdA==";
      const invalidSignature = "not-hex";
      const message = "test message";

      const result = await verifySignature(publicKey, invalidSignature, message);

      expect(result).toBe(false);
    });

    // Integration test with real Ed25519 key would go here
    // For unit tests, we verify the error handling
  });
});
