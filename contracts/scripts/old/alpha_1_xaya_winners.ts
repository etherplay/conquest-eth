import {locationToXY, xyToLocation} from 'conquest-eth-common';
import 'dotenv/config';
import {TheGraph} from './utils/thegraph';
import fs from 'fs';

const theGraph = new TheGraph(
	`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`,
);

const xayaPlanetsStrings = [
	'129,-177',
	'-55,-142',
	'161,54',
	'141,-168',
	'-32,111',
	'-154,-27',
	'-160,136',
	'53,-31',
	'128,15',
	'179,59',
	'-3,-242',
	'-154,-108',
	'-155,-83',
	'37,-236',
	'96,94',
	'-13,-198',
	'52,-211',
	'184,-167',
	'-98,150',
	'-74,97',
];

const xayaPlanets = xayaPlanetsStrings.map((v) => {
	const splitted = v.split(',');
	return xyToLocation(parseInt(splitted[0]), parseInt(splitted[1]));
});

console.log({xayaPlanets});

const queryString = `
query($planets: [ID!]! $blockNumber: Int!) {
  exitCompleteEvents(orderBy: timestamp orderDirection: asc block: {number: $blockNumber} where: {planet_in: $planets}) {
    planet {id}
    owner { id}
  }
  planets(block: {number: $blockNumber} where: {id_in: $planets}) {
    id
    owner { id }
  }
}
`;

async function main() {
	const result = await theGraph.query(queryString, {
		variables: {planets: xayaPlanets, blockNumber: 4830319},
	});
	const data = result[0] as {
		exitCompleteEvents: {owner: {id: string}; planet: {id: string}}[];
		planets: {owner: {id: string}; id: string}[];
	};
	const exited = data.exitCompleteEvents;
	const held = data.planets;

	const winners: {[id: string]: number} = {};
	const planetsCounted: {[id: string]: boolean} = {};
	for (const planetExited of exited) {
		if (!planetsCounted[planetExited.planet.id]) {
			winners[planetExited.owner.id] = winners[planetExited.owner.id] || 0;
			winners[planetExited.owner.id] += 150;
			planetsCounted[planetExited.planet.id] = true;
		}
	}

	for (const planetHeld of held) {
		if (!planetsCounted[planetHeld.id]) {
			winners[planetHeld.owner.id] = winners[planetHeld.owner.id] || 0;
			winners[planetHeld.owner.id] += 150;
			planetsCounted[planetHeld.id] = true;
		}
	}

	const token_winners = [
		'0x724a118ea4f9b0d2a764f870ff1c986fe956caf0',
		'0xa514f4d58e9b0e1cbcd5d15f0967655cf6e8b096',
		'0x1d4ebeda35092cb0b3d27b4c5d39af5facb00077',
		'0x60d38778adbbeeac88f741b833cbb9877228eea0',
		'0xfe3865dd730eabfe973b2d9035c4eefed3076a36',
		'0xc6ccd3c2d63bc8de8fcf43ede80d135666b7acee',
		'0x02eaa3f22d83d672d8d8e900f2e3fc43d07a5b9e',
		'0x90bf1e866a1b4681e1a82c377b4839859f97dab7',
		'0xfbe849ea94aa5acd53c83776449620b1b51976db',
		'0x2adcbe31a816897fadad6d61c9a9fcfb9254b823',
		'0x3ef342908f3a8b20127bda3a11ad7a62adbfad5c',
		'0xe25791aa3cb2808b24dd5971f8f02e6a6cba5ce1',
		'0x1e61cf58e9f9b273a3e13ddec1a4b4c34bae5a8b',
		'0x8f78f00e6503414c8d91aa98bd61860784faeeaf',
		'0xfeff33456de40aa9ffc85b796cb731b91ea6eb04',
		'0xeedfbb28576db4be41d6dff31ad2efc4d686af78',
		'0x83cf995d3177c7d317f215b9f4061cd1aeb1d846',
		'0x044500949fe2a5b4ee983b47b5040c6016ef4b68',
	];

	console.log({
		winners,
		planetsCounted,
		exited,
		held,
	});

	console.log(token_winners);
	console.log(winners);

	for (const tokenWinner of token_winners) {
		if (winners[tokenWinner]) {
			console.log(`${tokenWinner}: ${winners[tokenWinner]}`);
		}
	}

	for (const loc of xayaPlanets) {
		if (!planetsCounted[loc]) {
			console.log(`not counted: ${locationToXY(loc)}`);
		}
	}

	let winnersArray: {
		address: string;
		signedMessage?: string;
		signature?: string;
		numTokens?: number;
		numWCHI: number;
	}[] = [];
	try {
		winnersArray = JSON.parse(
			fs.readFileSync('alpha_1_winners.json').toString(),
		);
	} catch (e) {}
	for (const winner of Object.keys(winners)) {
		const found = winnersArray.findIndex(
			(v) => v.address.toLowerCase() === winner,
		);
		if (found !== -1) {
			winnersArray[found].numWCHI = winners[winner];
		} else {
			winnersArray.push({
				address: winner,
				numWCHI: winners[winner],
			});
		}
	}
	fs.writeFileSync(
		'alpha_1_winners.json',
		JSON.stringify(winnersArray, null, 2),
	);
}

main();
