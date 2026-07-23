// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

contract NoxSafeModuleMockRouter {
    address public lastCaller;
    address public lastTokenIn;
    address public lastTokenOut;
    uint256 public swapCalls;

    function confidentialSwap(
        address tokenIn,
        address tokenOut,
        bytes32,
        bytes calldata,
        bytes32,
        bytes calldata,
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

    function createOrder(
        address,
        address,
        bytes32,
        bytes calldata,
        bytes32,
        bytes calldata,
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
    uint48 public lastUntil;

    function setOperator(address operator, uint48 until) external {
        lastCaller = msg.sender;
        lastOperator = operator;
        lastUntil = until;
    }
}

contract NoxSafeModuleMockCompute {
    address public lastCaller;
    bytes32 public lastHandle;
    address public lastViewer;

    function addViewer(bytes32 handle, address viewer) external {
        lastCaller = msg.sender;
        lastHandle = handle;
        lastViewer = viewer;
    }
}
