const n_m7_5_sd3: string =
	'0x01223334444555555666666677777777888888889999999AAAAAABBBBCCCDDEF';

export function value(
	data: string,
	leastSignificantBit: number,
	size: number,
): bigint {
	return (BigInt(data) >> BigInt(leastSignificantBit)) % 2n ** BigInt(size);
}

export function value8Mod(
	data: string,
	leastSignificantBit: number,
	mod: number,
): number {
	return Number((BigInt(data) >> BigInt(leastSignificantBit)) % BigInt(mod));
}

export function value8(data: string, leastSignificantBit: number): number {
	return Number((BigInt(data) >> BigInt(leastSignificantBit)) % 256n);
}

export function normal8(data: string, leastSignificantBit: number): number {
	const index = value8Mod(data, leastSignificantBit, 64);
	// Matches Solidity's uint8(n_m7_5_sd3[index])
	const byteHex = n_m7_5_sd3.substring(2 + index * 2, 4 + index * 2);
	return parseInt(byteHex, 16);
}

export function normal16(
	data: string,
	leastSignificantBit: number,
	selection: string,
): number {
	const index = normal8(data, leastSignificantBit);
	// Matches Solidity's selection[index * 2] and selection[index * 2 + 1]
	const start = 2 + index * 4;
	const hexPart = selection.substring(start, start + 4);
	return parseInt(hexPart, 16);
}
