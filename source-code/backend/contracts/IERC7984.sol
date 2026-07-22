// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC7984
 * @notice Interface for ERC-7984 Confidential Fungible Tokens using iExec Nox TEE encrypted handles.
 * Encrypted handles (einput, euint64) replace plaintext uint256 balances on-chain.
 */
interface IERC7984 {
    event ConfidentialTransfer(address indexed from, address indexed to, bytes32 encryptedHandle);
    event ConfidentialApproval(address indexed owner, address indexed spender, bytes32 encryptedHandle);
    event EncryptedWrap(address indexed account, uint256 amount, bytes32 encryptedHandle);
    event EncryptedUnwrap(address indexed account, uint256 amount, bytes32 encryptedHandle);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    
    /**
     * @notice Get encrypted balance handle for an account
     */
    function confidentialBalanceOf(address account) external view returns (bytes32);

    /**
     * @notice Wrap public ERC-20 tokens into confidential ERC-7984 tokens
     */
    function wrap(uint256 amount) external returns (bytes32);

    /**
     * @notice Unwrap confidential ERC-7984 tokens back to public ERC-20 tokens
     */
    function unwrap(uint256 amount) external returns (bool);

    /**
     * @notice Transfer encrypted token amount to a recipient
     */
    function confidentialTransfer(address to, bytes calldata encryptedInput) external returns (bool);

    /**
     * @notice Transfer encrypted token amount from sender to recipient with approval
     */
    function confidentialTransferFrom(address from, address to, bytes calldata encryptedInput) external returns (bool);
}
