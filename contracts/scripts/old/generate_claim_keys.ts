import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {deployments} from 'hardhat';
import {parseEther} from '@ethersproject/units';
import {BigNumber} from '@ethersproject/bignumber';
import {Wallet} from '@ethersproject/wallet';
import fs from 'fs';
import qrcode from 'qrcode';

const append = true;

const args = process.argv.slice(2);

if (args.length === 0) {
	throw new Error(`need to pass the number of claim keys to generate`);
}
const numClaimKey = parseInt(args[0]);
if (isNaN(numClaimKey) || numClaimKey === 0 || numClaimKey > 100) {
	throw new Error(`invalid number of claims`);
}
const offset = 0;

let mainURL = `https://${hre.network.name}.conquest.etherplay.io/`;

if (!mainURL.endsWith('/')) {
	mainURL = mainURL + '/';
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {claimKeyDistributor} = await hre.getNamedAccounts();
	const {network, getChainId, ethers} = hre;
	const {execute, read} = hre.deployments;

	let mnemonic =
		'curious erupt response napkin sick ketchup hard estate comic club female sudden';
	// TODO check hardhat-deploy: if (network.live) {
	if (network.name !== 'hardhat' && network.name !== 'localhost') {
		mnemonic = Wallet.createRandom().mnemonic.phrase;
		const pastMnemonicsFilename = `.claimKeys.mnemonics`;
		let pastMnemonics = [];
		try {
			const mnemonicSrc = await deployments.readDotFile(pastMnemonicsFilename);
			pastMnemonics = JSON.parse(mnemonicSrc);
		} catch (e) {}
		pastMnemonics.push(mnemonic);
		await deployments.saveDotFile(
			pastMnemonicsFilename,
			JSON.stringify(pastMnemonics),
		);
	}

	const claimKeyETHAmount = parseEther('0.2');
	const defaultClaimKeyTokenAmount = parseEther('200');

	const claimKeys: {
		key: string;
		amount: number;
		address: string;
		url: string;
	}[] = [];
	const addresses = [];
	let totalETHAmount = BigNumber.from(0);
	let totalTokenAmount = BigNumber.from(0);
	const amounts: BigNumber[] = [];
	for (let i = offset; i < numClaimKey + offset; i++) {
		const path = "m/44'/60'/" + i + "'/0/0";
		const wallet = Wallet.fromMnemonic(mnemonic, path);
		const claimKeyTokenAmount = defaultClaimKeyTokenAmount;
		// TODO reenable 400 tokens ?
		// if (BigNumber.from(wallet.address).mod(100).toNumber() < 10) {
		//   claimKeyTokenAmount = defaultClaimKeyTokenAmount.mul(2);
		// }
		claimKeys.push({
			key: wallet.privateKey,
			amount: claimKeyTokenAmount.div('1000000000000000000').toNumber(),
			address: wallet.address,
			url: `${mainURL}#tokenClaim=${wallet.privateKey}`,
		});
		addresses.push(wallet.address);
		amounts.push(claimKeyTokenAmount);
		totalETHAmount = totalETHAmount.add(claimKeyETHAmount);
		totalTokenAmount = totalTokenAmount.add(claimKeyTokenAmount);
	}

	const claimKeyDistributorETHBalance =
		await ethers.provider.getBalance(claimKeyDistributor);
	const claimKeyDistributorTokenBalance = await read(
		'FreePlayToken',
		'balanceOf',
		claimKeyDistributor,
	);

	console.log({
		claimKeyDistributor,
		claimKeyDistributorETHBalance: claimKeyDistributorETHBalance.toString(),
		claimKeyDistributorTokenBalance: claimKeyDistributorTokenBalance.toString(),
		totalETHAmount: totalETHAmount.toString(),
		addresses,
		totalTokenAmount: totalTokenAmount.toString(),
	});
	const receipt = await execute(
		'FreePlayToken',
		{
			from: claimKeyDistributor,
			value: totalETHAmount.toString(),
			log: true,
			autoMine: true,
		},
		'distributeVariousAmountsAlongWithETH',
		addresses,
		amounts,
	);

	console.log({tx: receipt.transactionHash});

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

	const filename = `.claimKeys`;
	if (append) {
		let previous: {key: string; amount: number; address: string}[] = [];
		try {
			previous = JSON.parse(await deployments.readDotFile(filename));
		} catch (e) {}
		await deployments.saveDotFile(
			filename,
			JSON.stringify(previous.concat(claimKeys), null, 2),
		);
	} else {
		await deployments.saveDotFile(filename, JSON.stringify(claimKeys, null, 2));
	}

	let csv = 'used,address,key,amount,url,qrURL\n';
	for (const claimKey of claimKeys) {
		const qrURL = await qrcode.toDataURL(claimKey.url);
		const address = new Wallet(claimKey.key).address;
		csv += `false,${explorerLink}${address},${claimKey.key},${claimKey.amount},${claimKey.url},"${qrURL}"\n`;
	}
	await deployments.saveDotFile(`.claimKeys.csv`, csv);
}

// function wait(time: number): Promise<void> {
//   return new Promise<void>((resolve) => {
//     setTimeout(resolve, time * 1000);
//   });
// }

async function main() {
	// for (let i = 0; i < 107; i++) {
	//   console.log(`executing ${i} ... in 3s`);
	// await wait(3);
	await func(hre);
	// }
}

if (require.main === module) {
	main();
}
