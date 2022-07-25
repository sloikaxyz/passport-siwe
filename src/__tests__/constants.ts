import { StrategyOptions } from '~/strategy';

import { createAccount } from './accounts';

export const DEFAULT_DOMAIN = 'example.org';
export const DEFAULT_URI = 'https://example.org/';
export const DEFAULT_ADDRESS = createAccount().address;
export const DEFAULT_CHAIN_ID = 1;

export const DEFAULT_STRATEGY_OPTIONS: StrategyOptions = {
  domain: 'example.org',
  verify: (_message, _callback) => {
    // do nothing
  },
};
