import Alea from './Alea.js';
// from https://github.com/status-im/unique-name-generator/blob/master/main.go

const constants: string[] = [
	'b',
	'c',
	'd',
	'f',
	'g',
	'h' /*"j",*/,
	'k',
	'l',
	'm',
	'n',
	'p',
	/*"q",*/ 'r',
	's',
	't',
	'v',
	'w',
	/*"x",*/ 'y',
	'z',
];

const constantsm: string[] = [
	'bl',
	'br',
	'bw',
	'ch',
	'cl',
	'cr',
	'cz',
	'dh',
	'dr',
	'dw',
	'fl',
	'fr',
	'gh',
	'gl',
	'gr',
	'gw',
	'kh',
	'kl',
	'kn',
	'kr',
	'kw',
	'ph',
	'pl',
	'pp',
	'pr',
	'rh',
	'st',
	'sl',
	'sm',
	'sn',
	'sp',
	'sc',
	'sh',
	'sk',
	'sw',
	'ss',
	'str',
	'tr',
	'tw',
];

const vowels: string[] = ['a', 'e', 'i', 'o', 'u'];

const vowelsm: string[] = [
	'ae',
	'ai',
	'ao',
	'au',
	'ay',
	'ea',
	'ee',
	'eo',
	'eu',
	'ey',
	'io',
	'iu',
	'oa',
	'oe',
	'oi',
	'ou',
	'oy',
	'ui',
	'uy',
];

const patterns: string[] = ['cvcv', 'vcvc', 'cvcvc', 'vcvcv'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function uniqueWord(...args: any[]): string {
	const rand = Alea(...args);
	let word = '';

	const p = patterns[rand.uint32() % patterns.length];
	for (let i = 0; i < p.length; i++) {
		const c = p[i];
		switch (c) {
			case 'c':
				if (rand.uint32() % 2 != 1 || i == p.length - 1) {
					word += constants[rand.uint32() % constants.length];
				} else {
					word += constantsm[rand.uint32() % constantsm.length];
				}
				break;
			case 'v':
				if (rand.uint32() % 3 != 2 || i == 0) {
					word += vowels[rand.uint32() % vowels.length];
				} else {
					word += vowelsm[rand.uint32() % vowelsm.length];
				}
				break;
		}
	}

	return word;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function uniqueName(numWords: number, ...args: any[]): string {
	const rand = Alea(...args);
	let word = '';
	for (let k = 0; k < numWords; k++) {
		if (word !== '') {
			word += ' ';
		}

		const p = patterns[rand.uint32() % patterns.length];
		for (let i = 0; i < p.length; i++) {
			const c = p[i];
			let added = '';
			switch (c) {
				case 'c':
					if (rand.uint32() % 2 != 1 || i == p.length - 1) {
						added = constants[rand.uint32() % constants.length];
					} else {
						added = constantsm[rand.uint32() % constantsm.length];
					}
					break;
				case 'v':
					if (rand.uint32() % 3 != 2 || i == 0) {
						added = vowels[rand.uint32() % vowels.length];
					} else {
						added = vowelsm[rand.uint32() % vowelsm.length];
					}
					break;
			}
			if (i === 0) {
				added = added[0].toUpperCase() + added.slice(1);
			}
			word += added;
		}
	}

	return word;
}
