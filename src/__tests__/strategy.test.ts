import { getMockReq } from '@jest-mock/express';
import { SiweMessage } from 'siwe';

import Strategy, { VerifierFn } from '../strategy';

import { createAccount } from './accounts';
import { DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER } from './constants';
import { ChaiStrategyTest } from './harness';
import { createSignInMessage, signMessage } from './signing-helpers';

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
            message: 'invalid request body param "message"',
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
      const message = createSignInMessage();
      let test!: ChaiStrategyTest<Strategy>;

      beforeEach(() => {
        test = new ChaiStrategyTest(
          new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
        );
      });

      describe('when a string message is malformed', function () {
        it('fails with 422 Unprocessable Entity', async function () {
          const badAddress = message.address.toLowerCase(); // address is not EIP-55-compliant
          const badMessageString = message
            .prepareMessage()
            .replace(message.address, badAddress);

          test.fail = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message: badMessageString,
                signature: '0xdeadbeef',
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

      describe('when an object message is malformed', function () {
        it('fails with 422 Unprocessable Entity', async function () {
          const badAddress = message.address.toLowerCase(); // address is not EIP-55-compliant
          const badMessageObject: Partial<SiweMessage> = {
            ...message,
            address: badAddress,
          };

          test.fail = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message: badMessageObject,
                signature: '0xdeadbeef',
              },
            }),
          );

          expect(test.fail).toHaveBeenCalledWith(
            {
              message: 'Invalid address.',
            },
            422,
          );
        });
      });
    });

    describe('bad field values', function () {
      describe('wrong domain', function () {
        let test!: ChaiStrategyTest<Strategy>;

        beforeEach(() => {
          test = new ChaiStrategyTest(
            new Strategy(DEFAULT_STRATEGY_OPTIONS, DEFAULT_VERIFIER),
          );
        });

        const badMessage = createSignInMessage({ domain: 'evildomain.com' });

        it('fails with a 401 Unauthorized', async function () {
          const badMessageString = badMessage.prepareMessage();
          const signature = await signMessage(badMessageString);

          test.fail = jest.fn();

          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message: badMessageString,
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

      // TODO:
      // - nonce mismatch
      // - notBefore
      // - expirationTime
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
          const message = createSignInMessage({
            address: messageAddress,
          });
          const signature = await signMessage(message, messageSigner);

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

          const message = createSignInMessage();
          const signature = await signMessage(message);

          test.error = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message,
                signature,
              },
            }),
          );

          expect(verify).toHaveBeenCalledWith(message, expect.any(Function));
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

          const message = createSignInMessage();
          const signature = await signMessage(message);

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

          expect(verify).toHaveBeenCalledWith(message, expect.any(Function));
          expect(test.fail).toHaveBeenCalledWith(
            {
              passing: 'info',
              usedNonce: message.nonce,
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

          const message = createSignInMessage();
          const signature = await signMessage(message);

          test.success = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message,
                signature,
              },
            }),
          );

          expect(verify).toHaveBeenCalledWith(message, expect.any(Function));
          expect(test.success).toHaveBeenCalledWith(message.address, undefined);
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

          const message = createSignInMessage();
          const signature = await signMessage(message);

          test.success = jest.fn();
          await test.authenticate(
            getMockReq({
              method: 'POST',
              body: {
                message,
                signature,
              },
            }),
          );

          expect(verify).toHaveBeenCalledWith(message, expect.any(Function));
          expect(test.success).toHaveBeenCalledWith(message.address, {
            passing: 'info',
            usedNonce: message.nonce,
          });
        });
      });
    });
  });
});
