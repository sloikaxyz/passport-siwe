[@sloikaxyz/passport-siwe](README.md) / Exports

# @sloikaxyz/passport-siwe

## Table of contents

### Classes

- [default](classes/default.md)

### Interfaces

- [StrategyOptionsWithRequestPassing](interfaces/StrategyOptionsWithRequestPassing.md)
- [StrategyOptionsWithoutRequestPassing](interfaces/StrategyOptionsWithoutRequestPassing.md)

### Type Aliases

- [StrategyOptions](modules.md#strategyoptions)
- [VerifierCallbackFn](modules.md#verifiercallbackfn)
- [VerifierFn](modules.md#verifierfn)
- [VerifierFnWithRequest](modules.md#verifierfnwithrequest)

## Type Aliases

### StrategyOptions

Ƭ **StrategyOptions**: [`StrategyOptionsWithoutRequestPassing`](interfaces/StrategyOptionsWithoutRequestPassing.md) \| [`StrategyOptionsWithRequestPassing`](interfaces/StrategyOptionsWithRequestPassing.md)

#### Defined in

[src/types.ts:35](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/types.ts#L35)

___

### VerifierCallbackFn

Ƭ **VerifierCallbackFn**: (`err`: `Error` \| ``null``, `user`: `unknown`, `info?`: `unknown`) => `void`

#### Type declaration

▸ (`err`, `user`, `info?`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` \| ``null`` |
| `user` | `unknown` |
| `info?` | `unknown` |

##### Returns

`void`

#### Defined in

[src/types.ts:4](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/types.ts#L4)

___

### VerifierFn

Ƭ **VerifierFn**: (`message`: `SiweMessage`, `callback`: [`VerifierCallbackFn`](modules.md#verifiercallbackfn)) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`message`, `callback`): `void` \| `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `SiweMessage` |
| `callback` | [`VerifierCallbackFn`](modules.md#verifiercallbackfn) |

##### Returns

`void` \| `Promise`<`void`\>

#### Defined in

[src/types.ts:10](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/types.ts#L10)

___

### VerifierFnWithRequest

Ƭ **VerifierFnWithRequest**: (`req`: `Request`, `siweMessage`: `SiweMessage`, `callback`: [`VerifierCallbackFn`](modules.md#verifiercallbackfn)) => `void` \| `Promise`<`void`\>

#### Type declaration

▸ (`req`, `siweMessage`, `callback`): `void` \| `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `Request` |
| `siweMessage` | `SiweMessage` |
| `callback` | [`VerifierCallbackFn`](modules.md#verifiercallbackfn) |

##### Returns

`void` \| `Promise`<`void`\>

#### Defined in

[src/types.ts:15](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/types.ts#L15)
