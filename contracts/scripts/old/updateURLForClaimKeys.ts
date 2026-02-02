import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {Wallet} from '@ethersproject/wallet';
import fs from 'fs';
import qrcode from 'qrcode';

const args = process.argv.slice(2);

if (args.length === 0) {
	throw new Error(`need to pass the url`);
}
const mainURL = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {network, getChainId} = hre;

	let explorerLink = '';
	let etherscanNetworkPrefix: string | undefined;
	const chainId = await getChainId();
	if (chainId === '1') {
		etherscanNetworkPrefix = '';
	} else if (chainId === '4') {
		etherscanNetworkPrefix = 'rinkeby.';
	} else if (chainId === '42') {
		etherscanNetworkPrefix = 'kovan.';
	} else if (chainId === '5') {
		etherscanNetworkPrefix = 'goerli.';
	} // TODO more
	if (etherscanNetworkPrefix !== undefined) {
		explorerLink = `https://${etherscanNetworkPrefix}etherscan.io/address/`;
	}

	const claimKeys = JSON.parse(
		fs.readFileSync(`.${network.name}.claimKeys`).toString(),
	);
	let csv = 'used,address,key,url,qrURL\n';
	for (const claimKey of claimKeys) {
		const url = `${mainURL}#tokenClaim=${claimKey}`;
		const qrURL = await qrcode.toDataURL(url);
		const address = new Wallet(claimKey).address;
		csv += `false,${explorerLink}${address},${claimKey},${url},"${qrURL}"\n`;
	}
	fs.writeFileSync(`.${network.name}.claimKeys.csv`, csv);
}
if (require.main === module) {
	func(hre);
}
