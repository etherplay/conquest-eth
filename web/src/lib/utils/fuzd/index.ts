import {FUZD_URI, chainId} from '$lib/config';
import {createClient} from 'fuzd-client';
import type {FuzdClient} from 'fuzd-client';

// ------------------------------------------------------------------------------------------------
// TODO remove and import from fuzd-client
// ------------------------------------------------------------------------------------------------
export type DerivationParameters = {
  type: string;
  data: any;
};

export type RemoteAccountInfo = {
  derivationParameters: DerivationParameters;
  address: `0x${string}`;
};
// ------------------------------------------------------------------------------------------------

export function createFuzdClient(privateKey: `0x${string}`): FuzdClient {
  return createClient({
    privateKey,
    schedulerEndPoint: FUZD_URI,
  });
}

export function getRemoteAccount(privateKey: `0x${string}`): Promise<RemoteAccountInfo> {
  const client = createClient({
    privateKey,
    schedulerEndPoint: FUZD_URI,
  });

  return client.assignRemoteAccount(chainId);
}
