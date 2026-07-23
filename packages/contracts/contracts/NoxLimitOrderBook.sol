// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INoxSwapRouter {
    function confidentialSwapAuthorized(
        address tokenIn,
        address tokenOut,
        euint256 encryptedAmountIn,
        euint256 encryptedMinOut,
        address recipient,
        address refundRecipient,
        address receiptOwner,
        uint64 deadline
    ) external returns (euint256 encryptedAmountOut, euint256 encryptedRefund, uint256 receiptId);
}

interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    function decimals() external view returns (uint8);
}

/// @title NoxLimitOrderBook
/// @notice Confidential-amount ETH/USDC limit orders with a public Chainlink trigger.
contract NoxLimitOrderBook is ReentrancyGuard {
    uint256 public constant MAX_ORACLE_AGE = 1 hours;

    enum OrderStatus {
        Open,
        Executed,
        Cancelled,
        Expired
    }

    struct Order {
        address owner;
        address tokenIn;
        address tokenOut;
        euint256 encryptedAmountIn;
        euint256 encryptedMinOut;
        address receiptOwner;
        uint256 triggerPrice;
        uint64 expiry;
        OrderStatus status;
    }

    INoxSwapRouter public immutable router;
    IPriceFeed public immutable priceFeed;
    address public immutable stableToken;
    address public immutable ethToken;
    uint8 public immutable priceDecimals;
    uint256 public nextOrderId = 1;
    mapping(uint256 orderId => Order) private _orders;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        address indexed tokenIn,
        address tokenOut,
        euint256 encryptedAmountIn,
        euint256 encryptedMinOut,
        uint256 triggerPrice,
        uint64 expiry
    );
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed executor,
        euint256 encryptedOutput,
        euint256 encryptedRefund,
        uint256 receiptId
    );
    event OrderCancelled(uint256 indexed orderId, euint256 encryptedRefund);
    event OrderExpired(uint256 indexed orderId, euint256 encryptedRefund);

    constructor(address router_, address priceFeed_, address stableToken_, address ethToken_) {
        require(
            router_ != address(0) &&
                priceFeed_ != address(0) &&
                stableToken_ != address(0) &&
                ethToken_ != address(0),
            "NoxOrders: zero address"
        );
        router = INoxSwapRouter(router_);
        priceFeed = IPriceFeed(priceFeed_);
        stableToken = stableToken_;
        ethToken = ethToken_;
        priceDecimals = IPriceFeed(priceFeed_).decimals();
    }

    function getOrder(
        uint256 orderId
    )
        external
        view
        returns (
            address owner,
            address tokenIn,
            address tokenOut,
            bytes32 encryptedAmountIn,
            bytes32 encryptedMinOut,
            uint256 triggerPrice,
            uint64 expiry,
            OrderStatus status
        )
    {
        Order storage order = _orders[orderId];
        require(order.owner != address(0), "NoxOrders: unknown order");
        return (
            order.owner,
            order.tokenIn,
            order.tokenOut,
            euint256.unwrap(order.encryptedAmountIn),
            euint256.unwrap(order.encryptedMinOut),
            order.triggerPrice,
            order.expiry,
            order.status
        );
    }

    function createOrder(
        address tokenIn,
        address tokenOut,
        externalEuint256 encryptedAmountIn,
        bytes calldata amountProof,
        externalEuint256 encryptedMinOut,
        bytes calldata minOutProof,
        uint256 triggerPrice,
        uint64 expiry
    ) external nonReentrant returns (uint256 orderId) {
        euint256 requestedAmount = Nox.fromExternal(encryptedAmountIn, amountProof);
        euint256 minimumOutput = Nox.fromExternal(encryptedMinOut, minOutProof);
        return _createOrder(tokenIn, tokenOut, requestedAmount, minimumOutput, msg.sender, triggerPrice, expiry);
    }

    /// @notice Compose with contracts that have already validated and authorized
    ///         persistent Nox handles for this order book.
    function createOrderAuthorized(
        address tokenIn,
        address tokenOut,
        euint256 preparedAmountIn,
        euint256 preparedMinOut,
        address receiptOwner,
        uint256 triggerPrice,
        uint64 expiry
    ) external nonReentrant returns (uint256 orderId) {
        require(Nox.isAllowed(preparedAmountIn, address(this)), "NoxOrders: amount not authorized");
        require(Nox.isAllowed(preparedMinOut, address(this)), "NoxOrders: minOut not authorized");
        require(receiptOwner != address(0), "NoxOrders: zero receipt owner");
        return _createOrder(tokenIn, tokenOut, preparedAmountIn, preparedMinOut, receiptOwner, triggerPrice, expiry);
    }

    function _createOrder(
        address tokenIn,
        address tokenOut,
        euint256 requestedAmount,
        euint256 minimumOutput,
        address receiptOwner,
        uint256 triggerPrice,
        uint64 expiry
    ) private returns (uint256 orderId) {
        require(_isSupportedPair(tokenIn, tokenOut), "NoxOrders: unsupported pair");
        require(triggerPrice > 0, "NoxOrders: zero trigger");
        require(expiry > block.timestamp, "NoxOrders: expired");

        Nox.allowTransient(requestedAmount, tokenIn);
        euint256 escrowedAmount = IERC7984(tokenIn).confidentialTransferFrom(
            msg.sender,
            address(this),
            requestedAmount
        );
        IERC7984(tokenIn).setOperator(address(router), type(uint48).max);

        Nox.allowThis(escrowedAmount);
        Nox.allowThis(minimumOutput);
        Nox.allow(escrowedAmount, msg.sender);
        Nox.allow(minimumOutput, msg.sender);

        orderId = nextOrderId++;
        _orders[orderId] = Order({
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            encryptedAmountIn: escrowedAmount,
            encryptedMinOut: minimumOutput,
            receiptOwner: receiptOwner,
            triggerPrice: triggerPrice,
            expiry: expiry,
            status: OrderStatus.Open
        });
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenIn,
            tokenOut,
            escrowedAmount,
            minimumOutput,
            triggerPrice,
            expiry
        );
    }

    function executeOrder(
        uint256 orderId
    ) external nonReentrant returns (euint256 encryptedOutput, euint256 encryptedRefund, uint256 receiptId) {
        Order storage order = _orders[orderId];
        require(order.status == OrderStatus.Open, "NoxOrders: not open");
        require(block.timestamp <= order.expiry, "NoxOrders: expired");
        (uint256 price, uint256 updatedAt) = _latestPrice();
        bool triggerReached = order.tokenIn == ethToken
            ? price >= order.triggerPrice
            : price <= order.triggerPrice;
        require(triggerReached, "NoxOrders: trigger not reached");

        order.status = OrderStatus.Executed;
        Nox.allowTransient(order.encryptedAmountIn, address(router));
        Nox.allowTransient(order.encryptedMinOut, address(router));
        (encryptedOutput, encryptedRefund, receiptId) = router.confidentialSwapAuthorized(
            order.tokenIn,
            order.tokenOut,
            order.encryptedAmountIn,
            order.encryptedMinOut,
            order.owner,
            order.owner,
            order.receiptOwner,
            order.expiry
        );
        updatedAt;
        emit OrderExecuted(orderId, msg.sender, encryptedOutput, encryptedRefund, receiptId);
    }

    function cancelOrder(uint256 orderId) external nonReentrant returns (euint256 encryptedRefund) {
        Order storage order = _orders[orderId];
        require(order.owner == msg.sender, "NoxOrders: not owner");
        require(order.status == OrderStatus.Open, "NoxOrders: not open");
        order.status = OrderStatus.Cancelled;
        encryptedRefund = _refund(order);
        emit OrderCancelled(orderId, encryptedRefund);
    }

    function expireOrder(uint256 orderId) external nonReentrant returns (euint256 encryptedRefund) {
        Order storage order = _orders[orderId];
        require(order.status == OrderStatus.Open, "NoxOrders: not open");
        require(block.timestamp > order.expiry, "NoxOrders: not expired");
        order.status = OrderStatus.Expired;
        encryptedRefund = _refund(order);
        emit OrderExpired(orderId, encryptedRefund);
    }

    function canExecute(uint256 orderId) external view returns (bool executable, uint256 currentPrice) {
        Order storage order = _orders[orderId];
        if (order.status != OrderStatus.Open || block.timestamp > order.expiry) return (false, 0);
        (currentPrice, ) = _latestPrice();
        executable = order.tokenIn == ethToken
            ? currentPrice >= order.triggerPrice
            : currentPrice <= order.triggerPrice;
    }

    function _refund(Order storage order) private returns (euint256 encryptedRefund) {
        Nox.allowTransient(order.encryptedAmountIn, order.tokenIn);
        encryptedRefund = IERC7984(order.tokenIn).confidentialTransfer(
            order.owner,
            order.encryptedAmountIn
        );
    }

    function _latestPrice() private view returns (uint256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 oracleUpdatedAt, ) = priceFeed.latestRoundData();
        updatedAt = oracleUpdatedAt;
        require(answer > 0, "NoxOrders: invalid oracle price");
        require(updatedAt <= block.timestamp, "NoxOrders: future oracle update");
        require(block.timestamp - updatedAt <= MAX_ORACLE_AGE, "NoxOrders: stale oracle");
        return (uint256(answer), updatedAt);
    }

    function _isSupportedPair(address tokenIn, address tokenOut) private view returns (bool) {
        return
            (tokenIn == stableToken && tokenOut == ethToken) ||
            (tokenIn == ethToken && tokenOut == stableToken);
    }
}
