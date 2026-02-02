import 'isomorphic-unfetch';

async function main() {
	const response = await fetch(
		'https://eth-goerli.gateway.pokt.network/v1/lb/6196a852c818d60035af2419',
		{
			method: 'POST',
			body: JSON.stringify({
				id: 1,
			}),
		},
	);
	console.log(await response.json());
}
