/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Calculate estimated arrival time based on distance and timePerDistance
 *
 * @param distance - The distance between planets
 * @param timePerDistance - Time multiplier from contract config (seconds per distance unit)
 * @param genesis - Genesis timestamp from contract config
 * @returns Estimated arrival time in seconds
 */
export function calculateEstimatedArrivalTime(params: {
	startTime: bigint;
	distance: bigint;
	timePerDistance: bigint;
}): number {
	const {startTime, distance, timePerDistance} = params;
	const travelTime = Number(distance) * Number(timePerDistance);
	return Number(startTime) + travelTime;
}

/**
 * Calculate when the resolve window closes
 * A fleet can be resolved from arrival time until the resolve window closes
 *
 * @param estimatedArrivalTime - When the fleet is estimated to arrive
 * @param resolveWindow - The resolve window duration in seconds from contract config
 * @returns The timestamp when the fleet can no longer be resolved
 */
export function calculateResolveWindowEnd(
	estimatedArrivalTime: number,
	resolveWindow: bigint,
): number {
	return estimatedArrivalTime + Number(resolveWindow);
}

/**
 * Check if a fleet can be resolved now
 * A fleet can be resolved after arrival but before the resolve window closes
 *
 * @param estimatedArrivalTime - When the fleet was estimated to arrive
 * @param resolveWindow - The resolve window duration in seconds
 * @returns True if the fleet can be resolved now
 */
export function canResolveNow(estimatedArrivalTime: number, resolveWindow: bigint): boolean {
	const currentTime = getCurrentTimestamp();
	const resolveWindowEnd = calculateResolveWindowEnd(estimatedArrivalTime, resolveWindow);
	return currentTime >= estimatedArrivalTime && currentTime < resolveWindowEnd;
}

/**
 * Format timestamp as ISO string
 */
export function formatTimestamp(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString();
}

/**
 * Parse ISO string to timestamp
 */
export function parseTimestamp(isoString: string): number {
	return Math.floor(new Date(isoString).getTime() / 1000);
}
