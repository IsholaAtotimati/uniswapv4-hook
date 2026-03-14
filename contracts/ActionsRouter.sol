        event DebugError(string step, string message);
    // Debug events
    event DebugBalance(string label, address token, address account, uint256 balance);
    event DebugStep(string step, address token, uint256 amount, bool success);
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;


import {IPoolManager} from "../lib/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "../lib/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {Currency} from "../lib/v4-core/src/types/Currency.sol";
import {PoolKey} from "../lib/v4-core/src/types/PoolKey.sol";
import {SwapParams} from "../lib/v4-core/src/types/PoolOperation.sol";
import {StateLibrary} from "../lib/v4-core/src/libraries/StateLibrary.sol";
import {TransientStateLibrary} from "../lib/v4-core/src/libraries/TransientStateLibrary.sol";
import {IERC20} from "./interfaces/IERC20.sol";


enum Actions {
    SETTLE,
    SETTLE_NATIVE,
    SETTLE_FOR,
    TAKE,
    PRANK_TAKE_FROM,
    SYNC,
    MINT,
    SWAP,
    CLEAR,
    ASSERT_BALANCE_EQUALS,
    ASSERT_RESERVES_EQUALS,
    ASSERT_DELTA_EQUALS,
    ASSERT_NONZERO_DELTA_COUNT_EQUALS,
    TRANSFER_FROM,
    COLLECT_PROTOCOL_FEES,
    TRANSFER_TO_PM
}

