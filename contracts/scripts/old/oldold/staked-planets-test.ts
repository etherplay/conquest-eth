import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {formatEther} from '@ethersproject/units';
import {locationToXY} from 'conquest-eth-common';
import {BigNumber} from 'ethers';

const playersWithWithdrawalNeeded = {
	'0x32D44eBB2D3392b308f7682b7468D9C92B4FD76C': {
		freeplay: '0n',
		play: '900000000000000000n',
	},
	'0x8888888884d2e4E981023dA51B43066461F46Dca': {
		freeplay: '0n',
		play: '60300000000000000000n',
	},
	'0x283aFaad5c345680144f20F3910EA95e5F0bA932': {
		freeplay: '0n',
		play: '3900000000000000000n',
	},
};

const stakedPlanets = {
	'-11,-7': {
		location:
			'115792089237316195423570985008687907851228290464114933258677336363322520371189',
		owner: '0x865c2F85C9fEa1C6Ac7F53de07554D68cB92eD88',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 24927691,
	},
	'-5,-17': {
		location:
			'115792089237316195423570985008687907847825466794905548624043590289004838256635',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '7900000000000000000n',
		exitTime: 23031574,
	},
	'7,-21': {
		location:
			'115792089237316195423570985008687907846124054960300856306726717251845997199367',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '5300000000000000000n',
		exitTime: 23138473,
	},
	'19,-14': {
		location:
			'115792089237316195423570985008687907848506031528747425550970339503868374679571',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 23031579,
	},
	'10,-10': {
		location:
			'115792089237316195423570985008687907849867160996431179404823837933595447525386',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '7900000000000000000n',
		exitTime: 23493648,
	},
	'20,-24': {
		location:
			'115792089237316195423570985008687907845103207859538040916336593429550692565012',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '3300000000000000000n',
		exitTime: 22712999,
	},
	'7,-13': {
		location:
			'115792089237316195423570985008687907848846313895668364014433714111300142891015',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '3600000000000000000n',
		exitTime: 23959934,
	},
	'2,4': {
		location: '1361129467683753853853498429727072845826',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '2900000000000000000n',
		exitTime: 23834667,
	},
	'1,2': {
		location: '680564733841876926926749214863536422913',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '2300000000000000000n',
		exitTime: 23961071,
	},
	'-2,-3': {
		location:
			'115792089237316195423570985008687907852589419931798687112530834793049593217022',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '2600000000000000000n',
		exitTime: 23138492,
	},
	'-23,-7': {
		location:
			'115792089237316195423570985008687907851228290464114933258677336363322520371177',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 1,
		stakeDeposited: '2300000000000000000n',
		exitTime: 23164529,
	},
	'-6,-21': {
		location:
			'115792089237316195423570985008687907846464337327221794770190091859277765410810',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2900000000000000000n',
		exitTime: 23138557,
	},
	'-3,-16': {
		location:
			'115792089237316195423570985008687907848165749161826487087506964896436606468093',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 23959942,
	},
	'-11,-22': {
		location:
			'115792089237316195423570985008687907846124054960300856306726717251845997199349',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3900000000000000000n',
		exitTime: 22712980,
	},
	'7,-25': {
		location:
			'115792089237316195423570985008687907844762925492617102452873218822118924353543',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 22712983,
	},
	'-13,-50': {
		location:
			'115792089237316195423570985008687907836596148686514579329752228243756487278579',
		owner: '0x4DeA0eb50e61368EF2deb64A4272F0eB77AAA68E',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 22266462,
	},
	'42,-37': {
		location:
			'115792089237316195423570985008687907840679537089565840891312723532937705816106',
		owner: '0x1ffb5056730672AB48597Ce24371Feb0eC88a2b8',
		flagTime: 0,
		stakeDeposited: '2900000000000000000n',
		exitTime: 0,
	},
	'20,-22': {
		location:
			'115792089237316195423570985008687907845783772593379917843263342644414228987924',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 23031576,
	},
	'-18,-46': {
		location:
			'115792089237316195423570985008687907837957278154198333183605726673483560124398',
		owner: '0x4DeA0eb50e61368EF2deb64A4272F0eB77AAA68E',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 22266482,
	},
	'-43,-24': {
		location:
			'115792089237316195423570985008687907845443490226458979379799968036982460776405',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '11900000000000000000n',
		exitTime: 22713061,
	},
	'-15,19': {
		location: '6805647338418769269267492148635364229105',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 23493684,
	},
	'-16,20': {
		location: '7145929705339707732730866756067132440560',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 23138509,
	},
	'-36,-11': {
		location:
			'115792089237316195423570985008687907849867160996431179404823837933595447525340',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 23164223,
	},
	'45,17': {
		location: '5784800237655953878877368326340059594797',
		owner: '0xfEFf33456DE40Aa9FfC85B796Cb731B91eA6eB04',
		flagTime: 0,
		stakeDeposited: '9300000000000000000n',
		exitTime: 29785449,
	},
	'-29,27': {
		location: '9527906273786276976974489008089509920739',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 22712943,
	},
	'-22,0': {
		location: '340282366920938463463374607431768211434',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 0,
	},
	'-38,-7': {
		location:
			'115792089237316195423570985008687907851228290464114933258677336363322520371162',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 23573864,
	},
	'-39,0': {
		location: '340282366920938463463374607431768211417',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3900000000000000000n',
		exitTime: 23031587,
	},
	'-40,-2': {
		location:
			'115792089237316195423570985008687907852929702298719625575994209400481361428440',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '6600000000000000000n',
		exitTime: 23031582,
	},
	'-35,-1': {
		location:
			'115792089237316195423570985008687907853269984665640564039457584007913129639901',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 23959945,
	},
	'-31,0': {
		location: '340282366920938463463374607431768211425',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 23834660,
	},
	'-32,-9': {
		location:
			'115792089237316195423570985008687907850547725730273056331750587148458983948256',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 23573868,
	},
	'-16,-16': {
		location:
			'115792089237316195423570985008687907848165749161826487087506964896436606468080',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 22712991,
	},
	'16,-5': {
		location:
			'115792089237316195423570985008687907851568572831035871722140710970754288582672',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '2300000000000000000n',
		exitTime: 23164214,
	},
	'-28,-10': {
		location:
			'115792089237316195423570985008687907850207443363352117868287212541027215736804',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '1900000000000000000n',
		exitTime: 23959974,
	},
	'-29,-12': {
		location:
			'115792089237316195423570985008687907849526878629510240941360463326163679313891',
		owner: '0x7773Ae67403d2E30102a84c48cc939919C4C881c',
		flagTime: 0,
		stakeDeposited: '9300000000000000000n',
		exitTime: 23433918,
	},
	'-15,9': {
		location: '3402823669209384634633746074317682114545',
		owner: '0x8888888884d2e4E981023dA51B43066461F46Dca',
		flagTime: 0,
		stakeDeposited: '6600000000000000000n',
		exitTime: 23846826,
	},
	'-118,50': {
		location: '17354400712967861636632104979020178784138',
		owner: '0xebCFD08a0a9a389789CcB19Bd1ebBeAf91f4c134',
		flagTime: 0,
		stakeDeposited: '1900000000000000000n',
		exitTime: 24506501,
	},
	'91,76': {
		location: '25861459885991323223216470164814384070747',
		owner: '0x5A016B206d0314C7Ec641C3A6fd89dAc7FeA010e',
		flagTime: 0,
		stakeDeposited: '3300000000000000000n',
		exitTime: 24586439,
	},
	'108,-122': {
		location:
			'115792089237316195423570985008687907811755535901286071496925881901237407842412',
		owner: '0x3e38198eE83FaD30C365CD3a58A3D08aab4b1080',
		flagTime: 0,
		stakeDeposited: '1300000000000000000n',
		exitTime: 25943356,
	},
	'48,-6': {
		location:
			'115792089237316195423570985008687907851228290464114933258677336363322520371248',
		owner: '0xC9ADc46240C1828cEfEf0650C6951Fa3FDDb9846',
		flagTime: 0,
		stakeDeposited: '1300000000000000000n',
		exitTime: 27557546,
	},
	'109,-127': {
		location:
			'115792089237316195423570985008687907810054124066681379179609008864078566785133',
		owner: '0x7fCe02BB66c0D9396fb9bC60a80d45462E60fdfF',
		flagTime: 0,
		stakeDeposited: '2600000000000000000n',
		exitTime: 0,
	},
	'110,-126': {
		location:
			'115792089237316195423570985008687907810394406433602317643072383471510334996590',
		owner: '0x7fCe02BB66c0D9396fb9bC60a80d45462E60fdfF',
		flagTime: 0,
		stakeDeposited: '3600000000000000000n',
		exitTime: 0,
	},
	'-122,-131': {
		location:
			'115792089237316195423570985008687907809033276965918563789218885041783262150534',
		owner: '0x283aFaad5c345680144f20F3910EA95e5F0bA932',
		flagTime: 0,
		stakeDeposited: '11900000000000000000n',
		exitTime: 0,
	},
	'108,-126': {
		location:
			'115792089237316195423570985008687907810394406433602317643072383471510334996588',
		owner: '0x283aFaad5c345680144f20F3910EA95e5F0bA932',
		flagTime: 0,
		stakeDeposited: '2900000000000000000n',
		exitTime: 0,
	},
	'105,-129': {
		location:
			'115792089237316195423570985008687907809373559332839502252682259649215030362217',
		owner: '0x283aFaad5c345680144f20F3910EA95e5F0bA932',
		flagTime: 0,
		stakeDeposited: '5300000000000000000n',
		exitTime: 30304105,
	},
};

