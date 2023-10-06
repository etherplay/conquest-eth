import {BigNumber} from '@ethersproject/bignumber';

const n_m7_5_sd3 = '0x01223334444555555666666677777777888888889999999AAAAAABBBBCCCDDEF';

const bn2 = BigNumber.from(2);

export function value(data: string, leastSignificantBit: number, size: number): BigNumber {
  return BigNumber.from(data).shr(leastSignificantBit).mod(bn2.pow(size));
}

export function value8Mod(data: string, leastSignificantBit: number, mod: number): number {
  return BigNumber.from(data).shr(leastSignificantBit).mod(mod).toNumber();
}

export function value8(data: string, leastSignificantBit: number): number {
  return BigNumber.from(data).shr(leastSignificantBit).mod(bn2.pow(8)).toNumber();
}

export function normal8(data: string, leastSignificantBit: number): number {
  const index = value8Mod(data, leastSignificantBit, 64) + 2;
  return BigNumber.from('0x' + n_m7_5_sd3[index]).toNumber();
}

export function normal16(data: string, leastSignificantBit: number, selection: string): number {
  const index = normal8(data, leastSignificantBit);
  return BigNumber.from(
    '0x' + selection[index * 4 + 2] + selection[index * 4 + 3] + selection[index * 4 + 4] + selection[index * 4 + 5]
  ).toNumber();
}
