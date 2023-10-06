import Mash from './Mash';

// From http://baagoe.com/en/RandomMusings/javascript/
// + typescript

type Random = {
  (): number;
  uint32(): number;
  fract53(): number;
  args: unknown[];
  version: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Alea(...argList: any[]): Random {
  // Johannes Baagøe <baagoe@baagoe.com>, 2010
  let args = argList;
  if (args.length == 0) {
    args = [+new Date()];
  } else {
    args = Array.prototype.slice.call(args);
  }

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;

  let mash: ((s: string) => number) | null = Mash();
  s0 = mash(' ');
  s1 = mash(' ');
  s2 = mash(' ');

  for (let i = 0; i < args.length; i++) {
    s0 -= mash(args[i]);
    if (s0 < 0) {
      s0 += 1;
    }
    s1 -= mash(args[i]);
    if (s1 < 0) {
      s1 += 1;
    }
    s2 -= mash(args[i]);
    if (s2 < 0) {
      s2 += 1;
    }
  }
  mash = null;

  const random = function () {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return (s2 = t - (c = t | 0));
  };
  random.uint32 = function () {
    return random() * 0x100000000; // 2^32
  };
  random.fract53 = function () {
    return random() + ((random() * 0x200000) | 0) * 1.1102230246251565e-16; // 2^-53
  };
  random.version = 'Alea 0.9';
  random.args = args;
  return random;
}
