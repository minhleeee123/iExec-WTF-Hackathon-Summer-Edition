// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Faucet-backed ERC-20 used as real Sepolia collateral for the Nox wrappers.
contract NoxTestToken is ERC20, Ownable {
    uint8 private immutable _tokenDecimals;
    uint256 public immutable faucetAmount;
    mapping(address account => uint64 lastClaimAt) public lastClaimAt;

    error FaucetCooldown(uint64 availableAt);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 faucetAmount_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _tokenDecimals = decimals_;
        faucetAmount = faucetAmount_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function faucet() external {
        uint64 nextClaimAt = lastClaimAt[msg.sender] + 1 hours;
        if (lastClaimAt[msg.sender] != 0 && block.timestamp < nextClaimAt) {
            revert FaucetCooldown(nextClaimAt);
        }
        lastClaimAt[msg.sender] = uint64(block.timestamp);
        _mint(msg.sender, faucetAmount);
    }

    function mintLiquidity(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
