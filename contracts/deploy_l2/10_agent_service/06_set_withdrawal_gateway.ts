import {deployScript} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const paymentWithdrwalGateway = env.get('PaymentWithdrawalGateway');
    const paymentGateway = env.get('PaymentGateway');

    const currentOwner = await env.read(paymentGateway, {
      functionName: 'owner',
      args: [],
    });
    // TODO ?
    // if (currentOwner.toLowerCase() !== paymentWithdrwalGateway.address.toLowerCase()) {
    //   await env.execute(
    //     paymentGateway,
    //     {
    //       account: currentOwner as `0x${string}`,
    //       functionName: 'transferOwnership',
    //       args: [paymentWithdrwalGateway.address],
    //     },
    //   );
    // }
  },
  {
    tags: ['PaymentWithdrawalGateway', 'PaymentGateway'],
    dependencies: ['PaymentGateway_deploy', 'PaymentWithdrawalGateway_deploy'],
  },
);