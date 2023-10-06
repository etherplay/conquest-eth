export function toISOURL(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().replace(/\.000/g, '').replace(/:/g, '').replace(/-/g, '');
}

export function toOutlookISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().replace(/\.000/g, '').replace(/:/g, '%3A').replace('Z', '%2B00%3A00');
}
