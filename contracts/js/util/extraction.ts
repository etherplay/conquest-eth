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
	// Matches the old working implementation from common-lib
	const index = value8Mod(data, leastSignificantBit, 64) + 2;
	return Number(BigInt('0x' + n_m7_5_sd3[index]));
}

export function normal16(
	data: string,
	leastSignificantBit: number,
	selection: string,
): number {
	// Matches the old working implementation from common-lib
	const index = normal8(data, leastSignificantBit);
	return Number(
		BigInt(
			'0x' +
				selection[index * 4 + 2] +
				selection[index * 4 + 3] +
				selection[index * 4 + 4] +
				selection[index * 4 + 5],
		),
	);
}
