import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {ethers} from 'hardhat';
import {Wallet} from 'ethers';
import 'isomorphic-fetch';
import {parseEther} from '@ethersproject/units';
import {get} from './utils';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {getUnnamedAccounts} = hre;
	const players = await getUnnamedAccounts();
	const player = players[0];

	await get('account/' + player);
}
if (require.main === module) {
	func(hre);
}
