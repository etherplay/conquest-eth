import {chainName} from '$lib/config';
import * as base64Module from 'byte-base64';
import * as lz from 'lz-string';
import prettyMs from 'pretty-ms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const {compressToUint8Array, decompressFromUint8Array} = lz as any as lz.LZStringStatic;

export function wait<T>(numSeconds: number, v: T): Promise<T> {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), numSeconds * 1000);
  });
}

export const base64 = base64Module;

export function timeToText(timeInSec: number, options?: prettyMs.Options): string {
  return prettyMs(Math.floor(timeInSec) * 1000, options);
}

export function bitMaskMatch(value: number | undefined, bit: number): boolean {
  return value === undefined ? false : (value & Math.pow(2, bit)) == Math.pow(2, bit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(e: any): string {
  const errorMessage =
    e.data?.message || (e.data?.data ? JSON.stringify(e.data?.data) : e.message ? e.message : JSON.stringify(e)); //(e.toString ? e.toString() : ;
  if (errorMessage.indexOf(' could not be found') !== -1) {
    return `${chainName}'s node out of sync: "block ${errorMessage}"`;
  } else if (errorMessage.indexOf('No state available for block ') !== -1) {
    return `${chainName}'s node out of sync: "${errorMessage}"`;
  }
  return errorMessage;
}

export function decodeCoords(coords: string): {x: number; y: number} {
  coords = coords.trim();
  if (coords.startsWith('(')) {
    coords = coords.slice(1);
  }
  if (coords.endsWith(')')) {
    coords = coords.slice(0, coords.length - 1);
  }
  // console.log({coords});
  const split = coords.split(',').map((v) => v.trim());
  if (split.length === 2) {
    const x = parseInt(split[0]);
    const y = parseInt(split[1]);
    if (!isNaN(x) && !isNaN(y)) {
      return {x, y};
    }
  }
  throw new Error(`invalid coords`);
}
