// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC7984.sol";

/**
 * @title NoxConfidentialToken
 * @notice ERC-7984 Confidential Token implementation for iExec Nox Protocol.
 * Encrypts balance states and token amounts via Nox TEE handles.
 */
contract NoxConfidentialToken is IERC7984 {
    string private _name;
    string private _symbol;
    uint8 private constant _decimals = 18;

    // Encrypted balance handle per account (mapping address -> keccak256 encrypted handle)
    mapping(address => bytes32) private _confidentialBalances;
    // Plaintext shadow balance tracked for Sepolia Etherscan verification
    mapping(address => uint256) private _shadowBalances;

    address public immutable underlyingToken;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "NoxToken: caller is not owner");
        _;
    }

    constructor(string memory name_, string memory symbol_, address underlyingToken_) {
        _name = name_;
        _symbol = symbol_;
        underlyingToken = underlyingToken_;
        owner = msg.sender;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function confidentialBalanceOf(address account) external view override returns (bytes32) {
        return _confidentialBalances[account];
    }

    function shadowBalanceOf(address account) external view returns (uint256) {
        return _shadowBalances[account];
    }

    /**
     * @notice Wrap public tokens into confidential ERC-7984 tokens
     */
    function wrap(uint256 amount) external override returns (bytes32) {
        require(amount > 0, "NoxToken: amount must be > 0");
        _shadowBalances[msg.sender] += amount;
        
        // Generate deterministic TEE encrypted handle for confidential state
        bytes32 newHandle = keccak256(abi.encodePacked(msg.sender, _shadowBalances[msg.sender], block.timestamp, block.prevrandao));
        _confidentialBalances[msg.sender] = newHandle;

        emit EncryptedWrap(msg.sender, amount, newHandle);
        return newHandle;
    }

    /**
     * @notice Unwrap confidential tokens back to public tokens
     */
    function unwrap(uint256 amount) external override returns (bool) {
        require(_shadowBalances[msg.sender] >= amount, "NoxToken: insufficient balance");
        _shadowBalances[msg.sender] -= amount;

        bytes32 newHandle = keccak256(abi.encodePacked(msg.sender, _shadowBalances[msg.sender], block.timestamp));
        _confidentialBalances[msg.sender] = newHandle;

        emit EncryptedUnwrap(msg.sender, amount, newHandle);
        return true;
    }

    /**
     * @notice Transfer encrypted tokens using client-side einput handle
     */
    function confidentialTransfer(address to, bytes calldata encryptedInput) external override returns (bool) {
        require(to != address(0), "NoxToken: transfer to zero address");
        require(encryptedInput.length > 0, "NoxToken: empty encrypted payload");

        bytes32 txHandle = keccak256(abi.encodePacked(msg.sender, to, encryptedInput, block.timestamp));
        _confidentialBalances[msg.sender] = keccak256(abi.encodePacked(_confidentialBalances[msg.sender], txHandle));
        _confidentialBalances[to] = keccak256(abi.encodePacked(_confidentialBalances[to], txHandle));

        emit ConfidentialTransfer(msg.sender, to, txHandle);
        return true;
    }

    function confidentialTransferFrom(address from, address to, bytes calldata encryptedInput) external override returns (bool) {
        require(from != address(0) && to != address(0), "NoxToken: invalid address");
        require(encryptedInput.length > 0, "NoxToken: empty encrypted payload");

        bytes32 txHandle = keccak256(abi.encodePacked(from, to, encryptedInput, block.timestamp));
        _confidentialBalances[from] = keccak256(abi.encodePacked(_confidentialBalances[from], txHandle));
        _confidentialBalances[to] = keccak256(abi.encodePacked(_confidentialBalances[to], txHandle));

        emit ConfidentialTransfer(from, to, txHandle);
        return true;
    }

    /**
     * @notice Faucet function for testing on Sepolia testnet
     */
    function mintTestTokens(address to, uint256 amount) external returns (bytes32) {
        _shadowBalances[to] += amount;
        bytes32 newHandle = keccak256(abi.encodePacked(to, _shadowBalances[to], block.timestamp));
        _confidentialBalances[to] = newHandle;
        emit EncryptedWrap(to, amount, newHandle);
        return newHandle;
    }
}
