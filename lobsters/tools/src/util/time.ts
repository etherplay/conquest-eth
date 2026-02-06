/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
	return Math.floor(Date.now() / 1000);
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
