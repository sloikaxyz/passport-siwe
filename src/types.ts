import type { Request } from 'express';
import { SiweMessage, VerifyOpts } from 'siwe';

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
  req: Request,
  siweMessage: SiweMessage,
  callback: VerifierCallbackFn,
) => void | Promise<void>;

interface StrategyOptionsBase {
  domain: string;
  provider?: VerifyOpts['provider'];
}

export interface StrategyOptionsWithoutRequestPassing
  extends StrategyOptionsBase {
  passReqToCallback?: false;
}

export interface StrategyOptionsWithRequestPassing extends StrategyOptionsBase {
  passReqToCallback: true;
}

export type StrategyOptions =
  | StrategyOptionsWithoutRequestPassing
  | StrategyOptionsWithRequestPassing;
