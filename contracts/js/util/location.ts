// using 128 bits location
export function locationToXY(position: bigint): {x: number; y: number} {
	const bn = BigInt(position);
	const x = Number(BigInt.asIntN(128, bn));
	const y = Number(BigInt.asIntN(128, bn >> 128n));
	return {x, y};
}
export function xyToLocation(x: number, y: number): bigint {
	const bn =
		(x < 0 ? 2n ** 128n + BigInt(x) : BigInt(x)) +
		((y < 0 ? 2n ** 128n + BigInt(y) : BigInt(y)) << 128n);
	return bn;
}

export function topleftLocationFromArea(area: bigint): {x: number; y: number} {
	const {x: areaX, y: areaY} = locationToXY(area);
	return {
		x: areaX * 24 - 12,
		y: areaY * 24 - 12,
	};
}

export function areaFromLocation(locationX: number, locationY: number): bigint {
	const absX = Math.abs(locationX);
	const signX = locationX < -12 ? -1 : 1;
	const centerAreaX = signX * Math.floor((absX + 12) / 24);
	const absY = Math.abs(locationY);
	const signY = locationY < -12 ? -1 : 1;
	const centerAreaY = signY * Math.floor((absY + 12) / 24);
	return xyToLocation(centerAreaX, centerAreaY);
}

export function areasAroundLocation(
	locationX: number,
	locationY: number,
): bigint[] {
	const absX = Math.abs(locationX);
	const signX = locationX < -12 ? -1 : 1;
	const centerAreaX = signX * Math.floor((absX + 12) / 24);
	const absY = Math.abs(locationY);
	const signY = locationY < -12 ? -1 : 1;
	const centerAreaY = signY * Math.floor((absY + 12) / 24);

	return [
		xyToLocation(centerAreaX, centerAreaY),

		xyToLocation(centerAreaX + 1, centerAreaY),
		xyToLocation(centerAreaX - 1, centerAreaY),
		xyToLocation(centerAreaX + 1, centerAreaY + 1),
		xyToLocation(centerAreaX - 1, centerAreaY + 1),
		xyToLocation(centerAreaX + 1, centerAreaY - 1),
		xyToLocation(centerAreaX - 1, centerAreaY - 1),
		xyToLocation(centerAreaX, centerAreaY + 1),
		xyToLocation(centerAreaX, centerAreaY - 1),

		xyToLocation(centerAreaX - 2, centerAreaY - 2),
		xyToLocation(centerAreaX - 1, centerAreaY - 2),
		xyToLocation(centerAreaX, centerAreaY - 2),
		xyToLocation(centerAreaX + 1, centerAreaY - 2),
		xyToLocation(centerAreaX + 2, centerAreaY - 2),

		xyToLocation(centerAreaX + 2, centerAreaY - 1),
		xyToLocation(centerAreaX + 2, centerAreaY),
		xyToLocation(centerAreaX + 2, centerAreaY + 1),
		xyToLocation(centerAreaX + 2, centerAreaY + 2),

		xyToLocation(centerAreaX + 1, centerAreaY + 2),
		xyToLocation(centerAreaX, centerAreaY + 2),
		xyToLocation(centerAreaX - 1, centerAreaY + 2),
		xyToLocation(centerAreaX - 2, centerAreaY + 2),

		xyToLocation(centerAreaX - 2, centerAreaY + 1),
		xyToLocation(centerAreaX - 2, centerAreaY),
		xyToLocation(centerAreaX - 2, centerAreaY - 1),
	];
}

export function zoneFromLocation(locationX: number, locationY: number): bigint {
	const absX = Math.abs(locationX);
	const signX = locationX < -32 ? -1 : 1;
	const centerZoneX = signX * Math.floor((absX + 32) / 64);
	const absY = Math.abs(locationY);
	const signY = locationY < -32 ? -1 : 1;
	const centerZoneY = signY * Math.floor((absY + 32) / 64);
	return xyToLocation(centerZoneX, centerZoneY);
}

export function zonesFromLocation(
	locationX: number,
	locationY: number,
): bigint[] {
	const absX = Math.abs(locationX);
	const signX = locationX < -32 ? -1 : 1;
	const centerZoneX = signX * Math.floor((absX + 32) / 64);
	const absY = Math.abs(locationY);
	const signY = locationY < -32 ? -1 : 1;
	const centerZoneY = signY * Math.floor((absY + 32) / 64);

	return [
		xyToLocation(centerZoneX, centerZoneY),
		xyToLocation(centerZoneX + 1, centerZoneY),
		xyToLocation(centerZoneX - 1, centerZoneY),
		xyToLocation(centerZoneX + 1, centerZoneY + 1),
		xyToLocation(centerZoneX - 1, centerZoneY + 1),
		xyToLocation(centerZoneX + 1, centerZoneY - 1),
		xyToLocation(centerZoneX - 1, centerZoneY - 1),
		xyToLocation(centerZoneX, centerZoneY + 1),
		xyToLocation(centerZoneX, centerZoneY - 1),
	];
}

export type StrictLocationPointer<T> = {
	index: number;
	x: number;
	y: number;
	dx: number;
	dy: number;
	data: T;
};

export type LocationPointer<T> = {
	index: number;
	x: number;
	y: number;
	dx: number;
	dy: number;
	data: T | undefined;
};

// let path = [];
export function nextInSpiral<T>(
	pointer?: LocationPointer<T> | StrictLocationPointer<T>,
): LocationPointer<T> {
	if (!pointer) {
		// path = [{x: 0, y: 0, dx: 0, dy: -1}];
		return {x: 0, y: 0, dx: 0, dy: -1, index: 0, data: undefined};
	}

	let dx = pointer.dx;
	let dy = pointer.dy;
	const x = pointer.x + dx;
	const y = pointer.y + dy;

	if (
		(x == 0 && y == -1) ||
		x == y ||
		(x < 0 && x == -y) ||
		(x > 0 && -x - 1 == y)
	) {
		const tmp = dy;
		dy = -dx;
		dx = tmp;
	}

	// path.push({x, y, dx, dy});

	return {
		index: pointer.index + 1,
		x,
		y,
		dx,
		dy,
		data: undefined,
	};
}

export function coordFromLocation(location: bigint): string {
	const loc = locationToXY(location);
	return `${loc.x},${loc.y}`;
}

export function coordFromXY(x: number, y: number): string {
	return `${x},${y}`;
}

export function coordFromXYObject(obj: {x: number; y: number}): string {
	return `${obj.x},${obj.y}`;
}
