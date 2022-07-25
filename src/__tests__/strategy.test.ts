import chai, { expect } from 'chai';
import ChaiPassportStrategy from 'chai-passport-strategy';
import sinon from 'sinon';
import SinonChai from 'sinon-chai';
import { SiweMessage } from 'siwe';

import Strategy, { VerifierCallbackFn } from '~/strategy';

import { createAccount, createSignInMessage, signMessage } from './accounts';
import { DEFAULT_ADDRESS, DEFAULT_STRATEGY_OPTIONS } from './constants';

chai.use(SinonChai);
chai.use(ChaiPassportStrategy);

describe('Strategy', function () {
  it('should be named ethereum', function () {
    const strategy = new Strategy(DEFAULT_STRATEGY_OPTIONS);

    expect(strategy.name).to.equal('siwe');
  });

  describe('options validation', function () {
    it('rejects a null options', function () {
      expect(
        () =>
          // @ts-expect-error -- options shouldn't be null
          new Strategy(null),
      ).to.throw(/invalid options object/);
    });

    it('rejects options without a domain', function () {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { domain: _domain, ...options } = DEFAULT_STRATEGY_OPTIONS;

      expect(
        () =>
          // @ts-expect-error -- domain is required
          new Strategy(options),
      ).to.throw(/invalid options object/);
    });

    it('rejects options without a verify function', function () {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { verify: _verify, ...options } = DEFAULT_STRATEGY_OPTIONS;

      expect(
        () =>
          // @ts-expect-error -- a verify function is required
          new Strategy(options),
      ).to.throw(/invalid options object/);
    });

    it('rejects a malformed provider', function () {
      const options = {
        ...DEFAULT_STRATEGY_OPTIONS,
        provider: null,
      };
      expect(
        () =>
          // @ts-expect-error -- a verify function is required
          new Strategy(options),
      ).to.throw(/invalid options object/);
    });

    it('accepts a rest-parameter verify function', function () {
      const options = {
        ...DEFAULT_STRATEGY_OPTIONS,
        verify: ([_, callback]: [SiweMessage, VerifierCallbackFn]) => {
          callback(null, {});
        },
      };

      expect(
        () =>
          // @ts-expect-error -- a verify function is required
          new Strategy(options),
      ).to.throw(/invalid options object/);
    });
  });

  describe('authenticate', function () {
    describe('request body validation', function () {
      it('errors on a request with a non-object body', function (done) {
        const errSpy = sinon.spy();
        const message = createSignInMessage().prepareMessage();

        chai.passport
          .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
          .request(function (req) {
            req.body = message;
          })
          .error(errSpy)
          .authenticate();

        expect(errSpy).to.have.been.calledWith(
          sinon.match
            .instanceOf(Error)
            .and(sinon.match.has('message', 'request body is not an object')),
        );

        done();
      });

      it('fails with Bad Request when the request has no message string', function (done) {
        const failSpy = sinon.spy();

        chai.passport
          .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
          .request(function (req) {
            req.body = { signature: '0xdeadbeef' };
          })
          .fail(failSpy)
          .authenticate();

        expect(failSpy).to.have.been.calledWith(
          {
            message: 'request body param "message" is not a string',
          },
          400,
        );

        done();
      });

      it('fails with Bad Request when the request has no signature string', function (done) {
        const failSpy = sinon.spy();
        const message = createSignInMessage().prepareMessage();

        chai.passport
          .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
          .request(function (req) {
            req.body = {
              message,
            };
          })
          .fail(failSpy)
          .authenticate();

        expect(failSpy).to.have.been.calledWith(
          {
            message: 'request body param "signature" is not a string',
          },
          400,
        );

        done();
      });
    });

    describe('malformed message handling', function () {
      describe('when a string message is malformed', function () {
        it('fails with 422 Unprocessable Entity', function (done) {
          const failSpy = sinon.spy();

          const badDefaultAddress = DEFAULT_ADDRESS.toLowerCase();
          const message = createSignInMessage()
            .prepareMessage()
            .replace(DEFAULT_ADDRESS, badDefaultAddress);

          chai.passport
            .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
            .request(function (req) {
              req.body = {
                message,
                signature: '0xdeadbeef',
              };
            })
            .fail(failSpy)
            .authenticate();

          expect(failSpy).to.have.been.calledWith(
            {
              message: 'Address not conformant to EIP-55.',
            },
            422,
          );

          done();
        });
      });

      describe('when an object message is malformed', function () {
        it('fails with 422 Unprocessable Entity', function (done) {
          const failSpy = sinon.spy();

          const badDefaultAddress = DEFAULT_ADDRESS.toLowerCase();
          const message = createSignInMessage();
          message.address = badDefaultAddress;
          const messageJson = JSON.stringify(message);

          chai.passport
            .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
            .request(function (req) {
              req.body = {
                message: JSON.parse(messageJson) as Record<string, unknown>,
                signature: '0xdeadbeef',
              };
            })
            .fail(failSpy)
            .authenticate();

          expect(failSpy).to.have.been.calledWith(
            {
              message: 'Invalid address.',
            },
            422,
          );

          done();
        });
      });
    });

    describe('expected values mismatch', function () {
      describe('wrong domain', function () {
        it('fails with a 401 Unauthorized', async function () {
          const failSpy = sinon.spy();

          const message = createSignInMessage();
          const messageString = message
            .prepareMessage()
            .replace(message.domain, 'evildomain.com');

          const signature = await signMessage(messageString);

          await new Promise<void>(function (resolve) {
            chai.passport
              .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
              .request(function (req) {
                req.body = {
                  message: messageString,
                  signature,
                };
              })
              .fail((...args: Parameters<Strategy['fail']>) => {
                failSpy(...args);
                resolve();
              })
              .authenticate();
          });

          expect(failSpy).to.have.been.calledWith(
            {
              message: 'Domain do not match provided domain for verification.',
            },
            401,
          );
        });
      });

      // TODO: nonce mismatch
    });

    describe('signature verification', function () {
      describe('when the message signer differs from the message address', function () {
        it('fails with a 401 Unauthorized', async function () {
          const failSpy = sinon.spy();
          const messageAddress = createAccount().address;
          const messageSigner = createAccount();
          const message = createSignInMessage({
            address: messageAddress,
          });
          const signature = await signMessage(message, messageSigner);

          await new Promise<void>((resolve) => {
            chai.passport
              .use(new Strategy(DEFAULT_STRATEGY_OPTIONS))
              .request(function (req) {
                req.body = {
                  message,
                  signature,
                };
              })
              .fail((...args: Parameters<Strategy['fail']>) => {
                failSpy(...args);
                resolve();
              })
              .authenticate();
          });

          expect(failSpy).to.have.been.calledWith(
            {
              message: 'Signature do not match address of the message.',
            },
            401,
          );
        });
      });
    });

    describe('given a valid message-signature pair', function () {
      it('calls the verify callback with the message', async function () {
        const successSpy = sinon.spy();

        const message = createSignInMessage();
        const messageJson = JSON.stringify(message);
        const signature = await signMessage(message);

        await new Promise<void>((resolve) => {
          const verify = sinon.spy(function (
            verifiedMessage: SiweMessage,
            callback: VerifierCallbackFn,
          ) {
            expect(JSON.parse(JSON.stringify(verifiedMessage))).to.eq(
              JSON.parse(JSON.stringify(message)),
            );

            callback(null, null);
            resolve();
          });

          chai.passport
            .use(
              new Strategy({
                ...DEFAULT_STRATEGY_OPTIONS,
                verify,
              }),
            )
            .request(function (req) {
              req.body = {
                message: JSON.parse(messageJson) as Record<string, unknown>,
                signature,
              };
            })
            .success(successSpy)
            .authenticate();
        });

        expect(successSpy).to.have.been.calledWith(
          {
            message: 'Signature do not match address of the message.',
          },
          401,
        );
      });
    });
  });
});
