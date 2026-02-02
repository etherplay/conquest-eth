// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
type Data = string | {toString: () => string};
export default function Mash(): (data: Data) => number {
  let n = 0xefc8249d;

  const mash = function (data: Data) {
    const dataS: string = data.toString();
    for (let i = 0; i < dataS.length; i++) {
      n += dataS.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
  mash.version = 'Mash 0.9';
  return mash;
}