contract ActionsRouter is IUnlockCallback {
        // Helper functions for revert messages
        function toHexString(address account) internal pure returns (string memory) {
            return toHexString(uint256(uint160(account)), 20);
        }
        function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
            bytes16 _SYMBOLS = "0123456789abcdef";
            bytes memory buffer = new bytes(2 * length + 2);
            buffer[0] = "0";
            buffer[1] = "x";
            for (uint256 i = 2 * length + 1; i > 1; --i) {
                buffer[i] = _SYMBOLS[value & 0xf];
                value >>= 4;
            }
            require(value == 0, "hex length insufficient");
            return string(buffer);
        }
        function toString(uint256 value) internal pure returns (string memory) {
            if (value == 0) {
                return "0";
            }
            uint256 temp = value;
            uint256 digits;
            while (temp != 0) {
                digits++;
                temp /= 10;
            }
            bytes memory buffer = new bytes(digits);
            while (value != 0) {
                digits -= 1;
                buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
                value /= 10;
            }
            return string(buffer);
        }
    using StateLibrary for IPoolManager;
    using TransientStateLibrary for IPoolManager;

    error ActionNotSupported();
    error CheckParameters();

    IPoolManager manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Not PoolManager");
        (Actions[] memory actions, bytes[] memory params) = abi.decode(data, (Actions[], bytes[]));
        if (actions.length != params.length || actions.length == 0) revert CheckParameters();
        for (uint256 i = 0; i < actions.length; i++) {
            Actions action = actions[i];
            bytes memory param = params[i];
            if (action == Actions.SETTLE) {
                _settle(); // param ignored
            } else if (action == Actions.SETTLE_NATIVE) {
                _settleNative(param);
            } else if (action == Actions.SETTLE_FOR) {
                _settleFor(param);
            } else if (action == Actions.TAKE) {
                _take(param);
            } else if (action == Actions.PRANK_TAKE_FROM) {
                _prankTakeFrom(param);
            } else if (action == Actions.SYNC) {
                _sync(param);
            } else if (action == Actions.MINT) {
                _mint(param);
            } else if (action == Actions.SWAP) {
                _swap(param);
            } else if (action == Actions.CLEAR) {
                _clear(param);
            } else if (action == Actions.ASSERT_BALANCE_EQUALS) {
                _assertBalanceEquals(param);
            } else if (action == Actions.ASSERT_RESERVES_EQUALS) {
                _assertReservesEquals(param);
            } else if (action == Actions.ASSERT_DELTA_EQUALS) {
                _assertDeltaEquals(param);
            } else if (action == Actions.ASSERT_NONZERO_DELTA_COUNT_EQUALS) {
                _assertNonzeroDeltaCountEquals(param);
            } else if (action == Actions.TRANSFER_FROM) {
                _transferFrom(param);
            } else if (action == Actions.COLLECT_PROTOCOL_FEES) {
                _collectProtocolFees(param);
            } else if (action == Actions.TRANSFER_TO_PM) {
                _transferToPM(param);
            }
        }
        return "";
    }

    function _transferToPM(bytes memory params) internal {
        (address token, uint256 amount) = abi.decode(params, (address, uint256));
        IERC20 erc20 = IERC20(token);
        uint256 balBefore = erc20.balanceOf(address(this));
        emit DebugBalance("Router balance before", token, address(this), balBefore);
        emit DebugStep("Approve", token, amount, false);
        bool approveSuccess = erc20.approve(address(manager), amount);
        require(approveSuccess, string(abi.encodePacked("Approve failed: token=", toHexString(token), ", amount=", toString(amount))));
        emit DebugStep("Approve", token, amount, true);
        emit DebugStep("Transfer", token, amount, false);
        bool transferSuccess = erc20.transfer(address(manager), amount);
        require(transferSuccess, string(abi.encodePacked("Transfer to PoolManager failed: token=", toHexString(token), ", amount=", toString(amount))));
        emit DebugStep("Transfer", token, amount, true);
        uint256 balAfter = erc20.balanceOf(address(this));
        emit DebugBalance("Router balance after", token, address(this), balAfter);
    }

    function executeActions(Actions[] memory actions, bytes[] memory params) external payable {
        manager.unlock(abi.encode(actions, params));
    }

    function _settle() internal {
        manager.settle();
    }
    
    function _settleNative(bytes memory params) internal {
        uint256 amount = abi.decode(params, (uint256));
        manager.settle{value: amount}();
    }

    function _settleFor(bytes memory params) internal {
        address recipient = abi.decode(params, (address));
        manager.settleFor(recipient);
    }

    function _take(bytes memory params) internal {
        (Currency currency, address recipient, int128 amount) = abi.decode(params, (Currency, address, int128));
        manager.take(currency, recipient, uint128(amount));
    }

    function _prankTakeFrom(bytes memory params) internal {
        (Currency currency, address from, address recipient, uint256 amount) =
            abi.decode(params, (Currency, address, address, uint256));
        manager.take(currency, recipient, amount);
    }

    function _sync(bytes memory params) internal {
        Currency currency = Currency.wrap(abi.decode(params, (address)));
        emit DebugStep("Sync", address(Currency.unwrap(currency)), 0, false);
        try manager.sync(currency) {
            emit DebugStep("Sync", address(Currency.unwrap(currency)), 0, true);
        } catch Error(string memory reason) {
            emit DebugError("Sync", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit DebugError("Sync", "low-level revert");
            revert("Sync low-level revert");
        }
    }

    function _mint(bytes memory params) internal {
        (address recipient, Currency currency, uint256 amount) = abi.decode(params, (address, Currency, uint256));
        emit DebugStep("Mint", address(Currency.unwrap(currency)), amount, false);
        try manager.mint(recipient, currency.toId(), amount) {
            emit DebugStep("Mint", address(Currency.unwrap(currency)), amount, true);
        } catch Error(string memory reason) {
            emit DebugError("Mint", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit DebugError("Mint", "low-level revert");
            revert("Mint low-level revert");
        }
    }

    function _swap(bytes memory params) internal {
        (PoolKey memory poolKey, SwapParams memory swapParams, bytes memory hookData) = abi.decode(
            params,
            (PoolKey, SwapParams, bytes)
        );
        emit DebugStep("Swap", address(Currency.unwrap(poolKey.currency0)), 0, false);
        try manager.swap(poolKey, swapParams, hookData) {
            emit DebugStep("Swap", address(Currency.unwrap(poolKey.currency0)), 0, true);
        } catch Error(string memory reason) {
            emit DebugError("Swap", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit DebugError("Swap", "low-level revert");
            revert("Swap low-level revert");
        }
    }

    function _clear(bytes memory params) internal {
        (Currency currency, uint256 amount, bool measureGas, string memory gasSnapName) =
            abi.decode(params, (Currency, uint256, bool, string));
        manager.clear(currency, amount);
    }

    function _assertBalanceEquals(bytes memory params) internal view {
        (Currency currency, address user, uint256 expectedBalance) = abi.decode(params, (Currency, address, uint256));
    }

    function _assertReservesEquals(bytes memory params) internal view {
        uint256 expectedReserves = abi.decode(params, (uint256));
    }

    function _assertDeltaEquals(bytes memory params) internal view {
        (Currency currency, address caller, int256 expectedDelta) = abi.decode(params, (Currency, address, int256));
    }

    function _assertNonzeroDeltaCountEquals(bytes memory params) internal view {
        (uint256 expectedCount) = abi.decode(params, (uint256));
    }

    function _transferFrom(bytes memory params) internal {
        (Currency currency, address from, address recipient, uint256 amount) =
            abi.decode(params, (Currency, address, address, uint256));
    }

    function _collectProtocolFees(bytes memory params) internal {
        (address to, Currency currency, uint256 amount) = abi.decode(params, (address, Currency, uint256));
        manager.collectProtocolFees(to, currency, amount);
    }
}
