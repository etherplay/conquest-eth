import {deployments, ethers, getUnnamedAccounts} from 'hardhat';
import {TestConversion} from '../../typechain/TestConversion';
import {expect} from '../chai-setup';
import {objMap} from '../test-utils';
import {setupUsers} from '../../utils';
import {convertPlanetCallData} from './utils';

const setup = deployments.createFixture(async () => {
  const unNamedAccounts = await getUnnamedAccounts();
  await deployments.deploy('TestConversion', {from: unNamedAccounts[0]});
  const contracts = {
    TestConversion: <TestConversion>await ethers.getContract('TestConversion'),
  };
  const players = await setupUsers(unNamedAccounts, contracts);
  return {
    ...contracts,
    players,
    provider: ethers.provider,
  };
});

describe('conversion solidity', function () {
  it('conversion', async function () {
    const {TestConversion} = await setup();
    await TestConversion.testConversion('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000000000000000000000000000');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x0000000000000000000000000000000000000000000000000000000000000000');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x0000000000000000000000000000000000000000000000000000000000000001');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE');
    console.log('-----------------------------------------');
    await TestConversion.testConversion('0x000FFFFFFFFFFFFFFFFFFFFFFFFFFFFE0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE');
  });
});
