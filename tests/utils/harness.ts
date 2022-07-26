import express from 'express';
import { Strategy } from 'passport-strategy';

export class ChaiStrategyTest<TStrategy extends Strategy> {
  public success: Strategy['success'] | undefined;
  public fail: Strategy['fail'] | undefined;
  public redirect: Strategy['redirect'] | undefined;
  public pass: Strategy['pass'] | undefined;
  public error: Strategy['error'] | undefined;

  constructor(private strategy: TStrategy) {}

  authenticate(req: express.Request, options?: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const strategy = Object.create(this.strategy) as TStrategy;

      // Extend the instance with action functions.
      strategy.success = (...args) => {
        if (!this.success) {
          return reject('Strategy#success should not be called');
        }

        this.success.apply(req, args);
        resolve();
      };

      // @ts-expect-error -- something's broken in @types/passport-strategy
      strategy.fail = (...args) => {
        if (!this.fail) {
          return reject('Strategy#fail should not be called');
        }

        // @ts-expect-error -- something's broken in @types/passport-strategy
        this.fail.apply(req, args);
        resolve();
      };

      strategy.redirect = (...args) => {
        if (!this.redirect) {
          return reject('Strategy#redirect should not be called');
        }

        this.redirect.apply(req, args);
        resolve();
      };

      strategy.pass = () => {
        if (!this.pass) {
          return reject('Strategy#pass should not be called');
        }

        this.pass.apply(req);
        resolve();
      };

      strategy.error = (...args) => {
        if (!this.error) {
          // If there's no error handler set, re-throw the error to aid in debugging.
          const [err] = args;
          throw err;
        }

        this.error.apply(req, args);
        resolve();
      };

      strategy.authenticate(req, options);
    });
  }
}
