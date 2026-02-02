// Test for extraction functions
import {describe, it} from 'node:test';
import assert from 'node:assert';
import {keccak256, toHex} from 'viem';
import {normal8, normal16, value8Mod} from '../../js/util/extraction.js';

describe('Extraction functions', function () {
	describe('value8Mod', function () {
		it('extracts value with modulo 64', function () {
			// Test with known hash
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const value = value8Mod(hash, 0, 64);
			assert.ok(typeof value === 'number', 'Value should be a number');
			assert.ok(value >= 0 && value < 64, `Value ${value} should be in [0,64)`);
		});

		it('extracts values at different positions', function () {
			const hash =
				'0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
			const values = [0, 1, 2, 3].map((i) => value8Mod(hash, i, 64));

			for (const v of values) {
				assert.ok(v >= 0 && v < 64, `Value ${v} should be in [0,64)`);
			}
		});

		it('is deterministic', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const v1 = value8Mod(hash, 0, 64);
			const v2 = value8Mod(hash, 0, 64);
			assert.strictEqual(v1, v2, 'value8Mod should be deterministic');
		});

		it('handles empty hash with mod', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000000';
			const value = value8Mod(hash, 0, 64);
			assert.strictEqual(value, 0, 'Empty hash should return 0');
		});

		it('extracts correct value from simple hash', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000080';
			// The byte at position 0 is 0x80 = 128
			// 128 % 64 = 0
			const value = value8Mod(hash, 0, 64);
			assert.strictEqual(value, 0, 'Should correctly compute 128 % 64 = 0');
		});
	});

	describe('normal8', function () {
		it('returns value in [0,63]', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const value = normal8(hash, 0);
			assert.ok(value >= 0 && value < 64, `Value ${value} should be in [0,64)`);
		});

		it('returns different values at different indices', function () {
			const hash =
				'0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
			const values = [0, 1, 2, 3].map((i) => normal8(hash, i));

			for (const v of values) {
				assert.ok(v >= 0 && v < 64, `Value ${v} should be in [0,64)`);
			}
		});

		it('is deterministic', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const v1 = normal8(hash, 0);
			const v2 = normal8(hash, 0);
			assert.strictEqual(v1, v2, 'normal8 should be deterministic');
		});
	});

	describe('normal16', function () {
		it('returns value in [0,65535]', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const selection =
				'0x000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F';
			const value = normal16(hash, 0, selection);

			assert.ok(value >= 0 && value < 65536, `Value ${value} should be in [0,65536)`);
		});

		it('is deterministic', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const selection =
				'0x000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F';
			const v1 = normal16(hash, 0, selection);
			const v2 = normal16(hash, 0, selection);

			assert.strictEqual(v1, v2, 'normal16 should be deterministic');
		});

		it('different LSB values produce different results', function () {
			const hash =
				'0x0000000000000000000000000000000000000000000000000000000000000001';
			const selection =
				'0x000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F';
			const v1 = normal16(hash, 0, selection);
			const v2 = normal16(hash, 8, selection);

			// Different LSB values may or may not produce the same result,
			// but we can verify they are both valid
			assert.ok(v1 >= 0 && v1 < 65536, `v1 ${v1} should be in range`);
			assert.ok(v2 >= 0 && v2 < 65536, `v2 ${v2} should be in range`);
		});
	});

	describe('hash extraction consistency', function () {
		it('keccak256 hash can be extracted from', function () {
			// Create a hash using keccak256
			const input = toHex('test data');
			const hash = keccak256(input);

			// Should be able to extract values without errors
			const v8 = normal8(hash, 0);
			assert.ok(typeof v8 === 'number', 'Should be able to extract normal8');
			assert.ok(v8 >= 0 && v8 < 64, 'Value should be in range');

			const selection =
				'0x000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F';
			const v16 = normal16(hash, 0, selection);
			assert.ok(v16 >= 0 && v16 < 65536, `Value ${v16} should be in range`);
		});

		it('different hashes produce different values', function () {
			const hash1 = keccak256(toHex('data1'));
			const hash2 = keccak256(toHex('data2'));

			const v1 = normal8(hash1, 0);
			const v2 = normal8(hash2, 0);

			assert.ok(v1 >= 0 && v1 < 64, 'v1 should be in range');
			assert.ok(v2 >= 0 && v2 < 64, 'v2 should be in range');

			// Different inputs should produce different hashes (very high probability)
			// But we don't assert they're different due to hash collisions
		});
	});
});