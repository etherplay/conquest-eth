import fs from 'fs';
import {verifyMessage} from '@ethersproject/wallet';

async function main() {
	let winnersArray: {
		address: string;
		numTokens?: number;
		numWCHI?: number;
		near_signedMessage?: string;
		near_signature?: string;
		near_address?: string;
	}[] = [];
	try {
		winnersArray = JSON.parse(fs.readFileSync('data/winners.json').toString());
	} catch (e) {}

	const signatures: string[] = JSON.parse(
		fs.readFileSync('data/near.signatures.json').toString(),
	);

	for (const signature of signatures) {
		const splitted = signature.split(':');
		let signer: string;
		let nearAddress: string;
		let message: string | undefined;
		let sig: string | undefined;
		if (splitted.length > 1) {
			nearAddress = splitted[0];
			sig = splitted[1];
			message = `I agree to have my alpha.conquest.eth reward sent to the following address: ${nearAddress}`;
			const recover = verifyMessage(message, sig);
			signer = recover;

			console.log({message, signer, sig});
		} else {
			throw new Error(`invalid near signing for sig: ${signature}`);
		}

		const found = winnersArray.find(
			(v) => v.address.toLowerCase() === signer.toLowerCase(),
		);
		if (!found) {
			console.error(`notfound : ${signer}`);
		} else {
			found.near_address = nearAddress;
			found.near_signature = sig;
			found.near_signedMessage = message;
		}
	}

	fs.writeFileSync('data/winners.json', JSON.stringify(winnersArray, null, 2));
}

main();
