@sloikaxyz/passport-siwe / [Exports](modules.md)

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)

# @sloikaxyz/passport-siwe

Sign in with Ethereum and Passport

`@sloikaxyz/passport-siwe` provides a [Passport](https://passportjs.org) authentication strategy
for [Sign in with Ethereum.](https://login.xyz)

This module can be used with Express, Nest.js, [Fastify](https://github.com/fastify/fastify)
(via `@fastify/passport`), or any other framework that supports Connect-style middleware.
## Usage

### Client-facing API

The strategy expects the request body to contain an object with keys `message` — a plaintext message conforming to the [EIP-4361 spec](https://eips.ethereum.org/EIPS/eip-4361#specification), and `signature` — the signature over the message, represented as a hex string. For an example of how to generate this on frontend, see [siwe usage examples](https://github.com/spruceid/siwe#quickstart-examples).

### Configuring the strategy

```typescript
import Strategy from '@sloikaxyz/passport-siwe';
import { SiweMessage } from 'siwe';

passport.use(
  new Strategy(
    {
      domain: 'example.org', // authentication domain, required
    },
    function (
      message: SiweMessage,
      callback: (
        err: Error | null,
        user: unknown,
        info?: unknown,
      ) => void,
    ) {
      // The callback is invoked if the message is valid, i.e.:
      // - the authentication domain matches,
      // - the message is in effect (see "Expiration Time" and "Not Before"),
      // - the signature provided in the request is valid.
      //
      // NOTE: Nonce is not validated by the strategy — it's up to you to implement that.
      //
      // Use `message.address` — an EIP-55 checksummed address — to determine the user.
      //
      // Call...
      // - callback(null, user) to sign the user in
      // - callback(null, null) to fail this authentication attempt
      // - callback(err, null) to signal that a server-side error has occurred while processing this request
    },
  ),
);
```

### Accessing the request object

```typescript
import Strategy from '@sloikaxyz/passport-siwe';
import express from 'express';
import { SiweMessage } from 'siwe';

passport.use(
  new Strategy(
    {
      domain: 'example.org',
      passReqToCallback: true, // pass the request as the first argument of the callback
    },
    function (
      req: express.Request, // an express-style request object
      message: SiweMessage,
      callback: (
        err: Error | null,
        user: unknown,
        info?: unknown,
      ) => void,
    ) {
      // See "Basic usage" for discussion of the callback.
    },
  ),
);
```

## Installation

Install my-project with npm

```bash
  npm install @sloikaxyz/passport-siwe siwe@^2.0.5 ethers@^5.6.8
  # or
  yarn add @sloikaxyz/passport-siwe siwe@^2.0.5 ethers@^5.6.8
```

## Roadmap

- Nonce verification support

## Contributing

Contributions are always welcome!

Quick steps:
1. Fork and clone the repo.
2. Make changes to the strategy as necessary — you can run `yarn test:watch` while developing.
3. Commit the changes and run `yarn test:ci` to verify the tests pass.
4. Send a PR :)
## Acknowledgements

 - [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361), the spec
 - [siwe](https://github.com/spruceid/siwe), the Sign in with Ethereum library that does most of the heavy-lifting here
 - [Passport](https://passportjs.org), the Node.js authentication library
 - [passport-ethereum](https://github.com/jaredhanson/passport-ethereum/), a `siwe@1.x` Passport strategy from the author of Passport

## License

MIT License

Copyright (c) 2022 Sloika Industries, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
