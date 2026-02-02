import {parseEther} from '@ethersproject/units';
import {SpaceInfo} from 'conquest-eth-common';
import {
	ethers,
	getUnnamedAccounts,
	deployments,
	getNamedAccounts,
} from 'hardhat';
import {AllianceRegistry, BasicAlliance, ConquestToken} from '../../typechain';
import {setupUsers} from '../../utils';

export const setup = deployments.createFixture(async () => {
	await deployments.fixture(); // TODO only OuterSpace
	const {claimKeyDistributor} = await getNamedAccounts();
	const unNamedAccounts = await getUnnamedAccounts();

	const distribution = [1000, 500, 3000, 100];
	for (let i = 0; i < distribution.length; i++) {
		const account = unNamedAccounts[i];
		const amount = distribution[i];
		await deployments.execute(
			'ConquestToken',
			{from: claimKeyDistributor, log: true, autoMine: true},
			'transfer',
			account,
			parseEther(amount.toString()),
		);
	}

	const contracts = {
		BasicAllianceFactory: <BasicAlliance>(
			await ethers.getContract('BasicAllianceFactory')
		),
		AllianceRegistry: <AllianceRegistry>(
			await ethers.getContract('AllianceRegistry')
		),
		OuterSpace: await ethers.getContract('OuterSpace'),
		ConquestToken: <ConquestToken>await ethers.getContract('ConquestToken'),
	};
	const OuterSpaceDeployment = await deployments.get('OuterSpace');
	const players = await setupUsers(unNamedAccounts, contracts);
	return {
		...contracts,
		players,
		spaceInfo: new SpaceInfo(OuterSpaceDeployment.linkedData),
		provider: ethers.provider,
	};
});
