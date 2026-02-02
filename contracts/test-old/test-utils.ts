/* eslint-disable @typescript-eslint/no-explicit-any */ // TODO remove
import {ethers} from 'hardhat';

export async function expectRevert(promise: Promise<any>, expectedMessage?: string): Promise<boolean> {
  let receipt;
  try {
    receipt = await promise;
  } catch (e) {
    const error = e as {message?: string};
    const isExpectedMessagePresent = error.message && (!expectedMessage || error.message.search(expectedMessage) >= 0);
    if (!isExpectedMessagePresent) {
      throw new Error(`Revert message : "${expectedMessage}" not present, instead got : "${error.message}"`);
    }
    return true;
  }

  if (receipt.status === 0) {
    if (expectedMessage) {
      throw new Error(`Revert message not parsed : "${expectedMessage}"`);
    }
    return true;
  }
  throw new Error(`Revert expected`);
}

let extraTime = 0;
export async function increaseTime(numSec: number): Promise<void> {
  await ethers.provider.send('evm_increaseTime', [numSec]);
  await ethers.provider.send('evm_mine', []);
  extraTime += numSec;
}

export function getTime(): number {
  return Math.floor(Date.now() / 1000) + extraTime;
}

export function objMap(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  obj: any, // TODO type
  func: (item: any, index: number) => any,
  options?: {
    depth: number;
  }
): any {
  const newObj: any = {};
  Object.keys(obj).map(function (key, index) {
    const keyAsNumber = parseInt(key, 10);
    if (isNaN(keyAsNumber) || keyAsNumber >= obj.length) {
      let item = obj[key];
      if (options && options.depth > 0 && typeof item === 'object') {
        item = objMap(item, func, {depth: options.depth - 1});
      } else {
        item = func(item, index);
      }
      newObj[key] = item;
    }
  });
  return newObj;
}

export const zeroAddress = '0x0000000000000000000000000000000000000000';
export const emptyBytes = '0x';
export function waitFor<T>(p: Promise<{wait(): Promise<T>}>): Promise<T> {
  return p.then((tx) => tx.wait());
}
