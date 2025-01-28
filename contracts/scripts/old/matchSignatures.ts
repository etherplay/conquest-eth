import fs from 'fs';
import {verifyMessage} from '@ethersproject/wallet';

async function main() {
  let winnersArray: {
    address: string;
    signedMessage?: string;
    signature?: string;
    addressToSendTo?: string;
    numTokens?: number;
    numWCHI?: number;
  }[] = [];
  try {
    winnersArray = JSON.parse(fs.readFileSync('data/winners.json').toString());
  } catch (e) {}

  const signatures: string[] = JSON.parse(fs.readFileSync('data/signatures.json').toString());

  for (const signature of signatures) {
    const splitted = signature.split(':');
    let signer: string;
    let addressToSendTo: string;
    let message: string | undefined;
    let sig: string | undefined;
    if (splitted.length > 1) {
      addressToSendTo = splitted[0];
      sig = splitted[1];
      message = `I agree to have my alpha.conquest.eth reward sent to the following address: ${addressToSendTo}`;
      const recover = verifyMessage(message, sig);
      signer = recover;

      console.log({message, signer, sig});
    } else {
      signer = splitted[0];
      addressToSendTo = signer;
      console.log({signer});
    }

    const found = winnersArray.find((v) => v.address.toLowerCase() === signer.toLowerCase());
    if (!found) {
      console.error(`notfound : ${signer}`);
    } else {
      found.addressToSendTo = addressToSendTo;
      found.signature = sig;
      found.signedMessage = message;
    }
  }

  fs.writeFileSync('data/winners.json', JSON.stringify(winnersArray, null, 2));
}

main();
