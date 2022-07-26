import { getMockReq } from '@jest-mock/express';
import invariant from 'ts-invariant';

import Strategy, { VerifierFn } from '../src';

import { createAccount } from './utils/accounts';
import { DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER } from './utils/constants';
import { ChaiStrategyTest } from './utils/harness';
import {
  createSignInMessage,
  createSignInPayload,
} from './utils/signing-helpers';

describe('Strategy', function () {
  it('should be named ethereum', function () {
    const strategy = new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER);

    expect(strategy.name).toBe('siwe');
  });

  describe('options validation', function () {
    it('rejects a null options', function () {
      expect(
        () =>
          // @ts-expect-error -- options shouldn't be null
          new Strategy(null, DEFAULT_VERIFIER),
      ).toThrow(/invalid options object/);
    });

    it('rejects options without a domain', function () {
      expect(
        () =>
          // @ts-expect-error -- domain is required
          new Strategy({}, DEFAULT_VERIFIER),
      ).toThrow(/invalid options object/);
    });

    it('rejects a null verify function', function () {
      expect(
        () =>
          // @ts-expect-error -- a verify function is required
          new Strategy(DEFAULT_STRATEGY_OPTIONS, null),
      ).toThrow(/verify is not a function/);
    });

    it('rejects a malformed provider', function () {
      const options = {
        ...DEFAULT_STRATEGY_OPTIONS,
        provider: null,
      };

      expect(
        () =>
          // @ts-expect-error -- provider type incompatible
          new Strategy(options, DEFAULT_VERIFIER),
      ).toThrow(/invalid options object/);
    });
  });

  describe('authenticate', function () {
    describe('request body validation', function () {
      const message = createSignInMessage();
      let test!: ChaiStrategyTest<Strategy>;

      beforeEach(() => {
        test = new ChaiStrategyTest(
          new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
        );
      });

      it('errors on a request with a non-object body', async function () {
        test.error = jest.fn();

        await test.authenticate(
          getMockReq({
            method: 'POST',
            body: message.prepareMessage(),
          }),
        );

        expect(test.error).toHaveBeenCalledWith(
          new Error('request body is not an object'),
        );
      });

      it('fails with Bad Request when the request has no message property', async function () {
        test.fail = jest.fn();

        await test.authenticate(
          getMockReq({
            method: 'POST',
            body: { signature: '0xdeadbeef' },
          }),
        );

        expect(test.fail).toHaveBeenCalledWith(
          {
            message: 'request body param "message" is not a string',
          },
          400,
        );
      });

      it('fails with Bad Request when the request has no signature property', async function () {
        test.fail = jest.fn();

        await test.authenticate(
          getMockReq({
            method: 'POST',
            body: { message: message.prepareMessage() },
          }),
        );

        expect(test.fail).toHaveBeenCalledWith(
          {
            message: 'request body param "signature" is not a string',
          },
          400,
        );
      });
    });

    describe('malformed message handling', function () {
      let test!: ChaiStrategyTest<Strategy>;

      beforeEach(() => {
        test = new ChaiStrategyTest(
          new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
        );
      });

      it('fails with 422 Unprocessable Entity', async function () {
        const { message, signature, siweMessage } = await createSignInPayload();

        const badAddress = siweMessage.address.toLowerCase(); // address is not EIP-55-compliant
        const badMessage = message.replace(siweMessage.address, badAddress);

        test.fail = jest.fn();
        await test.authenticate(
          getMockReq({
            method: 'POST',
            body: {
              message: badMessage,
              signature,
            },
          }),
        );

        expect(test.fail).toHaveBeenCalledWith(
          {
            message: 'Address not conformant to EIP-55.',
          },
          422,
        );
      });
    });

    describe('bad field values', function () {
      describe('when the message specifies the wrong domain', function () {
        let test!: ChaiStrategyTest<Strategy>;
        beforeEach(() => {
          test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
          );
        });

        it('fails with a 401 Unauthorized', async function () {
          const BAD_DOMAIN = 'evildomain.com';
          invariant(BAD_DOMAIN !== DEFAULT_STRATEGY_OPTIONS.domain);

          const { message, signature } = await createSignInPayload({
            domain: BAD_DOMAIN,
          });

          test.fail = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message,
                signature,
              },
            }),
          );

          expect(test.fail).toHaveBeenCalledWith(
            {
              message: 'Domain do not match provided domain for verification.',
            },
            401,
          );
        });
      });

      describe('when the message is expired', function () {
        let test!: ChaiStrategyTest<Strategy>;
        beforeEach(() => {
          test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
          );
        });

        it('fails with a 401 Unauthorized and an appropriate message', async function () {
          const { message, signature } = await createSignInPayload({
            expirationTime: '2020-03-17T00:00:00Z',
          });

          test.fail = jest.fn();

          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: { message, signature },
            }),
          );

          expect(test.fail).toHaveBeenCalledWith(
            {
              message: 'Expired message.',
            },
            401,
          );
        });
      });

      describe('when the message is not yet valid', function () {
        let test!: ChaiStrategyTest<Strategy>;
        beforeEach(() => {
          test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
          );
        });

        it('fails with a 401 Unauthorized and an appropriate message', async function () {
          const { message, signature } = await createSignInPayload({
            notBefore: new Date(Date.now() + 3600_000).toISOString(),
          });

          test.fail = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message,
                signature,
              },
            }),
          );

          expect(test.fail).toHaveBeenCalledWith(
            {
              message: 'Message is not valid yet.',
            },
            401,
          );
        });
      });

      // TODO:
      // - nonce mismatch
    });

    describe('signature verification', function () {
      describe('when the message signer differs from the message address', function () {
        let test!: ChaiStrategyTest<Strategy>;

        beforeEach(() => {
          test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
          );
        });

        it('fails with a 401 Unauthorized', async function () {
          const messageAddress = createAccount().address;
          const messageSigner = createAccount();

          const { message, signature } = await createSignInPayload(
            {
              address: messageAddress,
            },
            messageSigner,
          );

          test.fail = jest.fn();

          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: { message, signature },
            }),
          );

          expect(test.fail).toHaveBeenCalledWith(
            {
              message: 'Signature do not match address of the message.',
            },
            401,
          );
        });
      });
    });

    describe('given a valid message-signature pair', function () {
      describe('when verify callback returns an error', function () {
        it('calls the error callback', async function () {
          const verify = jest.fn<void, Parameters<VerifierFn>>(
            (_message, callback) => {
              callback(new Error('test error'), null);
            },
          );

          const test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, verify),
          );

          const { siweMessage, ...body } = await createSignInPayload();

          test.error = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body,
            }),
          );

          expect(verify).toHaveBeenCalledWith(
            siweMessage,
            expect.any(Function),
          );
          expect(test.error).toHaveBeenCalledWith(new Error('test error'));
        });
      });

      describe('when verify callback returns no error and no user', function () {
        it('calls the fail callback with info and 401 Unauthorized', async function () {
          const verify = jest.fn<void, Parameters<VerifierFn>>(
            (message, callback) => {
              callback(null, null, {
                passing: 'info',
                usedNonce: message.nonce,
              });
            },
          );

          const test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, verify),
          );

          const { siweMessage, ...body } = await createSignInPayload();

          test.fail = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body,
            }),
          );

          expect(verify).toHaveBeenCalledWith(
            siweMessage,
            expect.any(Function),
          );
          expect(test.fail).toHaveBeenCalledWith(
            {
              passing: 'info',
              usedNonce: siweMessage.nonce,
            },
            401,
          );
        });
      });

      describe('when verify callback returns a user', function () {
        it('forwards user and info to the success callback', async function () {
          const verify = jest.fn<void, Parameters<VerifierFn>>(
            (message, callback) => {
              callback(null, message.address);
            },
          );

          const test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, verify),
          );

          const { siweMessage, ...body } = await createSignInPayload();

          test.success = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body,
            }),
          );

          expect(verify).toHaveBeenCalledWith(
            siweMessage,
            expect.any(Function),
          );
          expect(test.success).toHaveBeenCalledWith(
            siweMessage.address,
            undefined,
          );
        });

        it('forwards user and info to the success callback', async function () {
          const verify = jest.fn<void, Parameters<VerifierFn>>(
            (message, callback) => {
              callback(null, message.address, {
                passing: 'info',
                usedNonce: message.nonce,
              });
            },
          );

          const test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, verify),
          );

          const { siweMessage, ...body } = await createSignInPayload();

          test.success = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body,
            }),
          );

          expect(verify).toHaveBeenCalledWith(
            siweMessage,
            expect.any(Function),
          );
          expect(test.success).toHaveBeenCalledWith(siweMessage.address, {
            passing: 'info',
            usedNonce: siweMessage.nonce,
          });
        });
      });
    });
  });
});
