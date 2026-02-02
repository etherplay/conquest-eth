import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {zeroAddress} from 'viem';

export default deployScript(
  async (env) => {
    const {deployer, agentService} = env.namedAccounts;

    const paymentGateway = env.get('PaymentGateway');

    const withdrawalSigner = agentService || zeroAddress;
    const expiryInSeconds = 15n * 60n;
    const extraIntervalInSeconds = 15n * 60n;

    const linkedData = {
      expiryInSeconds,
      extraIntervalInSeconds,
    };

    await env.deploy('PaymentWithdrawalGateway', {
      account: deployer as `0x${string}`,
      artifact: artifacts.PaymentWithdrawalGateway,
      args: [deployer, paymentGateway.address, withdrawalSigner, expiryInSeconds, extraIntervalInSeconds],
    });
  },
  {
    tags: ['PaymentWithdrawalGateway', 'PaymentWithdrawalGateway_deploy'],
    dependencies: ['PaymentGateway_deploy'],
  },
);