type StakedPlanet = {
	location: string;
	owner: string;
	flagTime: 0 | 1;
	stakeDeposited: string;
	exitTime: number;
};

let totalStakeInFreePlay: bigint = 0n;
let totalStakeInPlay: bigint = 0n;
let totalStake: bigint = 0n;
for (const key of Object.keys(stakedPlanets)) {
	const planet = (stakedPlanets as any)[key] as StakedPlanet;
	const stake = BigInt(planet.stakeDeposited.slice(0, -1));
	// console.log(Number(stake / 10n ** 16n) / 100);
	totalStake += stake;
	if (planet.flagTime === 0) {
		totalStakeInPlay += stake;
	} else {
		totalStakeInFreePlay += stake;
	}
}

console.log({
	totalStake: Number(totalStake / 10n ** 16n) / 100,
	totalStakeInFreePlay: Number(totalStakeInFreePlay / 10n ** 16n) / 100,
	totalStakeInPlay: Number(totalStakeInPlay / 10n ** 16n) / 100,
});
// process.exit(1);

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read, execute, catchUnknownSigner} = hre.deployments;
	const {deployer} = await hre.getNamedAccounts();

	const OuterSpace = await hre.deployments.get('OuterSpace');

	console.log(`------------------------------------------`);
	const ownersToWithdrawFor: {address: string; locations: string[]}[] = [];
	for (const key of Object.keys(stakedPlanets)) {
		const planet = (stakedPlanets as any)[key] as StakedPlanet;
		let currentOwner = ownersToWithdrawFor.find(
			(owner) => owner.address === planet.owner,
		);
		if (!currentOwner) {
			currentOwner = {address: planet.owner, locations: []};
			ownersToWithdrawFor.push(currentOwner);
		}
		currentOwner.locations.push(planet.location);

		if (!planet.exitTime || planet.exitTime == 0) {
			console.log(`${key} is not exiting...`);
		}
	}
	console.log(`------------------------------------------`);

	for (const address of Object.keys(playersWithWithdrawalNeeded)) {
		let currentOwner = ownersToWithdrawFor.find(
			(owner) => owner.address.toLowerCase() === address.toLowerCase(),
		);
		if (!currentOwner) {
			currentOwner = {address: address, locations: []};
			ownersToWithdrawFor.push(currentOwner);
		}
	}

	for (const owner of ownersToWithdrawFor) {
		console.log({
			owner: owner.address,
			locations: owner.locations.length,
		});
		console.log({
			playToken: formatEther(
				await read('PlayToken', 'balanceOf', owner.address),
			),
			freePlayToken: formatEther(
				await read('FreePlayToken', 'balanceOf', owner.address),
			),
			freePlayTokenInOuterSpace: formatEther(
				await read('FreePlayToken', 'balanceOf', OuterSpace.address),
			),
			playTokenInOuterSpace: formatEther(
				await read('PlayToken', 'balanceOf', OuterSpace.address),
			),
		});

		// for (const location of owner.locations) {
		//   try {
		//     await catchUnknownSigner(
		//       execute('OuterSpace', {from: deployer, log: true}, 'fetchAndWithdrawFor', owner.address, [location])
		//     );
		//   } catch (e) {
		//     const hex = BigNumber.from(location).toHexString();
		//     const {x, y} = locationToXY(hex);
		//     console.error(`fails on ${location} (${hex}): ${x},${y}`);
		//   }
		// }
		await catchUnknownSigner(
			execute(
				'OuterSpace',
				{from: deployer, log: true},
				'fetchAndWithdrawFor',
				owner.address,
				owner.locations,
			),
		);

		console.log({
			playToken: formatEther(
				await read('PlayToken', 'balanceOf', owner.address),
			),
			freePlayToken: formatEther(
				await read('FreePlayToken', 'balanceOf', owner.address),
			),
			freePlayTokenInOuterSpace: formatEther(
				await read('FreePlayToken', 'balanceOf', OuterSpace.address),
			),
			playTokenInOuterSpace: formatEther(
				await read('PlayToken', 'balanceOf', OuterSpace.address),
			),
		});
	}
}
if (require.main === module) {
	func(hre);
}
