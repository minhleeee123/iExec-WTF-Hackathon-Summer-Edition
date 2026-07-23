// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {ERC7984Base} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984Base.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {Nox, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @notice Official ERC-20 to ERC-7984 wrapper with user-managed balance viewers.
contract NoxConfidentialToken is ERC20ToERC7984Wrapper {
    event BalanceViewerGranted(address indexed holder, address indexed viewer, euint256 balance);

    constructor(
        string memory name_,
        string memory symbol_,
        IERC20 underlying_
    ) ERC20ToERC7984Wrapper(name_, symbol_, "", underlying_) {}

    /// @dev Let composing routers use the actual transferred handle returned by the wrapper.
    function confidentialTransfer(
        address to,
        euint256 amount
    ) public override(ERC7984Base, IERC7984) returns (euint256 transferred) {
        transferred = super.confidentialTransfer(to, amount);
        Nox.allowTransient(transferred, msg.sender);
        Nox.allow(transferred, to);
    }

    function grantBalanceViewer(address viewer) external {
        require(viewer != address(0), "NoxToken: invalid viewer");
        euint256 balance = confidentialBalanceOf(msg.sender);
        require(Nox.isInitialized(balance), "NoxToken: balance not initialized");
        Nox.addViewer(balance, viewer);
        emit BalanceViewerGranted(msg.sender, viewer, balance);
    }
}
