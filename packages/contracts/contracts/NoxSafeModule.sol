// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

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
}

interface INoxSafeOperator {
    function setOperator(address operator, uint48 until) external;
}

interface INoxSafeCompute {
    function addViewer(bytes32 handle, address viewer) external;
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
    error ModuleNotEnabled();
    error InvalidAddress();
    error InvalidToken();
    error InvalidOperator();
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
    event SafeOrderCancelled(address indexed safe, uint256 indexed orderId, bytes32 encryptedRefund);
    event SafeTokenOperatorUpdated(
        address indexed safe,
        address indexed token,
        address indexed operator,
        uint48 until
    );
    event SafeViewerAdded(address indexed safe, bytes32 indexed handle, address indexed viewer);
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
     * @notice Execute a protected swap using the Safe as payer and recipient.
     *         This function must be called by Safe.execTransaction, not by an
     *         EOA. The nested module call makes the router observe the Safe as
     *         msg.sender and therefore spend the Safe's confidential balance.
     */
    function confidentialSwap(
        address tokenIn,
        address tokenOut,
        bytes32 encryptedAmountIn,
        bytes calldata inputProof,
        bytes32 encryptedMinOut,
        bytes calldata minOutProof,
        uint64 deadline
    ) external onlySafe onlyEnabled returns (bytes32 encryptedOutput, bytes32 encryptedRefund, uint256 receiptId) {
        _requireToken(tokenIn);
        _requireToken(tokenOut);
        bytes memory data = abi.encodeWithSignature(
            "confidentialSwap(address,address,bytes32,bytes,bytes32,bytes,uint64)",
            tokenIn,
            tokenOut,
            encryptedAmountIn,
            inputProof,
            encryptedMinOut,
            minOutProof,
            deadline
        );
        bytes memory returnData = _safeCallWithReturnData(router, data);
        if (returnData.length != 96) revert InvalidReturnData();
        (encryptedOutput, encryptedRefund, receiptId) = abi.decode(returnData, (bytes32, bytes32, uint256));
        emit SafeSwapExecuted(safe, tokenIn, tokenOut, encryptedOutput, encryptedRefund, receiptId);
    }

    /**
     * @notice Create a confidential limit order whose owner is the Safe.
     */
    function createLimitOrder(
        address tokenIn,
        address tokenOut,
        bytes32 encryptedAmountIn,
        bytes calldata amountProof,
        bytes32 encryptedMinOut,
        bytes calldata minOutProof,
        uint256 triggerPrice,
        uint64 expiry
    ) external onlySafe onlyEnabled returns (uint256 orderId) {
        _requireToken(tokenIn);
        _requireToken(tokenOut);
        bytes memory data = abi.encodeWithSignature(
            "createOrder(address,address,bytes32,bytes,bytes32,bytes,uint256,uint64)",
            tokenIn,
            tokenOut,
            encryptedAmountIn,
            amountProof,
            encryptedMinOut,
            minOutProof,
            triggerPrice,
            expiry
        );
        bytes memory returnData = _safeCallWithReturnData(orderBook, data);
        if (returnData.length != 32) revert InvalidReturnData();
        orderId = abi.decode(returnData, (uint256));
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
        bytes memory data = abi.encodeWithSelector(INoxSafeCompute.addViewer.selector, handle, viewer);
        _safeCall(noxCompute, data);
        emit SafeViewerAdded(safe, handle, viewer);
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
