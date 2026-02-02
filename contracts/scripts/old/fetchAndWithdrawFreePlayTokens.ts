import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {formatEther} from '@ethersproject/units';

const graphqlResponse = {
	data: {
		planetExitEvents: [
			{
				exitTime: '1653168875',
				planet: {
					owner: {
						id: '0x4dea0eb50e61368ef2deb64a4272f0eb77aaa68e',
					},
					flagTime: '0',
					stakeDeposited: '2600000000000000000',
					id: '0xffffffffffffffffffffffffffffffcefffffffffffffffffffffffffffffff3',
					x: '-13',
					y: '-50',
				},
				stake: '2600000000000000000',
			},
			{
				exitTime: '1653168975',
				planet: {
					owner: {
						id: '0x4dea0eb50e61368ef2deb64a4272f0eb77aaa68e',
					},
					flagTime: '0',
					stakeDeposited: '3600000000000000000',
					id: '0xffffffffffffffffffffffffffffffd2ffffffffffffffffffffffffffffffee',
					x: '-18',
					y: '-46',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1655493865',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '2600000000000000000',
					id: '0x0000000000000000000000000000001bffffffffffffffffffffffffffffffe3',
					x: '-29',
					y: '27',
				},
				stake: '2600000000000000000',
			},
			{
				exitTime: '1655494050',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3900000000000000000',
					id: '0xffffffffffffffffffffffffffffffeafffffffffffffffffffffffffffffff5',
					x: '-11',
					y: '-22',
				},
				stake: '3900000000000000000',
			},
			{
				exitTime: '1655494065',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3600000000000000000',
					id: '0xffffffffffffffffffffffffffffffe700000000000000000000000000000007',
					x: '7',
					y: '-25',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1655494105',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff0fffffffffffffffffffffffffffffff0',
					x: '-16',
					y: '-16',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1655494145',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650381550',
					stakeDeposited: '3300000000000000000',
					id: '0xffffffffffffffffffffffffffffffe800000000000000000000000000000014',
					x: '20',
					y: '-24',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1655494455',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '11900000000000000000',
					id: '0xffffffffffffffffffffffffffffffe8ffffffffffffffffffffffffffffffd5',
					x: '-43',
					y: '-24',
				},
				stake: '11900000000000000000',
			},
			{
				exitTime: '1657129945',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '7900000000000000000',
					id: '0xffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffffb',
					x: '-5',
					y: '-17',
				},
				stake: '7900000000000000000',
			},
			{
				exitTime: '1657129955',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '2600000000000000000',
					id: '0xffffffffffffffffffffffffffffffea00000000000000000000000000000014',
					x: '20',
					y: '-22',
				},
				stake: '2600000000000000000',
			},
			{
				exitTime: '1657129970',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff200000000000000000000000000000013',
					x: '19',
					y: '-14',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1657129985',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '6600000000000000000',
					id: '0xfffffffffffffffffffffffffffffffeffffffffffffffffffffffffffffffd8',
					x: '-40',
					y: '-2',
				},
				stake: '6600000000000000000',
			},
			{
				exitTime: '1657130010',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3900000000000000000',
					id: '0x00000000000000000000000000000000ffffffffffffffffffffffffffffffd9',
					x: '-39',
					y: '0',
				},
				stake: '3900000000000000000',
			},
			{
				exitTime: '1657673965',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '5300000000000000000',
					id: '0xffffffffffffffffffffffffffffffeb00000000000000000000000000000007',
					x: '7',
					y: '-21',
				},
				stake: '5300000000000000000',
			},
			{
				exitTime: '1657674060',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650382090',
					stakeDeposited: '2600000000000000000',
					id: '0xfffffffffffffffffffffffffffffffdfffffffffffffffffffffffffffffffe',
					x: '-2',
					y: '-3',
				},
				stake: '2600000000000000000',
			},
			{
				exitTime: '1657674145',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3600000000000000000',
					id: '0x00000000000000000000000000000014fffffffffffffffffffffffffffffff0',
					x: '-16',
					y: '20',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1657674385',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '2900000000000000000',
					id: '0xffffffffffffffffffffffffffffffebfffffffffffffffffffffffffffffffa',
					x: '-6',
					y: '-21',
				},
				stake: '2900000000000000000',
			},
			{
				exitTime: '1657802750',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '2300000000000000000',
					id: '0xfffffffffffffffffffffffffffffffb00000000000000000000000000000010',
					x: '16',
					y: '-5',
				},
				stake: '2300000000000000000',
			},
			{
				exitTime: '1657802795',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff5ffffffffffffffffffffffffffffffdc',
					x: '-36',
					y: '-11',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1657804325',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650382265',
					stakeDeposited: '2300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff9ffffffffffffffffffffffffffffffe9',
					x: '-23',
					y: '-7',
				},
				stake: '2300000000000000000',
			},
			{
				exitTime: '1659174085',
				planet: {
					owner: {
						id: '0x7773ae67403d2e30102a84c48cc939919c4c881c',
					},
					flagTime: '0',
					stakeDeposited: '9300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff4ffffffffffffffffffffffffffffffe3',
					x: '-29',
					y: '-12',
				},
				stake: '9300000000000000000',
			},
			{
				exitTime: '1659472755',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '7900000000000000000',
					id: '0xfffffffffffffffffffffffffffffff60000000000000000000000000000000a',
					x: '10',
					y: '-10',
				},
				stake: '7900000000000000000',
			},
			{
				exitTime: '1659472935',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '2600000000000000000',
					id: '0x00000000000000000000000000000013fffffffffffffffffffffffffffffff1',
					x: '-15',
					y: '19',
				},
				stake: '2600000000000000000',
			},
			{
				exitTime: '1659873965',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3600000000000000000',
					id: '0xfffffffffffffffffffffffffffffff9ffffffffffffffffffffffffffffffda',
					x: '-38',
					y: '-7',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1659873985',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff7ffffffffffffffffffffffffffffffe0',
					x: '-32',
					y: '-9',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1661196965',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3600000000000000000',
					id: '0x00000000000000000000000000000000ffffffffffffffffffffffffffffffe1',
					x: '-31',
					y: '0',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1661197000',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650381975',
					stakeDeposited: '2900000000000000000',
					id: '0x0000000000000000000000000000000400000000000000000000000000000002',
					x: '2',
					y: '4',
				},
				stake: '2900000000000000000',
			},
			{
				exitTime: '1661257820',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '6600000000000000000',
					id: '0x00000000000000000000000000000009fffffffffffffffffffffffffffffff1',
					x: '-15',
					y: '9',
				},
				stake: '6600000000000000000',
			},
			{
				exitTime: '1661866295',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650381910',
					stakeDeposited: '3600000000000000000',
					id: '0xfffffffffffffffffffffffffffffff300000000000000000000000000000007',
					x: '7',
					y: '-13',
				},
				stake: '3600000000000000000',
			},
			{
				exitTime: '1661866350',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff0fffffffffffffffffffffffffffffffd',
					x: '-3',
					y: '-16',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1661866365',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffdd',
					x: '-35',
					y: '-1',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1661866540',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '0',
					stakeDeposited: '1900000000000000000',
					id: '0xfffffffffffffffffffffffffffffff6ffffffffffffffffffffffffffffffe4',
					x: '-28',
					y: '-10',
				},
				stake: '1900000000000000000',
			},
			{
				exitTime: '1661873295',
				planet: {
					owner: {
						id: '0x8888888884d2e4e981023da51b43066461f46dca',
					},
					flagTime: '1650382025',
					stakeDeposited: '2300000000000000000',
					id: '0x0000000000000000000000000000000200000000000000000000000000000001',
					x: '1',
					y: '2',
				},
				stake: '2300000000000000000',
			},
			{
				exitTime: '1665182275',
				planet: {
					owner: {
						id: '0xebcfd08a0a9a389789ccb19bd1ebbeaf91f4c134',
					},
					flagTime: '0',
					stakeDeposited: '1900000000000000000',
					id: '0x00000000000000000000000000000032ffffffffffffffffffffffffffffff8a',
					x: '-118',
					y: '50',
				},
				stake: '1900000000000000000',
			},
			{
				exitTime: '1665716685',
				planet: {
					owner: {
						id: '0x5a016b206d0314c7ec641c3a6fd89dac7fea010e',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0x0000000000000000000000000000004c0000000000000000000000000000005b',
					x: '91',
					y: '76',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1668100110',
				planet: {
					owner: {
						id: '0x865c2f85c9fea1c6ac7f53de07554d68cb92ed88',
					},
					flagTime: '0',
					stakeDeposited: '3300000000000000000',
					id: '0xfffffffffffffffffffffffffffffff9fffffffffffffffffffffffffffffff5',
					x: '-11',
					y: '-7',
				},
				stake: '3300000000000000000',
			},
			{
				exitTime: '1673611325',
				planet: {
					owner: {
						id: '0x3e38198ee83fad30c365cd3a58a3d08aab4b1080',
					},
					flagTime: '0',
					stakeDeposited: '1300000000000000000',
					id: '0xffffffffffffffffffffffffffffff860000000000000000000000000000006c',
					x: '108',
					y: '-122',
				},
				stake: '1300000000000000000',
			},
			{
				exitTime: '1682070940',
				planet: {
					owner: {
						id: '0xc9adc46240c1828cefef0650c6951fa3fddb9846',
					},
					flagTime: '0',
					stakeDeposited: '1300000000000000000',
					id: '0xfffffffffffffffffffffffffffffffa00000000000000000000000000000030',
					x: '48',
					y: '-6',
				},
				stake: '1300000000000000000',
			},
			{
				exitTime: '1693728005',
				planet: {
					owner: {
						id: '0xfeff33456de40aa9ffc85b796cb731b91ea6eb04',
					},
					flagTime: '0',
					stakeDeposited: '9300000000000000000',
					id: '0x000000000000000000000000000000110000000000000000000000000000002d',
					x: '45',
					y: '17',
				},
				stake: '9300000000000000000',
			},
		],
	},
};

console.log(graphqlResponse.data.planetExitEvents.length);

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read, execute, catchUnknownSigner} = hre.deployments;
	const {deployer} = await hre.getNamedAccounts();

	const OuterSpace = await hre.deployments.get('OuterSpace');

	const ownersToWithdrawFor: {address: string; locations: string[]}[] = [];
	for (const exitEvent of graphqlResponse.data.planetExitEvents) {
		let currentOwner = ownersToWithdrawFor.find(
			(owner) => owner.address === exitEvent.planet.owner.id,
		);
		if (!currentOwner) {
			currentOwner = {address: exitEvent.planet.owner.id, locations: []};
			ownersToWithdrawFor.push(currentOwner);
		}
		currentOwner.locations.push(exitEvent.planet.id);
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
		});

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
		});
	}
}
if (require.main === module) {
	func(hre);
}
