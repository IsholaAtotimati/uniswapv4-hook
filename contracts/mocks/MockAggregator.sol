// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal Chainlink compatible mock for price feeds used in tests.
contract MockAggregator {
    int256 private _answer;
    uint256 private _timestamp;

    constructor(int256 initialAnswer) {
        _answer = initialAnswer;
        _timestamp = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, _answer, _timestamp, _timestamp, 0);
    }

    function setAnswer(int256 newAnswer) external {
        _answer = newAnswer;
    }

    function setRoundData(int256 newAnswer, uint256 newTimestamp) external {
        _answer = newAnswer;
        _timestamp = newTimestamp;
    }

    function setTimestamp(uint256 newTimestamp) external {
        _timestamp = newTimestamp;
    }
}
