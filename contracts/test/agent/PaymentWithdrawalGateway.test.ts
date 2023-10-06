import {parseEther} from '@ethersproject/units';
import {expect} from 'chai';
import {deployments, ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
import {PaymentGateway, PaymentWithdrawalGateway} from '../../typechain';
import {setupUsers} from '../../utils';
import {increaseTime, waitFor} from '../test-utils';
import {setupUser} from '../utils';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('PaymentWithdrawalGateway');
  const {agentService} = await getNamedAccounts();
  const unNamedAccounts = await getUnnamedAccounts();

  const contracts = {
    PaymentGateway: <PaymentGateway>await ethers.getContract('PaymentGateway'),
    PaymentWithdrawalGateway: <PaymentWithdrawalGateway>await ethers.getContract('PaymentWithdrawalGateway'),
  };

  const gatewayOwner = await contracts.PaymentWithdrawalGateway.owner();
  const players = await setupUsers(unNamedAccounts, contracts);
  return {
    ...contracts,
    players,
    agentServiceWallet: await setupUser(agentService, contracts),
    gatewayOwner: await setupUser(gatewayOwner, contracts),
    provider: ethers.provider,
  };
});

describe('PaymentWithdrawalGateway', function () {
  it('player can withdraw ETH via message and emit the corresponding event', async function () {
    const block = await ethers.provider.getBlock('latest');
    const timestamp = block.timestamp;
    const maxAmount = parseEther('1');
    const {players, PaymentGateway, agentServiceWallet} = await setup();
    await waitFor(players[0].signer.sendTransaction({to: PaymentGateway.address, value: maxAmount}));

    const amount = maxAmount;

    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp, players[0].address, maxAmount]
    );
    const dataHash = ethers.utils.keccak256(data);
    const signature = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash));

    await expect(
      players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount)
    )
      .to.emit(PaymentGateway, 'Payment')
      .withArgs(players[0].address, amount, true);
  });

  it('player cannot withdraw ETH via invalid message', async function () {
    const block = await ethers.provider.getBlock('latest');
    const timestamp = block.timestamp;
    const maxAmount = parseEther('1');
    const {players, PaymentGateway} = await setup();
    await waitFor(players[0].signer.sendTransaction({to: PaymentGateway.address, value: maxAmount}));

    const amount = maxAmount;

    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp, players[0].address, maxAmount]
    );
    const dataHash = ethers.utils.keccak256(data);
    const signature = await players[1].signer.signMessage(ethers.utils.arrayify(dataHash));

    await expect(
      players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount)
    ).to.be.revertedWith('UNAUTHORIZED_SIGNER');
  });

  it('player cannot withdraw ETH via same message', async function () {
    const block = await ethers.provider.getBlock('latest');
    const timestamp = block.timestamp;
    const maxAmount = parseEther('1');
    const {players, PaymentGateway, agentServiceWallet} = await setup();
    await waitFor(players[0].signer.sendTransaction({to: PaymentGateway.address, value: maxAmount}));

    const amount = maxAmount.div(2);

    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp, players[0].address, maxAmount]
    );
    const dataHash = ethers.utils.keccak256(data);
    const signature = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash));

    await players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount);

    await expect(
      players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount)
    ).to.be.revertedWith('INTERVAL_NOT_RESPECTED');
  });

  it('player can withdraw ETH twice past the interval', async function () {
    const block = await ethers.provider.getBlock('latest');
    const timestamp = block.timestamp;
    const maxAmount = parseEther('1');
    const {players, PaymentGateway, agentServiceWallet} = await setup();
    await waitFor(players[0].signer.sendTransaction({to: PaymentGateway.address, value: maxAmount}));

    const amount = maxAmount.div(2);

    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp, players[0].address, maxAmount]
    );
    const dataHash = ethers.utils.keccak256(data);
    const signature = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash));

    await players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount);

    await increaseTime(15 * 60 + 15 * 60);
    const block2 = await ethers.provider.getBlock('latest');
    const timestamp2 = block2.timestamp;

    const data2 = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp2, players[0].address, maxAmount]
    );
    const dataHash2 = ethers.utils.keccak256(data2);
    const signature2 = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash2));

    await expect(
      players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp2, signature2, amount)
    )
      .to.emit(PaymentGateway, 'Payment')
      .withArgs(players[0].address, amount, true);
  });

  it('player cannot withdraw ETH twice in the interval', async function () {
    const block = await ethers.provider.getBlock('latest');
    const timestamp = block.timestamp;
    const maxAmount = parseEther('1');
    const {players, PaymentGateway, agentServiceWallet} = await setup();
    await waitFor(players[0].signer.sendTransaction({to: PaymentGateway.address, value: maxAmount}));

    const amount = maxAmount.div(2);

    const data = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp, players[0].address, maxAmount]
    );
    const dataHash = ethers.utils.keccak256(data);
    const signature = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash));

    await players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp, signature, amount);

    await increaseTime(14 * 60);
    const block2 = await ethers.provider.getBlock('latest');
    const timestamp2 = block2.timestamp;

    const data2 = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'uint256'],
      [timestamp2, players[0].address, maxAmount]
    );
    const dataHash2 = ethers.utils.keccak256(data2);
    const signature2 = await agentServiceWallet.signer.signMessage(ethers.utils.arrayify(dataHash2));

    await expect(
      players[0].PaymentWithdrawalGateway.withdraw(players[0].address, maxAmount, timestamp2, signature2, amount)
    ).to.be.revertedWith('INTERVAL_NOT_RESPECTED');
  });

  it('gatewayOwner can change ownership of PaymentWithdrawalGateway', async function () {
    const {gatewayOwner, players, PaymentWithdrawalGateway} = await setup();
    await waitFor(gatewayOwner.PaymentWithdrawalGateway.transferOwnership(players[0].address));
    const newOwner = await PaymentWithdrawalGateway.owner();
    expect(newOwner).to.eq(players[0].address);
  });

  it('gatewayOwner can change ownership of PaymentGateway', async function () {
    const {gatewayOwner, players, PaymentGateway} = await setup();
    await waitFor(gatewayOwner.PaymentWithdrawalGateway.transferPaymentGatewayOwnership(players[0].address));
    const newOwner = await PaymentGateway.owner();
    expect(newOwner).to.eq(players[0].address);
  });

  it('random account cannot change ownership', async function () {
    const {players} = await setup();
    await expect(players[1].PaymentWithdrawalGateway.transferOwnership(players[0].address)).to.be.reverted;
  });
});
