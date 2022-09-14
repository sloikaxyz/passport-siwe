[@sloikaxyz/passport-siwe](../README.md) / [Exports](../modules.md) / default

# Class: default

## Hierarchy

- `Strategy`

  ↳ **`default`**

## Table of contents

### Constructors

- [constructor](default.md#constructor)

### Properties

- [name](default.md#name)
- [options](default.md#options)
- [verify](default.md#verify)

### Methods

- [authenticate](default.md#authenticate)
- [error](default.md#error)
- [fail](default.md#fail)
- [pass](default.md#pass)
- [redirect](default.md#redirect)
- [success](default.md#success)

## Constructors

### constructor

• **new default**(`options`, `verify`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`StrategyOptionsWithoutRequestPassing`](../interfaces/StrategyOptionsWithoutRequestPassing.md) |
| `verify` | [`VerifierFn`](../modules.md#verifierfn) |

#### Overrides

AbstractStrategy.constructor

#### Defined in

[src/strategy.ts:55](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L55)

• **new default**(`options`, `verify`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`StrategyOptionsWithRequestPassing`](../interfaces/StrategyOptionsWithRequestPassing.md) |
| `verify` | [`VerifierFnWithRequest`](../modules.md#verifierfnwithrequest) |

#### Overrides

AbstractStrategy.constructor

#### Defined in

[src/strategy.ts:59](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L59)

## Properties

### name

• **name**: `string` = `'siwe'`

#### Defined in

[src/strategy.ts:50](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L50)

___

### options

• `Private` **options**: [`StrategyOptions`](../modules.md#strategyoptions)

#### Defined in

[src/strategy.ts:52](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L52)

___

### verify

• `Private` **verify**: [`VerifierFn`](../modules.md#verifierfn) \| [`VerifierFnWithRequest`](../modules.md#verifierfnwithrequest)

#### Defined in

[src/strategy.ts:53](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L53)

## Methods

### authenticate

▸ **authenticate**(`req`, `_options?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | `Request`<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`<`string`, `any`\>\> |
| `_options?` | `unknown` |

#### Returns

`void`

#### Overrides

AbstractStrategy.authenticate

#### Defined in

[src/strategy.ts:92](https://github.com/sloikaxyz/passport-siwe/blob/v2.0.0/src/strategy.ts#L92)

___

### error

▸ **error**(`err`): `void`

Internal error while performing authentication.

Strategies should call this function when an internal error occurs
during the process of performing authentication; for example, if the
user directory is not available.

**`Api`**

public

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |

#### Returns

`void`

#### Inherited from

AbstractStrategy.error

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:96

___

### fail

▸ **fail**(`challenge`, `status`): `void`

Fail authentication, with optional `challenge` and `status`, defaulting
to 401.

Strategies should call this function to fail an authentication attempt.

**`Api`**

public

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `challenge` | `any` | (Can also be an object with 'message' and 'type' fields). |
| `status` | `number` |  |

#### Returns

`void`

#### Inherited from

AbstractStrategy.fail

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:60

▸ **fail**(`status`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `status` | `number` |

#### Returns

`void`

#### Inherited from

AbstractStrategy.fail

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:61

___

### pass

▸ **pass**(): `void`

Pass without making a success or fail decision.

Under most circumstances, Strategies should not need to call this
function.  It exists primarily to allow previous authentication state
to be restored, for example from an HTTP session.

**`Api`**

public

#### Returns

`void`

#### Inherited from

AbstractStrategy.pass

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:84

___

### redirect

▸ **redirect**(`url`, `status?`): `void`

Redirect to `url` with optional `status`, defaulting to 302.

Strategies should call this function to redirect the user (via their
user agent) to a third-party website for authentication.

**`Api`**

public

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |
| `status?` | `number` |

#### Returns

`void`

#### Inherited from

AbstractStrategy.redirect

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:73

___

### success

▸ **success**(`user`, `info?`): `void`

Authenticate `user`, with optional `info`.

Strategies should call this function to successfully authenticate a
user.  `user` should be an object supplied by the application after it
has been given an opportunity to verify credentials.  `info` is an
optional argument containing additional user information.  This is
useful for third-party authentication strategies to pass profile
details.

**`Api`**

public

#### Parameters

| Name | Type |
| :------ | :------ |
| `user` | `any` |
| `info?` | `any` |

#### Returns

`void`

#### Inherited from

AbstractStrategy.success

#### Defined in

node_modules/@types/passport-strategy/index.d.ts:48
