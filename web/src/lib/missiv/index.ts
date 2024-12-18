import {publicKeyAuthorizationMessage, setup} from 'missiv-client';
import {derived, writable} from 'svelte/store';
import {privateWallet} from '$lib/account/privateWallet';
import {missivDomain, missivNamespace} from '$lib/config';
import {computePublicKey} from '@ethersproject/signing-key';
import {wallet} from '$lib/blockchain/wallet';
import claimFlow from '$lib/flows/claim';
import {MISSIV_URI} from '$lib/config';

export const openConversations = writable({
  open: false,
});

export const conversations = setup(
  MISSIV_URI
    ? {
        endpoint: MISSIV_URI,
        domain: missivDomain,
        namespace: missivNamespace,
      }
    : undefined
);

privateWallet.subscribe(($privateWallet) => {
  console.log({privateWallet: $privateWallet});
  conversations.setCurrentUser(
    $privateWallet.ownerAddress && $privateWallet.missivPrivateKey
      ? {
          address: $privateWallet.ownerAddress.toLowerCase(),
          delegatePrivateKey: $privateWallet.missivPrivateKey.slice(2),
        }
      : undefined
  );
});

if (typeof window !== 'undefined') {
  (window as any).conversations = conversations;
  (window as any).openConversations = openConversations;
}

export async function setMissivProfile(profile: {domainDescription?: string}, alreadyRegistered: boolean) {
  const privateState = privateWallet.getState();

  if (alreadyRegistered) {
    await conversations.editUser({
      domainDescription: profile.domainDescription,
    });
  } else {
    const publicKey = computePublicKey(privateState.missivPrivateKey, true);
    const signature = await wallet.provider
      .getSigner()
      .signMessage(publicKeyAuthorizationMessage({address: privateState.ownerAddress, publicKey}));

    await conversations.register(signature, {
      domainDescription: profile.domainDescription,
    });
    if (profile.domainDescription) {
      claimFlow.acknowledgeProfileSuggestion();
    }
  }
}
