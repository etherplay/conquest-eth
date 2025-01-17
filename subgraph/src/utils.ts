/* eslint-disable */
import {Bytes, ByteArray, BigInt, Address} from '@graphprotocol/graph-ts';

import {ethereum} from '@graphprotocol/graph-ts/chain/ethereum';

export let ZERO_ADDRESS: Bytes = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;

export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);

export function flipHex(str: string): string {
  let newStr = '0x';
  for (let i = 2; i < str.length; i++) {
    let char = str.charAt(i);
    if (char == '0') {
      char = 'f';
    } else if (char == '1') {
      char = 'e';
    } else if (char == '2') {
      char = 'd';
    } else if (char == '3') {
      char = 'c';
    } else if (char == '4') {
      char = 'b';
    } else if (char == '5') {
      char = 'a';
    } else if (char == '6') {
      char = '9';
    } else if (char == '7') {
      char = '8';
    } else if (char == '8') {
      char = '7';
    } else if (char == '9') {
      char = '6';
    } else if (char == 'a' || char == 'A') {
      char = '5';
    } else if (char == 'b' || char == 'B') {
      char = '4';
    } else if (char == 'c' || char == 'C') {
      char = '3';
    } else if (char == 'd' || char == 'D') {
      char = '2';
    } else if (char == 'e' || char == 'E') {
      char = '1';
    } else if (char == 'f' || char == 'F') {
      char = '0';
    }
    newStr += char;
  }
  return newStr;
}

export function c2(str: string): BigInt {
  return BigInt.fromSignedBytes(ByteArray.fromHexString(str).reverse() as Bytes);

  // if (str.charCodeAt(2) > 55) {
  // > 7 (0111)
  // str = flipHex(str);
  // return BigInt.fromUnsignedBytes(ByteArray.fromHexString(str) as Bytes);
  // .plus(
  //   BigInt.fromI32(1)
  // )
  // .neg();
  // } else {
  //   return BigInt.fromUnsignedBytes(ByteArray.fromHexString(str) as Bytes);
  // }
}

export function toPlanetId(location: BigInt): string {
  return (
    '0x' +
    location
      .toHex()
      .slice(2)
      .padStart(64, '0')
  );
}

export function toOwnerId(address: Address): string {
  return address.toHexString();
}

export function toRewardId(id: BigInt): string {
  return id.toString();
}

export function toFleetId(fleet: BigInt): string {
  return fleet.toString();
}

export function toEventId(event: ethereum.Event): string {
  return event.block.number
    .toString()
    .concat('-')
    .concat(event.logIndex.toString());
}
