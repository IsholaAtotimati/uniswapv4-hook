# IdleLiquidityHookEnterprise — Protocol Reference

This document describes the `IdleLiquidityHookEnterprise` contract implemented in this repository. It follows Uniswap-style documentation conventions: short overview, contract reference, deployment, and usage examples.

## Overview

`IdleLiquidityHookEnterprise` is a Uniswap v4 hook that automatically moves out-of-range liquidity into a vault (or Aave) while tracking yield for LPs. When the position returns into range, the hook can redeploy liquidity and distribute accrued yield.

- File: [contracts/hooks/IdleLiquidityHookEnterprise.sol](contracts/hooks/IdleLiquidityHookEnterprise.sol#L1-L400)
- Constructor: `constructor(address _poolManager)` — an `IPoolManager` address is required.

### Important details

- Uses Uniswap v4 `BaseHook` and must be deployed to an address whose lower 14 bits encode desired hook permissions (see Uniswap docs on hook deployment). The hook validates its own address in `BaseHook` constructor (skipped on chainId 31337).
- Tracks `PositionInfo` per `PoolId` and LP address; supports moving liquidity into an ERC4626 vault or an Aave lending pool.

## Contract: Key functions

All signatures below reference the implementation in [contracts/hooks/IdleLiquidityHookEnterprise.sol](contracts/hooks/IdleLiquidityHookEnterprise.sol#L1-L400).

- `constructor(address _poolManager)` — initialises the BaseHook with the `IPoolManager` address.

- `function registerPosition(PoolId pid, uint128 liquidity, int24 lower, int24 upper)` — called by LPs to register a position tracked by the hook.

- `function deregisterPosition(PoolId pid, PoolKey calldata key)` — deregister a position and collect yield if idle.

- `function claimYield(PoolId pid, PoolKey calldata key)` — claim accumulated yield for the caller.

- `function setPoolConfigVault(PoolId pid, IERC4626 _vault, uint256 lpBP, uint256 protocolBP)` — owner-only: configure ERC4626 vault for a pool; `lpBP + protocolBP == 10000`.

- `function setPoolConfigAave(PoolId pid, ILendingPool _lendingPool, IERC20 _aToken, address _asset, uint256 lpBP, uint256 protocolBP)` — owner-only: configure Aave flow.

### Events

- `event PositionRegistered(address indexed lp, PoolId indexed pid, uint128 liquidity)`
- `event PositionDeregistered(address indexed lp, PoolId indexed pid)`
- `event PoolConfigUpdated(PoolId indexed pid, address vault, uint256 lpBP, uint256 protocolBP)`
- `event LiquidityMovedToVault(address indexed lp, PoolId indexed pid, uint256 amount, uint256 shares)`
- `event YieldCollected(address indexed lp, PoolId indexed pid, uint256 lpYield, uint256 protocolYield)`

## PoolId and PoolKey

- `PoolId` is `bytes32`. In the v4-core types, `PoolIdLibrary.toId(PoolKey)` returns `keccak256(abi.encode(poolKey))`.
- Use the same encoding on clients to compute `PoolId` (the frontend includes a helper that ABI-encodes `(address,address,uint24,int24,address)` and keccak256's it).

## Deployment notes

1. The hook's constructor validates its deployed address against `getHookPermissions()` by checking low bits of the address. To deploy a hook that passes the check, deploy using a deterministic CREATE2 address with the required low bits (see Uniswap hook deployment guide).
2. For quick testing, deploy onto a local Hardhat node (chainId 31337); `BaseHook` skips validation on that chain id.

### Example: calling `setPoolConfigVault`

Using `ethers.js` with a signer that is the hook owner:

```js
const hook = new ethers.Contract(hookAddress, hookAbi, signer);
const tx = await hook.setPoolConfigVault(poolId, vaultAddress, 9000, 1000);
await tx.wait();
```

### Notes on owner-only functions

Functions that change configuration (`setPoolConfig*`) are `onlyOwner`. The owner is set as the deployer in the current `constructor` (Ownable).

## Security considerations

- Ensure `lpBP + protocolBP == 10000` to avoid reverts. Frontend includes client-side validation.
- The constructor uses `validateHookAddress` which asserts low-bit flags. Use deterministic deploy to satisfy flags or run tests on local network.
