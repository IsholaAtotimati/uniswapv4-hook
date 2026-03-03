// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";

library OracleManager {
    uint256 public constant ORACLE_MAX_DELAY = 1 hours;
    uint256 public constant ORACLE_MAX_DEVIATION_BP = 500; // 5%
    uint256 public constant ORACLE_BASIS_POINTS = 10000;

    function getSafePrice(
        mapping(address => AggregatorV3Interface) storage priceFeed,
        address asset
    ) internal view returns (int256 price, uint256 updatedAt) {
        AggregatorV3Interface feed = priceFeed[asset];
        require(address(feed) != address(0), "no feed");
        (, int256 answer,, uint256 updated,) = feed.latestRoundData();
        require(answer > 0, "invalid oracle price");
        require(block.timestamp - updated <= ORACLE_MAX_DELAY, "stale price");
        return (answer, updated);
    }

    function checkPriceDeviation(
        mapping(address => AggregatorV3Interface) storage priceFeed,
        address asset,
        int256 refPrice
    ) internal view {
        (int256 price, ) = getSafePrice(priceFeed, asset);
        int256 diff = price > refPrice ? price - refPrice : refPrice - price;
        require(uint256(diff) * ORACLE_BASIS_POINTS / uint256(refPrice) <= ORACLE_MAX_DEVIATION_BP, "oracle deviation");
    }
}
