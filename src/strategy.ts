import { ethers } from 'ethers';
import express from 'express';
import { Strategy as AbstractStrategy } from 'passport-strategy';
import { SiweError, SiweMessage, VerifyOpts } from 'siwe';

const HTTP_CODE_UNAUTHORIZED = 401;
const HTTP_CODE_BAD_REQUEST = 400;
const HTTP_CODE_UNPROCESSABLE_ENTITY = 422;

export type VerifierCallbackFn = (
  err: Error | null,
  user: unknown,
  info?: unknown,
) => void;

export type VerifierFn = (
  message: SiweMessage,
  callback: VerifierCallbackFn,
) => void | Promise<void>;

export type VerifierFnWithRequest = (
  req: express.Request,
  siweMessage: SiweMessage,
  callback: VerifierCallbackFn,
) => void | Promise<void>;

export type StrategyOptions = {
  domain: string;
  provider?: VerifyOpts['provider'];
} & (
  | {
      passReqToCallback: true;
      verify: VerifierFnWithRequest;
    }
  | {
      passReqToCallback?: false;
      verify: VerifierFn;
    }
);

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
      ethers.providers.Provider.isProvider(value.provider)) &&
    // verify must be a function...
    (typeof value.verify === 'function'
      ? // with no parameters or a rest parameter :shrugmoji:
        value.verify.length === 0 ||
        // or with 3 arguments if `passReqToCallback` is true, otherwise it must be a function with 2 arguments
        (value.passReqToCallback
          ? value.verify.length === 3
          : value.verify.length === 2)
      : false)
  );
}

export default class Strategy extends AbstractStrategy {
  name = 'siwe';

  constructor(private options: StrategyOptions) {
    super();

    if (!isStrategyOptions(options)) {
      throw new Error('invalid options object');
    }
  }

  authenticate(req: express.Request, _options?: unknown): void {
    const body = req.body as unknown;
    if (!isRecord(body)) {
      return this.error(new Error('request body is not an object'));
    }

    const { message, signature } = body;
    if (typeof message !== 'string' && !isRecord(message)) {
      return this.fail(
        {
          message: 'invalid request body param "message"',
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
          void this.options.verify(req, data, callback);
        } else {
          void this.options.verify(data, callback);
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
