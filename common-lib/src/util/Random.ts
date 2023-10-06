import {keccak256} from '@ethersproject/solidity';
import {BigNumber} from '@ethersproject/bignumber';

export class Random {
  private seed: string;
  constructor(seed: string) {
    this.seed = seed;
  }

  r_u8(r: string, i: number, mod: number): number {
    return BigNumber.from(keccak256(['uint256', 'bytes32', 'uint8'], [r, this.seed, i]))
      .mod(mod)
      .toNumber();
  }

  r_normal(r: string, i: number): number {
    const n_m7_5_sd3 = '0x01223334444555555666666677777777888888889999999AAAAAABBBBCCCDDEF';
    const index = this.r_u8(r, i, 64) + 2;
    return BigNumber.from('0x' + n_m7_5_sd3[index]).toNumber();
  }

  r_normalFrom(r: string, i: number, selection: string): number {
    const index = this.r_normal(r, i);
    return BigNumber.from(
      '0x' + selection[index * 4 + 2] + selection[index * 4 + 3] + selection[index * 4 + 4] + selection[index * 4 + 5]
    ).toNumber();
  }
}
