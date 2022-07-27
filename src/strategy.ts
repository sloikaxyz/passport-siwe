import { ethers } from 'ethers';
import type { Request } from 'express';
import { Strategy as AbstractStrategy } from 'passport-strategy';
import { SiweError, SiweMessage } from 'siwe';

import {
  HTTP_CODE_BAD_REQUEST,
  HTTP_CODE_UNAUTHORIZED,
  HTTP_CODE_UNPROCESSABLE_ENTITY,
} from './constants';
import {
  StrategyOptions,
  StrategyOptionsWithoutRequestPassing,
  StrategyOptionsWithRequestPassing,
  VerifierCallbackFn,
  VerifierFn,
  VerifierFnWithRequest,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStrategyOptions(value: unknown): value is StrategyOptions {
  return (
    // options must be a non-null object
    isRecord(value) &&
    // the domain is required
    typeof value.domain === 'string' &&
    // provider is optional, but must be an ethers provider if it is provided
    (typeof value.provider === 'undefined' ||
      ethers.providers.Provider.isProvider(value.provider))
  );
}

function isValidVerifierForConfig(
  verify: VerifierFn | VerifierFnWithRequest,
  passReqToCallback = false,
) {
  // verify must be a function...
  return typeof verify === 'function'
    ? // with no parameters or a rest parameter :shrugmoji:
      verify.length === 0 ||
        // or with 3 arguments if `passReqToCallback` is true, otherwise it must be a function with 2 arguments
        (passReqToCallback ? verify.length === 3 : verify.length === 2)
    : false;
}

export default class Strategy extends AbstractStrategy {
  name = 'siwe';

  private options: StrategyOptions;
  private verify: VerifierFn | VerifierFnWithRequest;

  public constructor(
    options: StrategyOptionsWithoutRequestPassing,
    verify: VerifierFn,
  );
  public constructor(
    options: StrategyOptionsWithRequestPassing,
    verify: VerifierFnWithRequest,
  );

  constructor(
    options:
      | StrategyOptionsWithoutRequestPassing
      | StrategyOptionsWithRequestPassing,
    verify: VerifierFn | VerifierFnWithRequest,
  ) {
    super();

    if (!isStrategyOptions(options)) {
      throw new Error('invalid options object');
    }

    if (typeof verify !== 'function') {
      throw new Error('verify is not a function');
    }

    if (!isValidVerifierForConfig(verify, options.passReqToCallback)) {
      throw new Error(
        `invalid verify function for passReqToCallback=${String(
          options.passReqToCallback,
        )}`,
      );
    }

    this.options = options;
    this.verify = verify;
  }

  authenticate(req: Request, _options?: unknown): void {
    const body = req.body as unknown;
    if (!isRecord(body)) {
      return this.error(new Error('request body is not an object'));
    }

    const { message, signature } = body;
    if (typeof message !== 'string') {
      return this.fail(
        {
          message: 'request body param "message" is not a string',
        },
        HTTP_CODE_BAD_REQUEST,
      );
    }
    if (typeof signature !== 'string') {
      return this.fail(
        {
          message: 'request body param "signature" is not a string',
        },
        HTTP_CODE_BAD_REQUEST,
      );
    }

    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(message);
    } catch (err) {
      // SiweMessage constructor throws a SiweError an object-type message is invalid
      // https://github.com/spruceid/siwe/blob/23f7e17163ea15456b4afed3c28fb091b39feee3/packages/siwe/lib/client.ts#L352
      if (err instanceof SiweError) {
        return this.fail({ message: err.type }, HTTP_CODE_UNPROCESSABLE_ENTITY);
      }

      // SiweMessage constructor throws a generic Error if string message syntax is invalid
      // https://github.com/spruceid/siwe/blob/23f7e17163ea15456b4afed3c28fb091b39feee3/packages/siwe-parser/lib/abnf.ts#L327
      // the string message is parsed using the grammar defined in here:
      // https://github.com/spruceid/siwe/blob/23f7e17163ea15456b4afed3c28fb091b39feee3/packages/siwe-parser/lib/abnf.ts#L23)
      if (err instanceof Error) {
        return this.fail(
          { message: err.message },
          HTTP_CODE_UNPROCESSABLE_ENTITY,
        );
      }

      return this.error(
        new Error(
          `SiweMessage constructor threw an unexpected error: ${String(err)}`,
        ),
      );
    }

    void siweMessage
      .verify(
        {
          signature,
          domain: this.options.domain,
        },
        {
          provider: this.options.provider,
          suppressExceptions: true,
        },
      )
      .then((siweResponse) => {
        if (!siweResponse.success && !siweResponse.error) {
          return this.error(
            new Error(
              'siweResponse.success is false but no error was specified',
            ),
          );
        }

        if (siweResponse.error) {
          const { error } = siweResponse;
          return this.fail({ message: error.type }, HTTP_CODE_UNAUTHORIZED);
        }

        const { data } = siweResponse;

        const callback: VerifierCallbackFn = (err, user, info) => {
          if (err) {
            return this.error(err);
          }

          if (!user) {
            return this.fail(info, HTTP_CODE_UNAUTHORIZED);
          }

          this.success(user, info);
        };

        if (this.options.passReqToCallback) {
          void (this.verify as VerifierFnWithRequest)(req, data, callback);
        } else {
          void (this.verify as VerifierFn)(data, callback);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          return this.error(err);
        }

        if (typeof err === 'string') {
          return this.error(new Error(err));
        }

        return this.error(
          new Error(
            `SiweMessage.verify rejected the promise with an unknown error: ${String(
              err,
            )}`,
          ),
        );
      });
  }
}
