// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

enum SafeOperation {
    Call,
    DelegateCall
}

interface INoxSafeHost {
    function isModuleEnabled(address module) external view returns (bool);

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        SafeOperation operation
    ) external returns (bool success);

    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        SafeOperation operation
    ) external returns (bool success, bytes memory returnData);

    function disableModule(address prevModule, address module) external;

    function isOwner(address owner) external view returns (bool);
}

interface INoxSafeOperator {
    function setOperator(address operator, uint48 until) external;
    function isOperator(address holder, address operator) external view returns (bool);
    function confidentialBalanceOf(address holder) external view returns (bytes32);
}

interface INoxSafeCompute {
    function addViewer(bytes32 handle, address viewer) external;
    function isViewer(bytes32 handle, address viewer) external view returns (bool);
}

/**
 * @title NoxSafeModule
 * @notice A Safe module that composes Safe treasury execution with the NoxSwap
 *         confidential router and limit-order book.
 *
 * The module intentionally exposes no arbitrary-call escape hatch. Every write
 * is routed to one of the immutable Nox contracts or to the NoxCompute ACL
 * contract. A Safe owner must execute these entry points through the Safe
 * itself, so the Safe threshold remains the authority for every operation.
 */
contract NoxSafeModule {
    error OnlySafe();
    error OnlySafeOwner();
    error ModuleNotEnabled();
    error InvalidAddress();
    error InvalidToken();
    error InvalidOperator();
    error InvalidConsumer();
    error InvalidRecipient();
    error InvalidBatch();
    error SafeCallFailed(address target, bytes data);
    error InvalidReturnData();

    event SafeSwapExecuted(
        address indexed safe,
        address indexed tokenIn,
        address indexed tokenOut,
        bytes32 encryptedOutput,
        bytes32 encryptedRefund,
        uint256 receiptId
    );
    event SafeOrderCreated(address indexed safe, uint256 indexed orderId);
    event SafeInputPrepared(
        address indexed owner,
        address indexed consumer,
        bytes32 indexed handle
    );
    event SafeOrderCancelled(address indexed safe, uint256 indexed orderId, bytes32 encryptedRefund);
    event SafeTokenOperatorUpdated(
        address indexed safe,
        address indexed token,
        address indexed operator,
        uint48 until
    );
    event SafeViewerAdded(address indexed safe, bytes32 indexed handle, address indexed viewer);
    event SafeUnwrapRequested(
        address indexed safe,
        address indexed token,
        address indexed recipient,
        bytes32 unwrapRequestId
    );
    event SafeModuleRevoked(address indexed safe, address indexed module);

    address public immutable safe;
    address public immutable router;
    address public immutable orderBook;
    address public immutable noxCompute;
    mapping(address token => bool allowed) public immutableToken;

    modifier onlySafe() {
        if (msg.sender != safe) revert OnlySafe();
        _;
    }

    modifier onlyEnabled() {
        if (!INoxSafeHost(safe).isModuleEnabled(address(this))) revert ModuleNotEnabled();
        _;
    }

    modifier onlySafeOwner() {
        if (!INoxSafeHost(safe).isOwner(msg.sender)) revert OnlySafeOwner();
        _;
    }

    constructor(
        address safe_,
        address router_,
        address orderBook_,
        address noxCompute_,
        address[] memory allowedTokens_
    ) {
        if (
            safe_ == address(0) ||
            router_ == address(0) ||
            orderBook_ == address(0) ||
            noxCompute_ == address(0)
        ) revert InvalidAddress();
        safe = safe_;
        router = router_;
        orderBook = orderBook_;
        noxCompute = noxCompute_;
        for (uint256 i = 0; i < allowedTokens_.length; i++) {
            address token = allowedTokens_[i];
            if (token == address(0)) revert InvalidToken();
            immutableToken[token] = true;
        }
    }

    function isEnabled() public view returns (bool) {
        return INoxSafeHost(safe).isModuleEnabled(address(this));
    }

    /**
     * @notice Validate an EOA-owner input proof and persistently authorize the
     *         intended Nox consumer. Preparing a handle cannot move Safe funds;
     *         settlement still requires the Safe threshold to call this module.
     */
    function prepareInput(
        externalEuint256 encryptedInput,
        bytes calldata inputProof,
        address consumer
    ) external onlySafeOwner onlyEnabled returns (bytes32 preparedHandle) {
        preparedHandle = _prepareInput(encryptedInput, inputProof, consumer);
    }

    /**
     * @notice Prepare multiple encrypted inputs for one reviewed operation.
     *         This collapses amount/minOut preparation into one owner write
     *         without granting any additional consumer authority.
     */
    function prepareInputs(
        externalEuint256[] calldata encryptedInputs,
        bytes[] calldata inputProofs,
        address consumer
    ) external onlySafeOwner onlyEnabled returns (bytes32[] memory preparedHandles) {
        uint256 length = encryptedInputs.length;
        if (length == 0 || length != inputProofs.length) revert InvalidBatch();
        preparedHandles = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            preparedHandles[i] = _prepareInput(encryptedInputs[i], inputProofs[i], consumer);
        }
    }

    function _prepareInput(
        externalEuint256 encryptedInput,
        bytes calldata inputProof,
        address consumer
    ) private returns (bytes32 preparedHandle) {
        if (consumer != router && consumer != orderBook && !immutableToken[consumer]) {
            revert InvalidConsumer();
        }
        euint256 input = Nox.fromExternal(encryptedInput, inputProof);
        Nox.allow(input, consumer);
        Nox.allow(input, safe);
        preparedHandle = euint256.unwrap(input);
        emit SafeInputPrepared(msg.sender, consumer, preparedHandle);
    }

    /**
     * @notice Execute a protected swap using the Safe as payer and recipient.
     *         This function must be called by Safe.execTransaction, not by an
     *         EOA. The nested module call makes the router observe the Safe as
     *         msg.sender and therefore spend the Safe's confidential balance.
     */
    function confidentialSwap(
        address tokenIn,
        address tokenOut,
        bytes32 preparedAmountIn,
        bytes32 preparedMinOut,
        address receiptOwner,
        uint64 deadline
    ) external onlySafe onlyEnabled returns (bytes32 encryptedOutput, bytes32 encryptedRefund, uint256 receiptId) {
        _requireToken(tokenIn);
        _requireToken(tokenOut);
        if (!INoxSafeHost(safe).isOwner(receiptOwner)) revert OnlySafeOwner();
        _ensureOperator(tokenIn, router);
        bytes memory data = abi.encodeWithSignature(
            "confidentialSwapAuthorized(address,address,bytes32,bytes32,address,address,address,uint64)",
            tokenIn,
            tokenOut,
            preparedAmountIn,
            preparedMinOut,
            safe,
            safe,
            receiptOwner,
            deadline
        );
        bytes memory returnData = _safeCallWithReturnData(router, data);
        if (returnData.length != 96) revert InvalidReturnData();
        (encryptedOutput, encryptedRefund, receiptId) = abi.decode(returnData, (bytes32, bytes32, uint256));
        _grantViewerIfNeeded(encryptedOutput, receiptOwner);
        _grantViewerIfNeeded(encryptedRefund, receiptOwner);
        _grantBalanceViewerIfInitialized(tokenIn, receiptOwner);
        _grantBalanceViewerIfInitialized(tokenOut, receiptOwner);
        emit SafeSwapExecuted(safe, tokenIn, tokenOut, encryptedOutput, encryptedRefund, receiptId);
    }

    /**
     * @notice Create a confidential limit order whose owner is the Safe.
     */
    function createLimitOrder(
        address tokenIn,
        address tokenOut,
        bytes32 preparedAmountIn,
        bytes32 preparedMinOut,
        address receiptOwner,
        uint256 triggerPrice,
        uint64 expiry
    ) external onlySafe onlyEnabled returns (uint256 orderId) {
        _requireToken(tokenIn);
        _requireToken(tokenOut);
        if (!INoxSafeHost(safe).isOwner(receiptOwner)) revert OnlySafeOwner();
        _ensureOperator(tokenIn, orderBook);
        bytes memory data = abi.encodeWithSignature(
            "createOrderAuthorized(address,address,bytes32,bytes32,address,uint256,uint64)",
            tokenIn,
            tokenOut,
            preparedAmountIn,
            preparedMinOut,
            receiptOwner,
            triggerPrice,
            expiry
        );
        bytes memory returnData = _safeCallWithReturnData(orderBook, data);
        if (returnData.length != 32) revert InvalidReturnData();
        orderId = abi.decode(returnData, (uint256));
        _grantBalanceViewerIfInitialized(tokenIn, receiptOwner);
        emit SafeOrderCreated(safe, orderId);
    }

    /**
     * @notice Cancel an open confidential limit order owned by the Safe.
     *         The order book observes the Safe as msg.sender, so it enforces
     *         the same owner check as a direct Safe transaction.
     */
    function cancelLimitOrder(uint256 orderId)
        external
        onlySafe
        onlyEnabled
        returns (bytes32 encryptedRefund)
    {
        bytes memory data = abi.encodeWithSignature("cancelOrder(uint256)", orderId);
        bytes memory returnData = _safeCallWithReturnData(orderBook, data);
        if (returnData.length != 32) revert InvalidReturnData();
        encryptedRefund = abi.decode(returnData, (bytes32));
        emit SafeOrderCancelled(safe, orderId, encryptedRefund);
    }

    /**
     * @notice Burn a prepared confidential amount owned by the Safe and create
     *         a publicly decryptable unwrap request. The recipient is limited
     *         to the Safe itself or one of its owners; the Safe threshold must
     *         approve the custody exit before the permissionless finalize step.
     */
    function requestUnwrap(
        address token,
        bytes32 preparedAmount,
        address recipient
    ) external onlySafe onlyEnabled returns (bytes32 unwrapRequestId) {
        _requireToken(token);
        if (
            recipient == address(0) ||
            (recipient != safe && !INoxSafeHost(safe).isOwner(recipient))
        ) revert InvalidRecipient();
        bytes memory data = abi.encodeWithSignature(
            "unwrap(address,address,bytes32)",
            safe,
            recipient,
            preparedAmount
        );
        bytes memory returnData = _safeCallWithReturnData(token, data);
        if (returnData.length != 32) revert InvalidReturnData();
        unwrapRequestId = abi.decode(returnData, (bytes32));
        if (INoxSafeHost(safe).isOwner(recipient)) {
            _grantBalanceViewerIfInitialized(token, recipient);
        }
        emit SafeUnwrapRequested(safe, token, recipient, unwrapRequestId);
    }

    /**
     * @notice Authorize or revoke the router/order book as an ERC-7984 operator
     *         for the Safe. The token call is executed with the Safe as sender.
     */
    function setTokenOperator(
        address token,
        address operator,
        uint48 until
    ) external onlySafe onlyEnabled {
        _requireToken(token);
        if (operator != router && operator != orderBook) revert InvalidOperator();
        bytes memory data = abi.encodeWithSelector(INoxSafeOperator.setOperator.selector, operator, until);
        _safeCall(token, data);
        emit SafeTokenOperatorUpdated(safe, token, operator, until);
    }

    /**
     * @notice Grant a Safe owner/auditor viewer access to a private handle.
     *         Safe executes the NoxCompute ACL call, preserving Safe custody
     *         as the ACL administrator.
     */
    function addViewer(bytes32 handle, address viewer) external onlySafe onlyEnabled {
        if (viewer == address(0)) revert InvalidAddress();
        _grantViewerIfNeeded(handle, viewer);
    }

    /**
     * @notice Grant one viewer access to several current Safe handles in one
     *         threshold-approved transaction. Existing grants are skipped.
     */
    function addViewers(bytes32[] calldata handles, address viewer) external onlySafe onlyEnabled {
        if (viewer == address(0)) revert InvalidAddress();
        if (handles.length == 0) revert InvalidBatch();
        for (uint256 i = 0; i < handles.length; i++) {
            _grantViewerIfNeeded(handles[i], viewer);
        }
    }

    /**
     * @notice Disable this module. The previous module pointer is required by
     *         Safe's linked-list module manager and must be supplied by the UI.
     */
    function revoke(address previousModule) external onlySafe onlyEnabled {
        if (previousModule == address(0) || previousModule == address(this)) revert InvalidAddress();
        bytes memory data = abi.encodeWithSelector(INoxSafeHost.disableModule.selector, previousModule, address(this));
        _safeCall(safe, data);
        emit SafeModuleRevoked(safe, address(this));
    }

    function _requireToken(address token) private view {
        if (!immutableToken[token]) revert InvalidToken();
    }

    function _ensureOperator(address token, address operator) private {
        if (INoxSafeOperator(token).isOperator(safe, operator)) return;
        bytes memory data = abi.encodeWithSelector(
            INoxSafeOperator.setOperator.selector,
            operator,
            type(uint48).max
        );
        _safeCall(token, data);
        emit SafeTokenOperatorUpdated(safe, token, operator, type(uint48).max);
    }

    function _grantBalanceViewerIfInitialized(address token, address viewer) private {
        bytes32 handle = INoxSafeOperator(token).confidentialBalanceOf(safe);
        if (handle != bytes32(0)) _grantViewerIfNeeded(handle, viewer);
    }

    function _grantViewerIfNeeded(bytes32 handle, address viewer) private {
        if (handle == bytes32(0) || INoxSafeCompute(noxCompute).isViewer(handle, viewer)) return;
        bytes memory data = abi.encodeWithSelector(INoxSafeCompute.addViewer.selector, handle, viewer);
        _safeCall(noxCompute, data);
        emit SafeViewerAdded(safe, handle, viewer);
    }

    function _safeCall(address target, bytes memory data) private {
        bool success = INoxSafeHost(safe).execTransactionFromModule(target, 0, data, SafeOperation.Call);
        if (!success) {
            revert SafeCallFailed(target, data);
        }
    }

    function _safeCallWithReturnData(address target, bytes memory data) private returns (bytes memory) {
        (bool moduleSuccess, bytes memory raw) = address(INoxSafeHost(safe)).call(
            abi.encodeWithSelector(
                INoxSafeHost.execTransactionFromModuleReturnData.selector,
                target,
                0,
                data,
                SafeOperation.Call
            )
        );
        if (!moduleSuccess || raw.length < 64) revert SafeCallFailed(target, data);
        (bool success, bytes memory returnData) = abi.decode(raw, (bool, bytes));
        if (!success) revert SafeCallFailed(target, data);
        return returnData;
    }
}
