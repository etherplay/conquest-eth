import {parseEther} from '@ethersproject/units';
import {expect} from 'chai';
import {
	deployments,
	ethers,
	getNamedAccounts,
	getUnnamedAccounts,
} from 'hardhat';
import {PaymentGateway} from '../../typechain';
import {setupUsers} from '../../utils';
import {waitFor} from '../test-utils';
import {setupUser} from '../utils';

const setup = deployments.createFixture(async () => {
	await deployments.fixture('PaymentGateway_deploy');
	const {agentService} = await getNamedAccounts();
	const unNamedAccounts = await getUnnamedAccounts();

	const contracts = {
		PaymentGateway: <PaymentGateway>await ethers.getContract('PaymentGateway'),
	};

	const gatewayOwner = await contracts.PaymentGateway.owner();
	const players = await setupUsers(unNamedAccounts, contracts);
	return {
		...contracts,
		players,
		agentServiceWallet: await setupUser(agentService, contracts),
		gatewayOwner: await setupUser(gatewayOwner, contracts),
		provider: ethers.provider,
	};
});

describe('PaymentGateway', function () {
	it('PaymentGateway can receive ETH and emit the corresponding event', async function () {
		const {players, PaymentGateway} = await setup();
		await expect(
			players[0].signer.sendTransaction({
				to: PaymentGateway.address,
				value: parseEther('1'),
			}),
		)
			.to.emit(PaymentGateway, 'Payment')
			.withArgs(players[0].address, parseEther('1'), false);
	});

	it('gatewayOwner can refund ETH and emit the corresponding event', async function () {
		const {gatewayOwner, players, PaymentGateway} = await setup();
		await waitFor(
			players[0].signer.sendTransaction({
				to: PaymentGateway.address,
				value: parseEther('1'),
			}),
		);
		await expect(
			gatewayOwner.PaymentGateway.withdrawForRefund(
				players[0].address,
				parseEther('1'),
			),
		)
			.to.emit(PaymentGateway, 'Payment')
			.withArgs(players[0].address, parseEther('1'), true);
	});

	it('random account cannot refund', async function () {
		const {players, PaymentGateway} = await setup();
		await waitFor(
			players[0].signer.sendTransaction({
				to: PaymentGateway.address,
				value: parseEther('1'),
			}),
		);
		await expect(
			players[1].PaymentGateway.withdrawForRefund(
				players[0].address,
				parseEther('2'),
			),
		).to.be.reverted;
	});

	it('gatewayOwner cannot refund ETH if not enough', async function () {
		const {gatewayOwner, players, PaymentGateway} = await setup();
		await waitFor(
			players[0].signer.sendTransaction({
				to: PaymentGateway.address,
				value: parseEther('1'),
			}),
		);
		await expect(
			gatewayOwner.PaymentGateway.withdrawForRefund(
				players[0].address,
				parseEther('2'),
			),
		).to.be.reverted;
	});

	it('gatewayOwner can change ownership', async function () {
		const {gatewayOwner, players, PaymentGateway} = await setup();
		await waitFor(
			gatewayOwner.PaymentGateway.transferOwnership(players[0].address),
		);
		const newOwner = await PaymentGateway.owner();
		expect(newOwner).to.eq(players[0].address);
	});

	it('random account cannot change ownership', async function () {
		const {players} = await setup();
		await expect(
			players[1].PaymentGateway.transferOwnership(players[0].address),
		).to.be.reverted;
	});
});
