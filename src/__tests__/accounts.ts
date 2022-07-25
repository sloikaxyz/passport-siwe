import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';

import {
  DEFAULT_ADDRESS,
  DEFAULT_CHAIN_ID,
  DEFAULT_DOMAIN,
  DEFAULT_URI,
} from './constants';

const accounts = new Map();
export function createAccount(): ethers.Wallet {
  const wallet = ethers.Wallet.createRandom();
  accounts.set(wallet.address, wallet);

  return wallet;
}

export function getAccount(address: string): ethers.Wallet {
  return accounts.get(address);
}

export function createSignInMessage(
  message: Partial<SiweMessage> = {},
): SiweMessage {
  message.domain ??= DEFAULT_DOMAIN;
  message.address ??= DEFAULT_ADDRESS;
  message.uri ??= DEFAULT_URI;
  message.version ??= '1';
  message.chainId ??= DEFAULT_CHAIN_ID;
  message.nonce ??= generateNonce();

  return new SiweMessage(message);
}

export function signMessage(
  message: string | SiweMessage,
  signer?: ethers.Signer,
): Promise<string> {
  if (!signer) {
    const signerAddressFromMessage =
      typeof message === 'string'
        ? new SiweMessage(message).address
        : message.address;
    signer = getAccount(signerAddressFromMessage);
  }

  if (typeof message === 'string') {
    return signer.signMessage(message);
  }

  return signer.signMessage(message.prepareMessage());
}
