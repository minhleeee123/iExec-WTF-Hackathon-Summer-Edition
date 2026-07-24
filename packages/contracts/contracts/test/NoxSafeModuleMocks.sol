// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

contract NoxSafeModuleMockRouter {
    address public lastCaller;
    address public lastTokenIn;
    address public lastTokenOut;
    uint256 public swapCalls;

    function confidentialSwapAuthorized(
        address tokenIn,
        address tokenOut,
        bytes32,
        bytes32,
        address,
        address,
        address,
        uint64
    ) external returns (bytes32 encryptedOutput, bytes32 encryptedRefund, uint256 receiptId) {
        lastCaller = msg.sender;
        lastTokenIn = tokenIn;
        lastTokenOut = tokenOut;
        swapCalls++;
        return (bytes32(uint256(0x1111)), bytes32(uint256(0x2222)), swapCalls);
    }
}

contract NoxSafeModuleMockOrderBook {
    address public lastCaller;
    uint256 public orderCalls;
    uint256 public cancelCalls;
    uint256 public lastCancelledOrder;

    function createOrderAuthorized(
        address,
        address,
        bytes32,
        bytes32,
        address,
        uint256,
        uint64
    ) external returns (uint256 orderId) {
        lastCaller = msg.sender;
        orderId = ++orderCalls;
    }

    function cancelOrder(uint256 orderId) external returns (bytes32 encryptedRefund) {
        lastCaller = msg.sender;
        cancelCalls++;
        lastCancelledOrder = orderId;
        return bytes32(uint256(0x3333));
    }
}

contract NoxSafeModuleMockToken {
    address public lastCaller;
    address public lastOperator;
    address public lastUnwrapFrom;
    address public lastUnwrapRecipient;
    bytes32 public lastUnwrapAmount;
    uint48 public lastUntil;
    bytes32 public balanceHandle = bytes32(uint256(0x7777));
    mapping(address holder => mapping(address operator => uint48 until)) public operatorUntil;

    function setOperator(address operator, uint48 until) external {
        lastCaller = msg.sender;
        lastOperator = operator;
        lastUntil = until;
        operatorUntil[msg.sender][operator] = until;
    }

    function isOperator(address holder, address operator) external view returns (bool) {
        return operatorUntil[holder][operator] >= block.timestamp;
    }

    function confidentialBalanceOf(address) external view returns (bytes32) {
        return balanceHandle;
    }

    function setBalanceHandle(bytes32 handle) external {
        balanceHandle = handle;
    }

    function unwrap(
        address from,
        address recipient,
        bytes32 amount
    ) external returns (bytes32 unwrapRequestId) {
        lastCaller = msg.sender;
        lastUnwrapFrom = from;
        lastUnwrapRecipient = recipient;
        lastUnwrapAmount = amount;
        return bytes32(uint256(0x4444));
    }
}

contract NoxSafeModuleMockCompute {
    address public lastCaller;
    bytes32 public lastHandle;
    address public lastViewer;
    uint256 public viewerCalls;
    mapping(bytes32 handle => mapping(address viewer => bool allowed)) public allowed;

    function addViewer(bytes32 handle, address viewer) external {
        lastCaller = msg.sender;
        lastHandle = handle;
        lastViewer = viewer;
        viewerCalls++;
        allowed[handle][viewer] = true;
    }

    function isAllowed(bytes32 handle, address viewer) external view returns (bool) {
        return allowed[handle][viewer];
    }
}
