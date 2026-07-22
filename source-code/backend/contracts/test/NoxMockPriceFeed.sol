// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

contract NoxMockPriceFeed {
    uint8 public constant decimals = 8;
    int256 private _answer;
    uint256 private _updatedAt;

    constructor(int256 answer_) {
        setAnswer(answer_);
    }

    function setAnswer(int256 answer_) public {
        _answer = answer_;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _answer, _updatedAt, _updatedAt, 1);
    }
}
